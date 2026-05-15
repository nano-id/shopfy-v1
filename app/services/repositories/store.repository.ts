import type { PrismaClient } from "@prisma/client";
import type { StoreRepository, StoreRecord } from "@support/core";

export class PrismaStoreRepository implements StoreRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByShopDomain(shopDomain: string): Promise<StoreRecord | null> {
    const store = await this.prisma.store.findUnique({
      where: { shopDomain },
    });
    if (!store) return null;
    return this.toRecord(store);
  }

  async findById(storeId: string): Promise<StoreRecord | null> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) return null;
    return this.toRecord(store);
  }

  async markUninstalled(storeId: string): Promise<void> {
    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        status: "UNINSTALLED",
        uninstalledAt: new Date(),
      },
    });
  }

  private toRecord(store: {
    id: string;
    shopDomain: string;
    platform: string;
    status: string;
  }): StoreRecord {
    return {
      id: store.id,
      shopDomain: store.shopDomain,
      platform: store.platform,
      status: store.status,
    };
  }
}
