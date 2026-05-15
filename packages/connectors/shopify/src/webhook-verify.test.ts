import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyShopifyWebhook } from "./webhook-verify.js";

describe("verifyShopifyWebhook", () => {
  const secret = "test-secret";
  const body = JSON.stringify({ id: 1 });

  it("accepts valid HMAC", () => {
    const hmac = createHmac("sha256", secret).update(body, "utf8").digest("base64");
    expect(verifyShopifyWebhook(body, hmac, secret)).toBe(true);
  });

  it("rejects invalid HMAC", () => {
    expect(verifyShopifyWebhook(body, "invalid", secret)).toBe(false);
  });

  it("rejects missing HMAC", () => {
    expect(verifyShopifyWebhook(body, null, secret)).toBe(false);
  });
});
