import type { NormalizedOrder } from "../types/index.js";

/** Platform-agnostic order lookup — implemented by Shopify connector. */
export interface OrderConnector {
  findOrderByNumberAndEmail(
    storeId: string,
    orderNumber: string,
    email: string,
  ): Promise<NormalizedOrder | null>;
}
