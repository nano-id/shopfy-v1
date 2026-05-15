export type NormalizedProductInput = {
  externalId: string;
  title: string;
  handle: string | null;
  description: string | null;
  vendor: string | null;
  productType: string | null;
  status: string | null;
  variants: {
    externalId: string;
    title: string | null;
    sku: string | null;
    price: string | null;
    sizeLabel: string | null;
  }[];
};

type ShopifyProductNode = {
  id: string;
  title: string;
  handle?: string | null;
  description?: string | null;
  vendor?: string | null;
  productType?: string | null;
  status?: string | null;
  variants?: {
    edges?: Array<{
      node: {
        id: string;
        title?: string | null;
        sku?: string | null;
        price?: string | null;
      };
    }>;
  };
};

export function mapShopifyProductToNormalized(
  node: ShopifyProductNode,
): NormalizedProductInput {
  const variants =
    node.variants?.edges?.map(({ node: v }) => ({
      externalId: v.id,
      title: v.title ?? null,
      sku: v.sku ?? null,
      price: v.price ?? null,
      sizeLabel: extractSizeLabel(v.title),
    })) ?? [];

  return {
    externalId: node.id,
    title: node.title,
    handle: node.handle ?? null,
    description: node.description ?? null,
    vendor: node.vendor ?? null,
    productType: node.productType ?? null,
    status: node.status ?? null,
    variants,
  };
}

function extractSizeLabel(variantTitle?: string | null): string | null {
  if (!variantTitle) return null;
  return variantTitle.trim() || null;
}
