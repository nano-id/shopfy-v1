import type { ReturnRepository } from "../repositories/interfaces.js";
import type { ReturnReasonCode, ReturnRequestInput } from "../types/index.js";
import { RETURN_REASON_OPTIONS } from "../types/index.js";

const VALID_CODES = new Set(
  RETURN_REASON_OPTIONS.map(([code]) => code),
);

export class ReturnCollectionService {
  constructor(private readonly returns: ReturnRepository) {}

  getReasonOptions(): { code: ReturnReasonCode; label: string }[] {
    return RETURN_REASON_OPTIONS.map(([code, label]) => ({ code, label }));
  }

  async capture(
    storeId: string,
    input: ReturnRequestInput,
  ): Promise<{ id: string }> {
    if (!VALID_CODES.has(input.reasonCode)) {
      throw new Error(`Invalid return reason: ${input.reasonCode}`);
    }

    return this.returns.create(storeId, input);
  }
}
