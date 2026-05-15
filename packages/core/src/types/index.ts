export type Platform = "SHOPIFY" | "WOOCOMMERCE" | "WIX" | "BIGCOMMERCE";

export type ReturnReasonCode =
  | "SIZE_TOO_SMALL"
  | "SIZE_TOO_LARGE"
  | "DAMAGED_ITEM"
  | "WRONG_ITEM"
  | "NOT_AS_EXPECTED"
  | "LATE_DELIVERY"
  | "CHANGED_MIND"
  | "OTHER";

export const RETURN_REASON_LABELS: Record<ReturnReasonCode, string> = {
  SIZE_TOO_SMALL: "Size too small",
  SIZE_TOO_LARGE: "Size too large",
  DAMAGED_ITEM: "Damaged item",
  WRONG_ITEM: "Wrong item",
  NOT_AS_EXPECTED: "Not as expected",
  LATE_DELIVERY: "Late delivery",
  CHANGED_MIND: "Changed mind",
  OTHER: "Other",
};

export const RETURN_REASON_OPTIONS = Object.entries(
  RETURN_REASON_LABELS,
) as [ReturnReasonCode, string][];

export type ConversationStatus =
  | "OPEN"
  | "RESOLVED"
  | "NEEDS_HUMAN"
  | "CLOSED";

export type NormalizedOrder = {
  externalId: string;
  name: string | null;
  email: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  fulfillments: NormalizedFulfillment[];
};

export type NormalizedFulfillment = {
  externalId: string;
  status: string | null;
  trackingCompany: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
};

export type OrderLookupInput = {
  orderNumber: string;
  email: string;
};

export type OrderLookupResult =
  | { success: true; order: NormalizedOrder; message: string }
  | { success: false; code: string; message: string };

export type ReturnRequestInput = {
  reasonCode: ReturnReasonCode;
  reasonNote?: string;
  orderExternalId?: string;
  variantExternalId?: string;
  productTitle?: string;
  variantTitle?: string;
  customerEmail?: string;
  conversationId?: string;
};

export type DashboardMetrics = {
  aiResolvedConversations: number;
  orderTrackingRequests: number;
  returnRequestsCaptured: number;
  unresolvedConversations: number;
  topReturnReasons: { reasonCode: ReturnReasonCode; count: number }[];
};
