import type { PrismaClient } from "@prisma/client";
import { SyncResource, SyncStatus } from "@prisma/client";
import { executeShopifyGraphQL } from "../graphql/client.js";
import { PRODUCTS_SYNC } from "../graphql/queries.js";
import { mapShopifyProductToNormalized } from "../mappers/product.mapper.js";
import type { ShopifyAdminClient } from "../types.js";
import type { SyncResult } from "./types.js";

type ProductsSyncData = {
  products?: {
    pageInfo?: { hasNextPage: boolean; endCursor?: string };
    edges?: Array<{ node: Parameters<typeof mapShopifyProductToNormalized>[0] }>;
  };
};

export class ShopifyProductSync {
  constructor(private readonly prisma: PrismaClient) {}

  async syncAll(
    storeId: string,
    client: ShopifyAdminClient,
    maxPages = 10,
  ): Promise<SyncResult> {
    let cursor: string | undefined;
    let totalSynced = 0;
    let pages = 0;

    while (pages < maxPages) {
      const page = await this.syncPage(storeId, client, cursor);
      totalSynced += page.synced;
      pages++;
      if (!page.hasMore) break;
      cursor = page.endCursor;
    }

    return { resource: "PRODUCTS", synced: totalSynced, hasMore: false };
  }

  async syncPage(
    storeId: string,
    client: ShopifyAdminClient,
    cursor?: string,
  ): Promise<SyncResult & { endCursor?: string }> {
    const log = await this.prisma.syncLog.create({
      data: {
        storeId,
        resource: SyncResource.PRODUCTS,
        status: SyncStatus.RUNNING,
      },
    });

    try {
      const result = await executeShopifyGraphQL<ProductsSyncData>(
        client,
        PRODUCTS_SYNC,
        { cursor: cursor ?? null },
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      const products = result.data.products;
      let synced = 0;

      for (const edge of products?.edges ?? []) {
        const mapped = mapShopifyProductToNormalized(edge.node);
        const product = await this.prisma.product.upsert({
          where: {
            storeId_externalId: {
              storeId,
              externalId: mapped.externalId,
            },
          },
          create: {
            storeId,
            externalId: mapped.externalId,
            title: mapped.title,
            handle: mapped.handle,
            description: mapped.description,
            vendor: mapped.vendor,
            productType: mapped.productType,
            status: mapped.status,
            syncedAt: new Date(),
          },
          update: {
            title: mapped.title,
            handle: mapped.handle,
            description: mapped.description,
            vendor: mapped.vendor,
            productType: mapped.productType,
            status: mapped.status,
            syncedAt: new Date(),
          },
        });

        for (const v of mapped.variants) {
          await this.prisma.variant.upsert({
            where: {
              storeId_externalId: { storeId, externalId: v.externalId },
            },
            create: {
              storeId,
              productId: product.id,
              externalId: v.externalId,
              title: v.title,
              sku: v.sku,
              price: v.price,
              sizeLabel: v.sizeLabel,
            },
            update: {
              title: v.title,
              sku: v.sku,
              price: v.price,
              sizeLabel: v.sizeLabel,
            },
          });
        }
        synced++;
      }

      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: SyncStatus.SUCCESS,
          finishedAt: new Date(),
          message: `Synced ${synced} products`,
        },
      });

      return {
        resource: "PRODUCTS",
        synced,
        hasMore: products?.pageInfo?.hasNextPage ?? false,
        endCursor: products?.pageInfo?.endCursor,
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
