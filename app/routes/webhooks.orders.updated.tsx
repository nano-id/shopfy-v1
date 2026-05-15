import type { ActionFunctionArgs } from "react-router";
import { persistWebhookEvent } from "~/services/webhooks.server";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  await persistWebhookEvent({ shopDomain: shop, topic, payload });
  return new Response();
};
