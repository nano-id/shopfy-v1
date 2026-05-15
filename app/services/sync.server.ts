import {
  ShopifyOrderSync,
  ShopifyProductSync,
} from "@support/shopify-connector";
import prisma from "~/db.server";
import { createAdminClientForShop } from "./shopify-admin.server";
import { getSyncMaxPages } from "./sync-config.server";

export { getSyncMaxPages } from "./sync-config.server";

export type ResourceSyncOutcome =
  | { ok: true; synced: number; message: string }
  | { ok: false; error: string };

export type StoreSyncSummary = {
  ok: boolean;
  products: ResourceSyncOutcome;
  orders: ResourceSyncOutcome;
};

function syncErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Sync failed";
  return raw
    .replace(/postgresql:\/\/[^\s]+/gi, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "[redacted]")
    .slice(0, 300);
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

  const maxPages = getSyncMaxPages();
  const productSync = new ShopifyProductSync(prisma);
  const orderSync = new ShopifyOrderSync(prisma);

  let products: ResourceSyncOutcome;
  try {
    const result = await productSync.syncAll(store.id, client, maxPages);
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
    for (let i = 0; i < maxPages; i++) {
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
        message: `Synced ${ordersSynced} orders (up to ${maxPages} pages)`,
      };

  const productMessage = products.ok
    ? `${products.message} (up to ${maxPages} pages)`
    : products.error;

  return {
    ok: products.ok && orders.ok,
    products: products.ok
      ? { ...products, message: productMessage }
      : products,
    orders,
  };
}

export async function runProductSyncForStore(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return;
  const client = await createAdminClientForShop(store.shopDomain);
  if (!client) return;
  await new ShopifyProductSync(prisma).syncAll(
    store.id,
    client,
    getSyncMaxPages(),
  );
}

export async function runOrderSyncForStore(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return;
  const client = await createAdminClientForShop(store.shopDomain);
  if (!client) return;
  const orderSync = new ShopifyOrderSync(prisma);
  const maxPages = getSyncMaxPages();
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await orderSync.syncPage(store.id, client, cursor);
    if (!page.hasMore) break;
    cursor = page.endCursor;
  }
}
