import type { PrismaClient } from "@prisma/client";
import { SyncResource, SyncStatus } from "@prisma/client";
import { PRODUCTS_SYNC } from "../graphql/queries.js";
import { mapShopifyProductToNormalized } from "../mappers/product.mapper.js";
import type { ShopifyAdminClient } from "../types.js";
import type { SyncResult } from "./types.js";

export class ShopifyProductSync {
  constructor(private readonly prisma: PrismaClient) {}

  async syncPage(
    storeId: string,
    client: ShopifyAdminClient,
    cursor?: string,
  ): Promise<SyncResult> {
    const log = await this.prisma.syncLog.create({
      data: {
        storeId,
        resource: SyncResource.PRODUCTS,
        status: SyncStatus.RUNNING,
      },
    });

    try {
      const response = await client.graphql(PRODUCTS_SYNC, {
        variables: { cursor: cursor ?? null },
      });
      const json = (await response.json()) as {
        data?: {
          products?: {
            pageInfo?: { hasNextPage: boolean; endCursor?: string };
            edges?: Array<{ node: Parameters<typeof mapShopifyProductToNormalized>[0] }>;
          };
        };
      };

      const products = json.data?.products;
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
        data: { status: SyncStatus.SUCCESS, finishedAt: new Date() },
      });

      return {
        resource: "PRODUCTS",
        synced,
        hasMore: products?.pageInfo?.hasNextPage ?? false,
      };
    } catch (error) {
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: SyncStatus.FAILED,
          message: error instanceof Error ? error.message : "Sync failed",
          finishedAt: new Date(),
        },
      });
      throw error;
    }
  }
}
