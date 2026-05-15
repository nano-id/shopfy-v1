import type { ActionFunctionArgs } from "react-router";
import prisma from "~/db.server";
import {
  persistWebhookEvent,
  processWebhookEvent,
} from "~/services/webhooks.server";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const event = await persistWebhookEvent({ shopDomain: shop, topic, payload });

  await processWebhookEvent(event.id, async () => {
    const scope =
      (payload as { current?: string[] })?.current?.join(",") ?? null;
    if (scope) {
      await prisma.store.updateMany({
        where: { shopDomain: shop },
        data: { scope },
      });
    }
  });

  return new Response();
};
