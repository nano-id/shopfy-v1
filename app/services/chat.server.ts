import type { MessageRole } from "@prisma/client";
import { AiService } from "@support/ai";
import type { ReturnReasonCode } from "@support/core";
import prisma from "~/db.server";
import { getContainer } from "./container.server";

const ai = new AiService();

export type ChatRequest =
  | { type: "message"; shopDomain: string; sessionId: string; content: string }
  | {
      type: "order_lookup";
      shopDomain: string;
      sessionId: string;
      orderNumber: string;
      email: string;
    }
  | {
      type: "return_reason";
      shopDomain: string;
      sessionId: string;
      reasonCode: ReturnReasonCode;
      reasonNote?: string;
      customerEmail?: string;
    };

export async function handleChatRequest(req: ChatRequest) {
  const store = await prisma.store.findFirst({
    where: { shopDomain: req.shopDomain, status: "ACTIVE", widgetEnabled: true },
  });
  if (!store) {
    return Response.json({ error: "Store not available" }, { status: 404 });
  }

  const conversation = await getOrCreateConversation(
    store.id,
    req.sessionId,
  );

  if (req.type === "message") {
    await saveMessage(conversation.id, "CUSTOMER", req.content);
    const classified = await ai.classifyIntent({ message: req.content });

    if (classified.intent === "ORDER_TRACKING") {
      const reply =
        "I can help track your order. Please send your order number and the email used at checkout.";
      await saveMessage(conversation.id, "BOT", reply);
      return Response.json({ conversationId: conversation.id, reply });
    }

    if (classified.intent === "RETURN_REQUEST") {
      const reply =
        "I can help with a return. Please select a reason: size too small, size too large, damaged, wrong item, not as expected, late delivery, changed mind, or other.";
      await saveMessage(conversation.id, "BOT", reply);
      return Response.json({
        conversationId: conversation.id,
        reply,
        actions: { type: "return_reasons" },
      });
    }

    if (classified.intent === "HUMAN_HANDOFF") {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: "NEEDS_HUMAN" },
      });
      await prisma.supportTicket.create({
        data: {
          storeId: store.id,
          conversationId: conversation.id,
          subject: "Customer requested human support",
        },
      });
      const reply =
        "I've notified the store team. Someone will follow up via email soon.";
      await saveMessage(conversation.id, "BOT", reply);
      return Response.json({ conversationId: conversation.id, reply });
    }

    const generated = await ai.generateSafeResponse({
      intent: classified.intent,
    });
    await saveMessage(conversation.id, "BOT", generated.content);
    return Response.json({
      conversationId: conversation.id,
      reply: generated.content,
    });
  }

  if (req.type === "order_lookup") {
    const { orderTracking } = getContainer();
    const result = await orderTracking.lookup(store.id, {
      orderNumber: req.orderNumber,
      email: req.email,
    });
    const reply = result.success
      ? result.message
      : result.message;
    await saveMessage(conversation.id, "CUSTOMER", `Order lookup ${req.orderNumber}`);
    await saveMessage(conversation.id, "BOT", reply);
    if (result.success) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { aiHandled: true, status: "RESOLVED" },
      });
    }
    return Response.json({ conversationId: conversation.id, reply, result });
  }

  if (req.type === "return_reason") {
    const { returnCollection } = getContainer();
    await returnCollection.capture(store.id, {
      reasonCode: req.reasonCode,
      reasonNote: req.reasonNote,
      customerEmail: req.customerEmail,
      conversationId: conversation.id,
    });
    const reply =
      "Thank you. Your return reason has been recorded. The store team will follow up with next steps.";
    await saveMessage(conversation.id, "BOT", reply);
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { aiHandled: true, status: "RESOLVED" },
    });
    return Response.json({ conversationId: conversation.id, reply });
  }

  return Response.json({ error: "Invalid request" }, { status: 400 });
}

async function getOrCreateConversation(storeId: string, sessionId: string) {
  const existing = await prisma.conversation.findFirst({
    where: { storeId, sessionId, status: { in: ["OPEN", "NEEDS_HUMAN"] } },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: { storeId, sessionId, status: "OPEN" },
  });
}

async function saveMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
) {
  return prisma.message.create({
    data: { conversationId, role, content },
  });
}
