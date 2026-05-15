export type ShopifyAdminClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export type ShopifyWebhookHeaders = {
  hmac: string | null;
  topic: string | null;
  shopDomain: string | null;
  webhookId: string | null;
};
