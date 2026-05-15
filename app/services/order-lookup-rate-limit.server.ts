import { buildRateLimitKey, checkRateLimit } from "./rate-limit.server";

const ORDER_LOOKUP_WINDOW_MS = 10 * 60 * 1000;

const ORDER_LOOKUP_LIMITS = {
  ip: { max: 10, windowMs: ORDER_LOOKUP_WINDOW_MS },
  session: { max: 5, windowMs: ORDER_LOOKUP_WINDOW_MS },
  email: { max: 5, windowMs: ORDER_LOOKUP_WINDOW_MS },
  orderNumber: { max: 5, windowMs: ORDER_LOOKUP_WINDOW_MS },
} as const;

export const ORDER_LOOKUP_RATE_LIMIT_MESSAGE =
  "We've received too many lookup attempts. Please wait a few minutes and try again.";

export function normalizeLookupEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeLookupOrderNumber(orderNumber: string): string {
  return orderNumber.trim().replace(/^#/, "");
}

export type OrderLookupRateLimitInput = {
  ip: string;
  shopDomain: string;
  sessionId: string;
  email: string;
  orderNumber: string;
};

export function checkOrderLookupRateLimit(
  input: OrderLookupRateLimitInput,
): { limited: boolean; message?: string } {
  const shop = input.shopDomain.trim().toLowerCase();
  const email = normalizeLookupEmail(input.email);
  const orderNumber = normalizeLookupOrderNumber(input.orderNumber);

  const checks: Array<{ key: string; options: (typeof ORDER_LOOKUP_LIMITS)[keyof typeof ORDER_LOOKUP_LIMITS] }> = [
    {
      key: buildRateLimitKey("order_lookup:ip", input.ip),
      options: ORDER_LOOKUP_LIMITS.ip,
    },
    {
      key: buildRateLimitKey("order_lookup:session", shop, input.sessionId),
      options: ORDER_LOOKUP_LIMITS.session,
    },
    {
      key: buildRateLimitKey("order_lookup:email", shop, email),
      options: ORDER_LOOKUP_LIMITS.email,
    },
    {
      key: buildRateLimitKey("order_lookup:order", shop, orderNumber),
      options: ORDER_LOOKUP_LIMITS.orderNumber,
    },
  ];

  for (const { key, options } of checks) {
    if (checkRateLimit(key, options).limited) {
      return { limited: true, message: ORDER_LOOKUP_RATE_LIMIT_MESSAGE };
    }
  }

  return { limited: false };
}
