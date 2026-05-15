import type { AiToolAction, SupportIntent } from "./types.js";

export interface AiToolRouter {
  resolveAction(intent: SupportIntent): AiToolAction;
}

/** Maps intents to deterministic backend actions — no LLM execution. */
export class DeterministicToolRouter implements AiToolRouter {
  resolveAction(intent: SupportIntent): AiToolAction {
    switch (intent) {
      case "ORDER_TRACKING":
        return { type: "NONE" }; // UI collects order# + email first
      case "RETURN_REQUEST":
        return { type: "NONE" };
      case "HUMAN_HANDOFF":
        return { type: "HANDOFF_HUMAN" };
      default:
        return { type: "NONE" };
    }
  }
}
