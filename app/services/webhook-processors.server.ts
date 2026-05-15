import { mapShopifyOrderToNormalized } from "@support/shopify-connector";
import { mapShopifyProductToNormalized } from "@support/shopify-connector";
import { upsertOrderFromNormalized } from "@support/shopify-connector";
import prisma from "~/db.server";

type WebhookOrderPayload = {
  id?: number | string;
  name?: string;
  email?: string;
  financial_status?: string;
  fulfillment_status?: string;
  fulfillments?: Array<{
    id?: number | string;
    status?: string;
    tracking_company?: string;
    tracking_number?: string;
    tracking_url?: string;
    tracking_numbers?: string[];
    tracking_urls?: string[];
  }>;
  customer?: {
    id?: number | string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
};

type WebhookProductPayload = {
  id?: number | string;
  title?: string;
  handle?: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  status?: string;
  variants?: Array<{
    id?: number | string;
    title?: string;
    sku?: string;
    price?: string;
  }>;
};

export async function processOrderWebhook(
  shopDomain: string,
  payload: unknown,
) {
  const store = await prisma.store.findUnique({ where: { shopDomain } });
  if (!store) return;

  const data = payload as WebhookOrderPayload;
  if (!data.id) return;

  const gid = `gid://shopify/Order/${data.id}`;
  const fulfillments =
    data.fulfillments?.map((f) => ({
      id: `gid://shopify/Fulfillment/${f.id}`,
      status: f.status ?? null,
      trackingInfo: [
        {
          company: f.tracking_company ?? null,
          number:
            f.tracking_number ??
            f.tracking_numbers?.[0] ??
            null,
          url: f.tracking_url ?? f.tracking_urls?.[0] ?? null,
        },
      ],
    })) ?? [];

  const normalized = mapShopifyOrderToNormalized({
    id: gid,
    name: data.name ?? null,
    email: data.email ?? null,
    displayFinancialStatus: data.financial_status ?? null,
    displayFulfillmentStatus: data.fulfillment_status ?? null,
    fulfillments,
  });

  const customerNode = data.customer?.id
    ? {
        id: `gid://shopify/Customer/${data.customer.id}`,
        email: data.customer.email,
        firstName: data.customer.first_name,
        lastName: data.customer.last_name,
      }
    : null;

  await upsertOrderFromNormalized(prisma, store.id, normalized, customerNode);
}

export async function processProductWebhook(
  shopDomain: string,
  payload: unknown,
) {
  const store = await prisma.store.findUnique({ where: { shopDomain } });
  if (!store) return;

  const data = payload as WebhookProductPayload;
  if (!data.id || !data.title) return;

  const mapped = mapShopifyProductToNormalized({
    id: `gid://shopify/Product/${data.id}`,
    title: data.title,
    handle: data.handle,
    description: data.body_html,
    vendor: data.vendor,
    productType: data.product_type,
    status: data.status,
    variants: {
      edges: (data.variants ?? []).map((v) => ({
        node: {
          id: `gid://shopify/ProductVariant/${v.id}`,
          title: v.title,
          sku: v.sku,
          price: v.price,
        },
      })),
    },
  });

  const product = await prisma.product.upsert({
    where: {
      storeId_externalId: { storeId: store.id, externalId: mapped.externalId },
    },
    create: {
      storeId: store.id,
      externalId: mapped.externalId,
      title: mapped.title,
      handle: mapped.handle,
      description: mapped.description,
      vendor: mapped.vendor,
      productType: mapped.productType,
      status: mapped.status,
      syncedAt: new Date(),
    },
    update: {
      title: mapped.title,
      handle: mapped.handle,
      description: mapped.description,
      syncedAt: new Date(),
    },
  });

  for (const v of mapped.variants) {
    await prisma.variant.upsert({
      where: {
        storeId_externalId: { storeId: store.id, externalId: v.externalId },
      },
      create: {
        storeId: store.id,
        productId: product.id,
        externalId: v.externalId,
        title: v.title,
        sku: v.sku,
        price: v.price,
        sizeLabel: v.sizeLabel,
      },
      update: {
        title: v.title,
        sku: v.sku,
        price: v.price,
        sizeLabel: v.sizeLabel,
      },
    });
  }
}
