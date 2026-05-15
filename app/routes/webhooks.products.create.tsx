import type { ActionFunctionArgs } from "react-router";
import { persistWebhookEvent } from "~/services/webhooks.server";
import { processProductWebhook } from "~/services/webhook-processors.server";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  await persistWebhookEvent({ shopDomain: shop, topic, payload });
  try {
    await processProductWebhook(shop, payload);
  } catch (error) {
    console.error(`[webhook] ${topic} processing failed`, shop, error);
  }
  return new Response();
};
