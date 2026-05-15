import type { OrderConnectorLookupResult } from "./order-lookup-result.js";

/** Platform-agnostic order lookup — implemented by Shopify connector. */
export interface OrderConnector {
  findOrderByNumberAndEmail(
    storeId: string,
    orderNumber: string,
    email: string,
  ): Promise<OrderConnectorLookupResult>;
}
