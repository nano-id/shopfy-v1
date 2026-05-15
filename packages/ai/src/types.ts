export type SupportIntent =
  | "ORDER_TRACKING"
  | "RETURN_REQUEST"
  | "SIZE_HELP"
  | "POLICY_QUESTION"
  | "PRODUCT_INFO"
  | "HUMAN_HANDOFF"
  | "UNKNOWN";

export type ClassifyIntentInput = {
  message: string;
  conversationHistory?: { role: string; content: string }[];
};

export type ClassifyIntentResult = {
  intent: SupportIntent;
  confidence: number;
};

export type GenerateSafeResponseInput = {
  intent: SupportIntent;
  deterministicMessage?: string;
  storePolicies?: string[];
};

export type GenerateSafeResponseResult = {
  content: string;
  usedAi: boolean;
};

export type AiToolAction =
  | { type: "LOOKUP_ORDER"; orderNumber: string; email: string }
  | { type: "CAPTURE_RETURN"; reasonCode: string }
  | { type: "HANDOFF_HUMAN" }
  | { type: "NONE" };
