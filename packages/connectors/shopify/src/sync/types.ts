export type SyncResult = {
  resource: "PRODUCTS" | "ORDERS" | "FULFILLMENTS";
  synced: number;
  hasMore: boolean;
};
