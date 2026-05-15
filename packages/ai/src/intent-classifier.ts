import type {
  ClassifyIntentInput,
  ClassifyIntentResult,
  SupportIntent,
} from "./types.js";

export interface IntentClassifier {
  classify(input: ClassifyIntentInput): Promise<ClassifyIntentResult>;
}

/** Rule-based placeholder — replace with LLM in Milestone 2+. */
export class PlaceholderIntentClassifier implements IntentClassifier {
  async classify(input: ClassifyIntentInput): Promise<ClassifyIntentResult> {
    const text = input.message.toLowerCase();

    if (matches(text, ["where is my order", "track", "tracking", "kargo"])) {
      return { intent: "ORDER_TRACKING", confidence: 0.9 };
    }
    if (matches(text, ["return", "refund", "iade"])) {
      return { intent: "RETURN_REQUEST", confidence: 0.85 };
    }
    if (matches(text, ["size", "fit", "beden"])) {
      return { intent: "SIZE_HELP", confidence: 0.8 };
    }
    if (matches(text, ["human", "agent", "person", "temsilci"])) {
      return { intent: "HUMAN_HANDOFF", confidence: 0.9 };
    }

    return { intent: "UNKNOWN", confidence: 0.5 };
  }
}

function matches(text: string, phrases: string[]): boolean {
  return phrases.some((p) => text.includes(p));
}
