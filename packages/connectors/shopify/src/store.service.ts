import type { PrismaClient } from "@prisma/client";
import { Platform, StoreStatus } from "@prisma/client";

export type UpsertStoreInput = {
  shopDomain: string;
  externalId: string;
  name?: string | null;
  email?: string | null;
  scope?: string | null;
};

export class ShopifyStoreService {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertOnInstall(input: UpsertStoreInput) {
    return this.prisma.store.upsert({
      where: { shopDomain: input.shopDomain },
      create: {
        platform: Platform.SHOPIFY,
        externalId: input.externalId,
        shopDomain: input.shopDomain,
        name: input.name,
        email: input.email,
        scope: input.scope,
        status: StoreStatus.ACTIVE,
        uninstalledAt: null,
      },
      update: {
        name: input.name,
        email: input.email,
        scope: input.scope,
        status: StoreStatus.ACTIVE,
        uninstalledAt: null,
      },
    });
  }

  async markUninstalled(shopDomain: string) {
    return this.prisma.store.updateMany({
      where: { shopDomain },
      data: {
        status: StoreStatus.UNINSTALLED,
        uninstalledAt: new Date(),
      },
    });
  }

  async findByShopDomain(shopDomain: string) {
    return this.prisma.store.findUnique({ where: { shopDomain } });
  }
}
