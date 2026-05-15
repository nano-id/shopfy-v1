import { OrderVerificationError } from "../errors/index.js";
import type { OrderLookupInput } from "../types/index.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class OrderVerificationService {
  normalizeOrderNumber(raw: string): string {
    return raw.trim().replace(/^#/, "");
  }

  normalizeEmail(raw: string): string {
    return raw.trim().toLowerCase();
  }

  validateLookupInput(input: OrderLookupInput): void {
    const orderNumber = this.normalizeOrderNumber(input.orderNumber);
    const email = this.normalizeEmail(input.email);

    if (!orderNumber || orderNumber.length < 1) {
      throw new OrderVerificationError(
        "Order number is required",
        "INVALID_INPUT",
      );
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      throw new OrderVerificationError(
        "A valid email is required",
        "INVALID_INPUT",
      );
    }
  }

  emailsMatch(orderEmail: string | null | undefined, provided: string): boolean {
    if (!orderEmail) return false;
    return (
      this.normalizeEmail(orderEmail) === this.normalizeEmail(provided)
    );
  }
}
