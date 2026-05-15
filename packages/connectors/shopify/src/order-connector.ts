import type { NormalizedOrder } from "@support/core";
import type { OrderConnector } from "@support/core";
import { executeShopifyGraphQL } from "./graphql/client.js";
import { ORDER_BY_NAME_AND_EMAIL } from "./graphql/queries.js";
import { mapShopifyOrderToNormalized } from "./mappers/order.mapper.js";
import type { ShopifyAdminClient } from "./types.js";

export type ShopifyOrderConnectorDeps = {
  getAdminClient: (storeId: string) => Promise<ShopifyAdminClient | null>;
};

type OrderQueryData = {
  orders?: {
    edges?: Array<{ node: Parameters<typeof mapShopifyOrderToNormalized>[0] }>;
  };
};

/**
 * Shopify implementation of platform-agnostic order lookup.
 */
export class ShopifyOrderConnector implements OrderConnector {
  constructor(private readonly deps: ShopifyOrderConnectorDeps) {}

  async findOrderByNumberAndEmail(
    storeId: string,
    orderNumber: string,
    email: string,
  ): Promise<NormalizedOrder | null> {
    const client = await this.deps.getAdminClient(storeId);
    if (!client) {
      console.error("[ShopifyOrderConnector] no admin client for store", storeId);
      return null;
    }

    const query = `name:#${orderNumber} email:${email}`;
    const result = await executeShopifyGraphQL<OrderQueryData>(
      client,
      ORDER_BY_NAME_AND_EMAIL,
      { query },
    );

    if (!result.ok) {
      console.error("[ShopifyOrderConnector] lookup failed", result.error);
      return null;
    }

    const node = result.data.orders?.edges?.[0]?.node;
    if (!node) return null;

    return mapShopifyOrderToNormalized(node);
  }
}
