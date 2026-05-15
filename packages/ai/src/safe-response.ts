import type {
  GenerateSafeResponseInput,
  GenerateSafeResponseResult,
} from "./types.js";

export interface SafeResponseGenerator {
  generate(input: GenerateSafeResponseInput): Promise<GenerateSafeResponseResult>;
}

/**
 * Milestone 1: passthrough deterministic messages only.
 * Sensitive flows must never use LLM output.
 */
export class PlaceholderSafeResponseGenerator implements SafeResponseGenerator {
  async generate(
    input: GenerateSafeResponseInput,
  ): Promise<GenerateSafeResponseResult> {
    if (input.deterministicMessage) {
      return { content: input.deterministicMessage, usedAi: false };
    }

    return {
      content:
        "Thanks for your message. I can help with order tracking, returns, or connect you to support.",
      usedAi: false,
    };
  }
}
