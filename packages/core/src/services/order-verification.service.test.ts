import { describe, expect, it } from "vitest";
import { OrderVerificationService } from "./order-verification.service.js";

describe("OrderVerificationService", () => {
  const service = new OrderVerificationService();

  it("normalizes order number", () => {
    expect(service.normalizeOrderNumber("  #1001 ")).toBe("1001");
  });

  it("normalizes email", () => {
    expect(service.normalizeEmail("  Test@Mail.COM ")).toBe("test@mail.com");
  });

  it("rejects invalid email", () => {
    expect(() =>
      service.validateLookupInput({ orderNumber: "1001", email: "bad" }),
    ).toThrow();
  });

  it("matches emails case-insensitively", () => {
    expect(service.emailsMatch("Buyer@Shop.com", "buyer@shop.com")).toBe(true);
    expect(service.emailsMatch(null, "buyer@shop.com")).toBe(false);
  });
});
