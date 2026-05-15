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

/**
 * Shopify may retry webhooks. Product/order upserts are idempotent by
 * storeId + externalId, so duplicate processing is safe at the data layer.
 */
export function safeWebhookError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Webhook processing failed";
  return raw.replace(/postgresql:\/\/[^\s]+/gi, "[redacted]").slice(0, 500);
}

export async function markWebhookProcessed(eventId: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      processed: true,
      processedAt: new Date(),
      error: null,
    },
  });
}

export async function markWebhookFailed(
  eventId: string,
  error: string,
): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      processed: false,
      processedAt: new Date(),
      error: error.slice(0, 500),
    },
  });
}

export async function processWebhookEvent(
  eventId: string,
  handler: () => Promise<void>,
): Promise<void> {
  try {
    await handler();
    await markWebhookProcessed(eventId);
  } catch (error) {
    const message = safeWebhookError(error);
    console.error(`[webhook] event ${eventId} failed`, error);
    await markWebhookFailed(eventId, message);
  }
}
