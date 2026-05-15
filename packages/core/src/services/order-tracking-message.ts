import type { NormalizedFulfillment, NormalizedOrder } from "../types/index.js";

/** Deterministic tracking copy — never invent carrier or status. */
export function formatOrderTrackingMessage(order: NormalizedOrder): string {
  const fulfillments = order.fulfillments ?? [];

  if (fulfillments.length === 0) {
    return (
      `We found order ${order.name ?? order.externalId}. ` +
      `It has not been fulfilled yet, so there is no tracking information available. ` +
      `Please check back later or contact support if you need help.`
    );
  }

  const withTracking = fulfillments.filter((f) => f.trackingNumber);
  if (withTracking.length === 0) {
    return (
      `We found order ${order.name ?? order.externalId}. ` +
      `Your order has been fulfilled, but tracking details are not available yet. ` +
      `Please check back later.`
    );
  }

  return withTracking
    .map((f) => formatSingleFulfillment(order.name, f))
    .join("\n\n");
}

function formatSingleFulfillment(
  orderName: string | null,
  f: NormalizedFulfillment,
): string {
  const parts = [
    `Order ${orderName ?? "found"}:`,
    f.status ? `Status: ${f.status}.` : null,
    f.trackingCompany ? `Carrier: ${f.trackingCompany}.` : null,
    f.trackingNumber ? `Tracking number: ${f.trackingNumber}.` : null,
    f.trackingUrl ? `Track here: ${f.trackingUrl}` : null,
  ].filter(Boolean);

  return parts.join(" ");
}
