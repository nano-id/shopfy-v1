import type { ShopifyAdminClient } from "../types.js";

export type GraphQLResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      httpStatus?: number;
      throttled?: boolean;
      graphqlErrors?: unknown[];
    };

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
};

export async function executeShopifyGraphQL<T>(
  client: ShopifyAdminClient,
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphQLResult<T>> {
  let response: Response;
  try {
    response = await client.graphql(query, { variables });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Shopify request failed";
    console.error("[shopify-graphql] network error", message);
    return { ok: false, error: message };
  }

  if (response.status === 429) {
    console.warn("[shopify-graphql] rate limited (429)");
    return {
      ok: false,
      error: "Shopify rate limit reached. Please try again shortly.",
      httpStatus: 429,
      throttled: true,
    };
  }

  if (!response.ok) {
    console.error("[shopify-graphql] HTTP error", response.status);
    return {
      ok: false,
      error: `Shopify API error (${response.status})`,
      httpStatus: response.status,
    };
  }

  let json: GraphQLResponse<T>;
  try {
    json = (await response.json()) as GraphQLResponse<T>;
  } catch {
    return { ok: false, error: "Invalid Shopify API response" };
  }

  if (json.errors?.length) {
    const throttled = json.errors.some(
      (e) =>
        e.extensions?.code === "THROTTLED" ||
        e.message.toLowerCase().includes("throttl"),
    );
    if (throttled) {
      console.warn("[shopify-graphql] GraphQL throttled", json.errors);
    } else {
      console.error("[shopify-graphql] GraphQL errors", json.errors);
    }
    return {
      ok: false,
      error: throttled
        ? "Shopify rate limit reached. Please try again shortly."
        : "Could not fetch data from Shopify",
      throttled,
      graphqlErrors: json.errors,
    };
  }

  if (!json.data) {
    return { ok: false, error: "Empty Shopify API response" };
  }

  return { ok: true, data: json.data };
}
