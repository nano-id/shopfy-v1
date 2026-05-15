import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyShopifyWebhook(
  rawBody: string | Buffer,
  hmacHeader: string | null,
  apiSecret: string,
): boolean {
  if (!hmacHeader) return false;

  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const digest = createHmac("sha256", apiSecret).update(body, "utf8").digest("base64");

  try {
    const a = Buffer.from(digest);
    const b = Buffer.from(hmacHeader);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function parseWebhookHeaders(
  headers: Headers,
): import("./types.js").ShopifyWebhookHeaders {
  return {
    hmac: headers.get("X-Shopify-Hmac-Sha256"),
    topic: headers.get("X-Shopify-Topic"),
    shopDomain: headers.get("X-Shopify-Shop-Domain"),
    webhookId: headers.get("X-Shopify-Webhook-Id"),
  };
}
