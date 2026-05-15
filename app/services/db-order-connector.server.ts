import type { NormalizedFulfillment, NormalizedOrder } from "@support/core";
import type { OrderConnector } from "@support/core";
import prisma from "~/db.server";

/** DB-first order lookup — falls back to platform connector when missing. */
export class DbFirstOrderConnector implements OrderConnector {
  constructor(private readonly platform: OrderConnector) {}

  async findOrderByNumberAndEmail(
    storeId: string,
    orderNumber: string,
    email: string,
  ): Promise<NormalizedOrder | null> {
    const normalizedNumber = orderNumber.trim().replace(/^#/, "");
    const normalizedEmail = email.trim().toLowerCase();

    const orders = await prisma.order.findMany({
      where: {
        storeId,
        OR: [
          { name: { equals: `#${normalizedNumber}`, mode: "insensitive" } },
          { name: { equals: normalizedNumber, mode: "insensitive" } },
        ],
      },
      include: { fulfillments: true },
      take: 5,
    });

    const match = orders.find(
      (o) => o.email?.toLowerCase() === normalizedEmail,
    );

    if (match) {
      return mapDbOrder(match);
    }

    return this.platform.findOrderByNumberAndEmail(
      storeId,
      orderNumber,
      email,
    );
  }
}

function mapDbOrder(order: {
  externalId: string;
  name: string | null;
  email: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  fulfillments: Array<{
    externalId: string;
    status: string | null;
    trackingCompany: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
  }>;
}): NormalizedOrder {
  const fulfillments: NormalizedFulfillment[] = order.fulfillments.map(
    (f) => ({
      externalId: f.externalId,
      status: f.status,
      trackingCompany: f.trackingCompany,
      trackingNumber: f.trackingNumber,
      trackingUrl: f.trackingUrl,
    }),
  );

  return {
    externalId: order.externalId,
    name: order.name,
    email: order.email,
    financialStatus: order.financialStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    fulfillments,
  };
}
