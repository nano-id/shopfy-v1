import type { NormalizedOrder } from "@support/core";
import type { OrderConnector } from "@support/core";
import { ORDER_BY_NAME_AND_EMAIL } from "./graphql/queries.js";
import { mapShopifyOrderToNormalized } from "./mappers/order.mapper.js";
import type { ShopifyAdminClient } from "./types.js";

export type ShopifyOrderConnectorDeps = {
  getAdminClient: (storeId: string) => Promise<ShopifyAdminClient | null>;
};

/**
 * Shopify implementation of platform-agnostic order lookup.
 * Used by OrderTrackingService in @support/core.
 */
export class ShopifyOrderConnector implements OrderConnector {
  constructor(private readonly deps: ShopifyOrderConnectorDeps) {}

  async findOrderByNumberAndEmail(
    storeId: string,
    orderNumber: string,
    email: string,
  ): Promise<NormalizedOrder | null> {
    const client = await this.deps.getAdminClient(storeId);
    if (!client) return null;

    const query = `name:#${orderNumber} email:${email}`;
    const response = await client.graphql(ORDER_BY_NAME_AND_EMAIL, {
      variables: { query },
    });
    const json = (await response.json()) as {
      data?: {
        orders?: {
          edges?: Array<{ node: Parameters<typeof mapShopifyOrderToNormalized>[0] }>;
        };
      };
    };

    const node = json.data?.orders?.edges?.[0]?.node;
    if (!node) return null;

    return mapShopifyOrderToNormalized(node);
  }
}
