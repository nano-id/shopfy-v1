/**
 * Storefront CORS — permissive for dev; restrict via STOREFRONT_CORS_ORIGINS later.
 * Example: STOREFRONT_CORS_ORIGINS=https://my-store.myshopify.com,https://shop.example.com
 */
export function getStorefrontCorsHeaders(request: Request): HeadersInit {
  const configured = process.env.STOREFRONT_CORS_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const origin = request.headers.get("Origin");
  let allowOrigin = "*";

  if (configured?.length && origin) {
    const shopDomain = origin.replace(/^https?:\/\//, "").split("/")[0];
    const allowed = configured.some(
      (entry) =>
        entry === origin ||
        entry === shopDomain ||
        shopDomain.endsWith(entry.replace(/^\*\./, "")),
    );
    if (allowed) allowOrigin = origin;
    else allowOrigin = configured[0] ?? "*";
  } else if (origin) {
    // Default: reflect origin for Shopify storefronts (*.myshopify.com)
    if (origin.includes("myshopify.com") || process.env.NODE_ENV !== "production") {
      allowOrigin = origin;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function jsonWithCors(
  request: Request,
  body: unknown,
  init?: ResponseInit,
): Response {
  const headers = new Headers(init?.headers);
  const cors = getStorefrontCorsHeaders(request);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }
  headers.set("Content-Type", "application/json");
  return Response.json(body, { ...init, headers });
}

export function corsPreflightResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getStorefrontCorsHeaders(request),
  });
}
