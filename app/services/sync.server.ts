import {
  ShopifyOrderSync,
  ShopifyProductSync,
} from "@support/shopify-connector";
import prisma from "~/db.server";
import { createAdminClientForShop } from "./shopify-admin.server";

const MAX_PAGES = 5;

export async function runInitialStoreSync(shopDomain: string) {
  const store = await prisma.store.findUnique({ where: { shopDomain } });
  if (!store || store.status !== "ACTIVE") return;

  const client = await createAdminClientForShop(shopDomain);
  if (!client) {
    console.error("[sync] no admin session for", shopDomain);
    return;
  }

  const productSync = new ShopifyProductSync(prisma);
  const orderSync = new ShopifyOrderSync(prisma);

  await productSync.syncAll(store.id, client, MAX_PAGES);

  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await orderSync.syncPage(store.id, client, cursor);
    if (!page.hasMore) break;
    cursor = page.endCursor;
  }
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
