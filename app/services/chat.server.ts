import type { MessageRole } from "@prisma/client";
import { AiService } from "@support/ai";
import {
  RETURN_REASON_LABELS,
  RETURN_REASON_OPTIONS,
  type ReturnReasonCode,
} from "@support/core";
import { OrderVerificationError } from "@support/core";
import prisma from "~/db.server";
import { getContainer } from "./container.server";

const ai = new AiService();

export type ChatWidgetAction =
  | { type: "order_lookup_form" }
  | {
      type: "return_reasons";
      options: { code: ReturnReasonCode; label: string }[];
    };

export type ChatSuccessBody = {
  conversationId: string;
  reply: string;
  actions?: ChatWidgetAction;
};

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

const SAFE_GENERIC =
  "Sorry, something went wrong. Please try again or contact the store support team.";

export async function handleChatRequest(
  req: ChatRequest,
): Promise<Response> {
  try {
    const store = await prisma.store.findFirst({
      where: {
        shopDomain: req.shopDomain,
        status: "ACTIVE",
        widgetEnabled: true,
      },
    });
    if (!store) {
      return jsonError("Store not available", 404);
    }

    const conversation = await getOrCreateConversation(
      store.id,
      req.sessionId,
    );

    if (req.type === "message") {
      return await handleMessage(store.id, conversation.id, req.content);
    }

    if (req.type === "order_lookup") {
      return await handleOrderLookup(store.id, conversation.id, req);
    }

    if (req.type === "return_reason") {
      return await handleReturnReason(store.id, conversation.id, req);
    }

    return jsonError("Invalid request", 400);
  } catch (error) {
    if (error instanceof OrderVerificationError) {
      return jsonOk({
        conversationId: "",
        reply:
          error.code === "EMAIL_MISMATCH"
            ? "The email does not match this order. Please check and try again."
            : "Please provide a valid order number and email.",
      });
    }

    console.error("[handleChatRequest] unexpected error", error);
    return jsonOk({ conversationId: "", reply: SAFE_GENERIC });
  }
}

async function handleMessage(
  storeId: string,
  conversationId: string,
  content: string,
) {
  await saveMessage(conversationId, "CUSTOMER", content);

  let classified;
  try {
    classified = await ai.classifyIntent({ message: content });
  } catch (error) {
    console.error("[chat] classify failed", error);
    const reply =
      "Thanks for your message. I can help with order tracking or returns.";
    await saveMessage(conversationId, "BOT", reply);
    return jsonOk({ conversationId, reply });
  }

  if (classified.intent === "ORDER_TRACKING") {
    const reply =
      "I can help track your order. Please enter your order number and email below.";
    await saveMessage(conversationId, "BOT", reply);
    return jsonOk({
      conversationId,
      reply,
      actions: { type: "order_lookup_form" },
    });
  }

  if (classified.intent === "RETURN_REQUEST") {
    const reply = "Please select a return reason:";
    await saveMessage(conversationId, "BOT", reply);
    return jsonOk({
      conversationId,
      reply,
      actions: {
        type: "return_reasons",
        options: RETURN_REASON_OPTIONS.map(([code, label]) => ({
          code,
          label,
        })),
      },
    });
  }

  if (classified.intent === "HUMAN_HANDOFF") {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: "NEEDS_HUMAN" },
    });
    await prisma.supportTicket.create({
      data: {
        storeId,
        conversationId,
        subject: "Customer requested human support",
      },
    });
    const reply =
      "I've notified the store team. Someone will follow up via email soon.";
    await saveMessage(conversationId, "BOT", reply);
    return jsonOk({ conversationId, reply });
  }

  const generated = await ai.generateSafeResponse({
    intent: classified.intent,
  });
  await saveMessage(conversationId, "BOT", generated.content);
  return jsonOk({ conversationId, reply: generated.content });
}

async function handleOrderLookup(
  storeId: string,
  conversationId: string,
  req: Extract<ChatRequest, { type: "order_lookup" }>,
) {
  await saveMessage(
    conversationId,
    "CUSTOMER",
    `Order lookup #${req.orderNumber}`,
  );

  try {
    const { orderTracking } = getContainer();
    const result = await orderTracking.lookup(storeId, {
      orderNumber: req.orderNumber,
      email: req.email,
    });

    const reply = result.message;
    await saveMessage(conversationId, "BOT", reply);

    if (result.success) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { aiHandled: true, status: "RESOLVED", intent: "ORDER_TRACKING" },
      });
    }

    return jsonOk({ conversationId, reply });
  } catch (error) {
    console.error("[chat] order lookup failed", error);
    const reply =
      "We could not check your order right now. Please try again shortly.";
    await saveMessage(conversationId, "BOT", reply);
    return jsonOk({ conversationId, reply });
  }
}

async function handleReturnReason(
  storeId: string,
  conversationId: string,
  req: Extract<ChatRequest, { type: "return_reason" }>,
) {
  const label = RETURN_REASON_LABELS[req.reasonCode];
  await saveMessage(conversationId, "CUSTOMER", `Return reason: ${label}`);

  try {
    const { returnCollection } = getContainer();
    await returnCollection.capture(storeId, {
      reasonCode: req.reasonCode,
      reasonNote: req.reasonNote,
      customerEmail: req.customerEmail,
      conversationId,
    });

    const reply =
      "Thank you. Your return reason has been recorded. The store team will follow up with next steps.";
    await saveMessage(conversationId, "BOT", reply);
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { aiHandled: true, status: "RESOLVED", intent: "RETURN_REQUEST" },
    });
    return jsonOk({ conversationId, reply });
  } catch (error) {
    console.error("[chat] return capture failed", error);
    const reply =
      "We could not save your return request. Please try again or email support.";
    await saveMessage(conversationId, "BOT", reply);
    return jsonOk({ conversationId, reply });
  }
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

function jsonOk(body: ChatSuccessBody) {
  return Response.json(body);
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
