import type { ActionFunctionArgs } from "react-router";
import prisma from "~/db.server";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.info(`Received ${topic} webhook for ${shop}`);

  const scope = (payload as { current?: string[] })?.current?.join(",") ?? null;
  if (scope) {
    await prisma.store.updateMany({
      where: { shopDomain: shop },
      data: { scope },
    });
  }

  return new Response();
};
