import type { ActionFunctionArgs } from "react-router";
import {
  persistWebhookEvent,
  processWebhookEvent,
} from "~/services/webhooks.server";
import { processProductWebhook } from "~/services/webhook-processors.server";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const event = await persistWebhookEvent({ shopDomain: shop, topic, payload });
  await processWebhookEvent(event.id, () => processProductWebhook(shop, payload));
  return new Response();
};
