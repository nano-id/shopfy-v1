import type { ReturnReasonCode } from "./index.js";

export const RETURN_REASON_CODES = [
  "SIZE_TOO_SMALL",
  "SIZE_TOO_LARGE",
  "DAMAGED_ITEM",
  "WRONG_ITEM",
  "NOT_AS_EXPECTED",
  "LATE_DELIVERY",
  "CHANGED_MIND",
  "OTHER",
] as const satisfies readonly ReturnReasonCode[];

export function isReturnReasonCode(value: string): value is ReturnReasonCode {
  return (RETURN_REASON_CODES as readonly string[]).includes(value);
}
