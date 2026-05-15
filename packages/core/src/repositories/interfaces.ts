import type {
  ConversationStatus,
  DashboardMetrics,
  NormalizedOrder,
  ReturnReasonCode,
  ReturnRequestInput,
} from "../types/index.js";

export type StoreRecord = {
  id: string;
  shopDomain: string;
  platform: string;
  status: string;
};

export type ConversationRecord = {
  id: string;
  storeId: string;
  status: ConversationStatus;
  aiHandled: boolean;
  createdAt: Date;
  lastMessagePreview?: string;
};

export interface StoreRepository {
  findByShopDomain(shopDomain: string): Promise<StoreRecord | null>;
  findById(storeId: string): Promise<StoreRecord | null>;
  markUninstalled(storeId: string): Promise<void>;
}

export interface ConversationRepository {
  listByStore(
    storeId: string,
    options?: { status?: ConversationStatus; limit?: number },
  ): Promise<ConversationRecord[]>;
  countByStatus(storeId: string): Promise<Record<ConversationStatus, number>>;
}

export interface OrderRepository {
  findByOrderNumberAndEmail(
    storeId: string,
    orderNumber: string,
    email: string,
  ): Promise<NormalizedOrder | null>;
}

export interface ReturnRepository {
  create(storeId: string, input: ReturnRequestInput): Promise<{ id: string }>;
  countByReason(
    storeId: string,
  ): Promise<{ reasonCode: ReturnReasonCode; count: number }[]>;
}

export interface AnalyticsRepository {
  getDashboardMetrics(storeId: string): Promise<DashboardMetrics>;
}
