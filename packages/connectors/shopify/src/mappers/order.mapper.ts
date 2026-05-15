import type { NormalizedFulfillment, NormalizedOrder } from "@support/core";

type ShopifyFulfillmentNode = {
  id: string;
  status?: string | null;
  trackingInfo?: Array<{
    company?: string | null;
    number?: string | null;
    url?: string | null;
  }> | null;
};

type ShopifyOrderNode = {
  id: string;
  name?: string | null;
  email?: string | null;
  displayFinancialStatus?: string | null;
  displayFulfillmentStatus?: string | null;
  fulfillments?: ShopifyFulfillmentNode[] | null;
};

export function mapShopifyOrderToNormalized(
  node: ShopifyOrderNode,
): NormalizedOrder {
  const fulfillments: NormalizedFulfillment[] = (node.fulfillments ?? []).map(
    (f) => {
      const tracking = f.trackingInfo?.[0];
      return {
        externalId: f.id,
        status: f.status ?? null,
        trackingCompany: tracking?.company ?? null,
        trackingNumber: tracking?.number ?? null,
        trackingUrl: tracking?.url ?? null,
      };
    },
  );

  return {
    externalId: node.id,
    name: node.name ?? null,
    email: node.email ?? null,
    financialStatus: node.displayFinancialStatus ?? null,
    fulfillmentStatus: node.displayFulfillmentStatus ?? null,
    fulfillments,
  };
}
