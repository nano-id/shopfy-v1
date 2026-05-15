import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import {
  isReturnReasonCode,
  RETURN_REASON_CODES,
  type ReturnReasonCode,
} from "@support/core";
import { handleChatRequest, type ChatRequest } from "~/services/chat.server";
import {
  corsPreflightResponse,
  getStorefrontCorsHeaders,
  jsonWithCors,
} from "~/services/cors.server";
import { checkOrderLookupRateLimit } from "~/services/order-lookup-rate-limit.server";
import { checkRateLimit } from "~/services/rate-limit.server";

const returnReasonSchema = z.enum(
  RETURN_REASON_CODES as unknown as [ReturnReasonCode, ...ReturnReasonCode[]],
);

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
    orderNumber: z.string().min(1).max(64),
    email: z.string().email(),
  }),
  z.object({
    type: z.literal("return_reason"),
    shopDomain: z.string().min(3),
    sessionId: z.string().min(8),
    reasonCode: returnReasonSchema,
    reasonNote: z.string().max(2000).optional(),
    customerEmail: z.string().email().optional(),
  }),
]);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse(request);
  }
  return jsonWithCors(request, {
    ok: true,
    endpoint: "POST /api/storefront/chat",
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse(request);
  }

  if (request.method !== "POST") {
    return jsonWithCors(
      request,
      { error: "Method not allowed" },
      { status: 405 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = checkRateLimit(`chat:${ip}`, { max: 60, windowMs: 60_000 })
    .limited;
  if (limited) {
    return jsonWithCors(
      request,
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonWithCors(request, { error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return jsonWithCors(
      request,
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const chatRequest = toChatRequest(parsed.data);
  if (!chatRequest) {
    return jsonWithCors(request, { error: "Invalid payload" }, { status: 400 });
  }

  if (chatRequest.type === "order_lookup") {
    const lookupLimited = checkOrderLookupRateLimit({
      ip,
      shopDomain: chatRequest.shopDomain,
      sessionId: chatRequest.sessionId,
      email: chatRequest.email,
      orderNumber: chatRequest.orderNumber,
    });
    if (lookupLimited.limited) {
      return jsonWithCors(
        request,
        {
          error: "Too many requests",
          reply: lookupLimited.message,
        },
        { status: 429 },
      );
    }
  }

  const response = await handleChatRequest(chatRequest);
  return withCorsFromResponse(request, response);
};

function toChatRequest(
  data: z.infer<typeof messageSchema>,
): ChatRequest | null {
  if (data.type === "return_reason" && !isReturnReasonCode(data.reasonCode)) {
    return null;
  }
  return data as ChatRequest;
}

function withCorsFromResponse(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(getStorefrontCorsHeaders(request))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
