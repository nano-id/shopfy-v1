import type { ActionFunctionArgs } from "react-router";
import { ShopifyStoreService } from "@support/shopify-connector";
import prisma from "~/db.server";
import {
  persistWebhookEvent,
  processWebhookEvent,
} from "~/services/webhooks.server";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const event = await persistWebhookEvent({
    shopDomain: shop,
    topic,
    payload: payload ?? { shop },
  });

  await processWebhookEvent(event.id, async () => {
    const storeService = new ShopifyStoreService(prisma);
    await storeService.markUninstalled(shop);
  });

  return new Response();
};
