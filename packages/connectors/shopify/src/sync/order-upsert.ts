import type { PrismaClient } from "@prisma/client";
import type { NormalizedOrder } from "@support/core";

type CustomerNode = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
} | null;

export async function upsertOrderFromNormalized(
  prisma: PrismaClient,
  storeId: string,
  order: NormalizedOrder,
  customerNode?: CustomerNode,
) {
  let customerId: string | undefined;

  if (customerNode?.id) {
    const customer = await prisma.customer.upsert({
      where: {
        storeId_externalId: { storeId, externalId: customerNode.id },
      },
      create: {
        storeId,
        externalId: customerNode.id,
        email: customerNode.email ?? order.email,
        firstName: customerNode.firstName,
        lastName: customerNode.lastName,
      },
      update: {
        email: customerNode.email ?? order.email,
        firstName: customerNode.firstName,
        lastName: customerNode.lastName,
      },
    });
    customerId = customer.id;
  }

  const dbOrder = await prisma.order.upsert({
    where: {
      storeId_externalId: { storeId, externalId: order.externalId },
    },
    create: {
      storeId,
      externalId: order.externalId,
      customerId,
      name: order.name,
      email: order.email,
      financialStatus: order.financialStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      syncedAt: new Date(),
    },
    update: {
      customerId,
      name: order.name,
      email: order.email,
      financialStatus: order.financialStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      syncedAt: new Date(),
    },
  });

  for (const f of order.fulfillments) {
    await prisma.fulfillment.upsert({
      where: {
        storeId_externalId: { storeId, externalId: f.externalId },
      },
      create: {
        storeId,
        orderId: dbOrder.id,
        externalId: f.externalId,
        status: f.status,
        trackingCompany: f.trackingCompany,
        trackingNumber: f.trackingNumber,
        trackingUrl: f.trackingUrl,
      },
      update: {
        status: f.status,
        trackingCompany: f.trackingCompany,
        trackingNumber: f.trackingNumber,
        trackingUrl: f.trackingUrl,
      },
    });
  }

  return dbOrder;
}
