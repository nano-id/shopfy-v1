import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import type { ReturnReasonCode } from "@support/core";
import { handleChatRequest } from "~/services/chat.server";
import { checkRateLimit } from "~/services/rate-limit.server";

const messageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    shopDomain: z.string().min(3),
    sessionId: z.string().min(8),
    content: z.string().min(1).max(4000),
  }),
  z.object({
    type: z.literal("order_lookup"),
    shopDomain: z.string().min(3),
    sessionId: z.string().min(8),
    orderNumber: z.string().min(1),
    email: z.string().email(),
  }),
  z.object({
    type: z.literal("return_reason"),
    shopDomain: z.string().min(3),
    sessionId: z.string().min(8),
    reasonCode: z.string(),
    reasonNote: z.string().optional(),
    customerEmail: z.string().email().optional(),
  }),
]);

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = checkRateLimit(`chat:${ip}`, { max: 60, windowMs: 60_000 });
  if (limited) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (data.type === "return_reason") {
    return handleChatRequest({
      ...data,
      reasonCode: data.reasonCode as ReturnReasonCode,
    });
  }

  return handleChatRequest(data);
};

// CORS for storefront widget
export const loader = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return corsPreflight();
  }
  return Response.json({ ok: true, endpoint: "POST /api/storefront/chat" });
};

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
