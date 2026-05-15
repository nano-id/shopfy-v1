import type { ActionFunctionArgs } from "react-router";
import { ShopifyStoreService } from "@support/shopify-connector";
import prisma from "~/db.server";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.info(`Received ${topic} webhook for ${shop}`);

  const storeService = new ShopifyStoreService(prisma);
  await storeService.markUninstalled(shop);

  return new Response();
};
