import prisma from "~/db.server";

export async function persistWebhookEvent(input: {
  shopDomain: string;
  topic: string;
  payload: unknown;
}) {
  const store = await prisma.store.findUnique({
    where: { shopDomain: input.shopDomain },
  });

  const externalId =
    typeof input.payload === "object" &&
    input.payload !== null &&
    "id" in input.payload
      ? String((input.payload as { id: unknown }).id)
      : null;

  return prisma.webhookEvent.create({
    data: {
      storeId: store?.id,
      topic: input.topic,
      shopDomain: input.shopDomain,
      externalId,
      payload: input.payload as object,
    },
  });
}
