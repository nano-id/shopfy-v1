import type { SupportIntent } from "./types.js";

export const PROMPT_TEMPLATES: Record<SupportIntent, string> = {
  ORDER_TRACKING:
    "Ask for order number and email. Never invent tracking details.",
  RETURN_REQUEST:
    "Ask the customer to select a return reason from the provided list.",
  SIZE_HELP:
    "Use product size chart and store sizing policy only. Suggest conservative sizing when uncertain.",
  POLICY_QUESTION:
    "Answer only from store policy text. If unknown, say you cannot confirm.",
  PRODUCT_INFO:
    "Use product catalog data only. Do not invent specifications.",
  HUMAN_HANDOFF: "Acknowledge and escalate to human support.",
  UNKNOWN:
    "Ask a clarifying question or offer order tracking, returns, or human help.",
};

export function getPromptTemplate(intent: SupportIntent): string {
  return PROMPT_TEMPLATES[intent];
}
