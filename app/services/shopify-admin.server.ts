import type { ShopifyAdminClient } from "@support/shopify-connector";
import prisma from "../db.server";
import { sessionStorage } from "../shopify.server";

/** Resolves Shopify Admin GraphQL client for a tenant store. */
export async function createAdminClientForStore(
  storeId: string,
): Promise<ShopifyAdminClient | null> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || store.status !== "ACTIVE") return null;

  const sessions = await sessionStorage.findSessionsByShop(store.shopDomain);
  const offline = sessions.find((s) => !s.isOnline) ?? sessions[0];
  if (!offline?.accessToken) return null;

  const shop = store.shopDomain;
  const accessToken = offline.accessToken;
  const apiVersion = "2025-10";

  return {
    graphql: async (query, options) => {
      const response = await fetch(
        `https://${shop}/admin/api/${apiVersion}/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
          body: JSON.stringify({
            query,
            variables: options?.variables ?? {},
          }),
        },
      );
      return response;
    },
  };
}
