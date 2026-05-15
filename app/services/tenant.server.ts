import { assertStoreOwnership } from "@support/core";
import prisma from "../db.server";

export async function requireStoreForShop(shopDomain: string) {
  const store = await prisma.store.findUnique({
    where: { shopDomain },
  });
  if (!store || store.status !== "ACTIVE") {
    throw new Response("Store not found", { status: 404 });
  }
  return store;
}

export async function requireStoreById(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || store.status !== "ACTIVE") {
    throw new Response("Store not found", { status: 404 });
  }
  return store;
}

export function ensureTenantResource(
  resourceStoreId: string,
  requestStoreId: string,
) {
  assertStoreOwnership(resourceStoreId, requestStoreId);
}
