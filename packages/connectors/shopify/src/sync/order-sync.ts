import type { PrismaClient } from "@prisma/client";
import { SyncResource, SyncStatus } from "@prisma/client";
import { executeShopifyGraphQL } from "../graphql/client.js";
import { ORDERS_SYNC } from "../graphql/queries.js";
import { mapShopifyOrderToNormalized } from "../mappers/order.mapper.js";
import { upsertOrderFromNormalized } from "./order-upsert.js";
import type { ShopifyAdminClient } from "../types.js";
import type { SyncResult } from "./types.js";

type OrdersSyncData = {
  orders?: {
    pageInfo?: { hasNextPage: boolean; endCursor?: string };
    edges?: Array<{ node: Parameters<typeof mapShopifyOrderToNormalized>[0] & {
      customer?: {
        id: string;
        email?: string | null;
        firstName?: string | null;
        lastName?: string | null;
      } | null;
    } }>;
  };
};

export class ShopifyOrderSync {
  constructor(private readonly prisma: PrismaClient) {}

  async syncPage(
    storeId: string,
    client: ShopifyAdminClient,
    cursor?: string,
  ): Promise<SyncResult & { endCursor?: string }> {
    const log = await this.prisma.syncLog.create({
      data: {
        storeId,
        resource: SyncResource.ORDERS,
        status: SyncStatus.RUNNING,
      },
    });

    try {
      const result = await executeShopifyGraphQL<OrdersSyncData>(
        client,
        ORDERS_SYNC,
        { cursor: cursor ?? null },
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      const orders = result.data.orders;
      let synced = 0;

      for (const edge of orders?.edges ?? []) {
        const normalized = mapShopifyOrderToNormalized(edge.node);
        const customer = edge.node.customer;
        await upsertOrderFromNormalized(this.prisma, storeId, normalized, customer);
        synced++;
      }

      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: SyncStatus.SUCCESS,
          finishedAt: new Date(),
          message: `Synced ${synced} orders`,
        },
      });

      return {
        resource: "ORDERS",
        synced,
        hasMore: orders?.pageInfo?.hasNextPage ?? false,
        endCursor: orders?.pageInfo?.endCursor,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: SyncStatus.FAILED,
          message,
          finishedAt: new Date(),
        },
      });
      throw error;
    }
  }
}
