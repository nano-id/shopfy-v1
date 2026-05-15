import {
  ShopifyOrderSync,
  ShopifyProductSync,
} from "@support/shopify-connector";
import prisma from "~/db.server";
import { createAdminClientForShop } from "./shopify-admin.server";

const MAX_PAGES = 5;

export type ResourceSyncOutcome =
  | { ok: true; synced: number; message: string }
  | { ok: false; error: string };

export type StoreSyncSummary = {
  ok: boolean;
  products: ResourceSyncOutcome;
  orders: ResourceSyncOutcome;
};

function syncErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Sync failed";
}

export async function runInitialStoreSync(
  shopDomain: string,
): Promise<StoreSyncSummary> {
  const store = await prisma.store.findUnique({ where: { shopDomain } });
  if (!store || store.status !== "ACTIVE") {
    const inactive = "Store is not active";
    return {
      ok: false,
      products: { ok: false, error: inactive },
      orders: { ok: false, error: inactive },
    };
  }

  const client = await createAdminClientForShop(shopDomain);
  if (!client) {
    const noSession = "No Shopify admin session — reinstall the app on this store";
    console.error("[sync] no admin session for", shopDomain);
    return {
      ok: false,
      products: { ok: false, error: noSession },
      orders: { ok: false, error: noSession },
    };
  }

  const productSync = new ShopifyProductSync(prisma);
  const orderSync = new ShopifyOrderSync(prisma);

  let products: ResourceSyncOutcome;
  try {
    const result = await productSync.syncAll(store.id, client, MAX_PAGES);
    products = {
      ok: true,
      synced: result.synced,
      message: `Synced ${result.synced} products`,
    };
  } catch (error) {
    products = { ok: false, error: syncErrorMessage(error) };
  }

  let ordersSynced = 0;
  let ordersError: string | undefined;
  try {
    let cursor: string | undefined;
    for (let i = 0; i < MAX_PAGES; i++) {
      const page = await orderSync.syncPage(store.id, client, cursor);
      ordersSynced += page.synced;
      if (!page.hasMore) break;
      cursor = page.endCursor;
    }
  } catch (error) {
    ordersError = syncErrorMessage(error);
  }

  const orders: ResourceSyncOutcome = ordersError
    ? { ok: false, error: ordersError }
    : {
        ok: true,
        synced: ordersSynced,
        message: `Synced ${ordersSynced} orders`,
      };

  return {
    ok: products.ok && orders.ok,
    products,
    orders,
  };
}

export async function runProductSyncForStore(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return;
  const client = await createAdminClientForShop(store.shopDomain);
  if (!client) return;
  await new ShopifyProductSync(prisma).syncAll(store.id, client, MAX_PAGES);
}

export async function runOrderSyncForStore(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return;
  const client = await createAdminClientForShop(store.shopDomain);
  if (!client) return;
  const orderSync = new ShopifyOrderSync(prisma);
  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await orderSync.syncPage(store.id, client, cursor);
    if (!page.hasMore) break;
    cursor = page.endCursor;
  }
}
