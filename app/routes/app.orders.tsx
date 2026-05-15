import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { OrderVerificationError } from "@support/core";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { getContainer } from "~/services/container.server";
import { requireStoreForShop } from "~/services/tenant.server";

export type OrderLookupTestResult = {
  status: "found" | "not_found" | "unavailable";
  message: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await requireStoreForShop(session.shop);

  const orders = await prisma.order.findMany({
    where: { storeId: store.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { fulfillments: true },
  });

  return { orders };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await requireStoreForShop(session.shop);
  const form = await request.formData();

  if (form.get("intent") !== "test_lookup") {
    return { lookup: null };
  }

  const orderNumber = String(form.get("orderNumber") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();

  if (!orderNumber || !email) {
    return {
      lookup: {
        status: "not_found" as const,
        message: "Enter both order number and email.",
      },
    };
  }

  const { orderTracking } = getContainer();

  try {
    const result = await orderTracking.lookup(store.id, { orderNumber, email });

    if (result.success) {
      return {
        lookup: {
          status: "found" as const,
          message: result.message,
        },
      };
    }

    return {
      lookup: {
        status:
          result.code === "UNAVAILABLE"
            ? ("unavailable" as const)
            : ("not_found" as const),
        message: result.message,
      },
    };
  } catch (error) {
    if (error instanceof OrderVerificationError) {
      const message =
        error.code === "EMAIL_MISMATCH"
          ? "The email does not match this order. Please check and try again."
          : "Please provide a valid order number and email.";
      return { lookup: { status: "not_found" as const, message } };
    }

    console.error("[orders] test lookup failed", error);
    return {
      lookup: {
        status: "unavailable" as const,
        message:
          "We could not check your order right now. Please try again shortly.",
      },
    };
  }
};

export default function OrdersPage() {
  const { orders } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const lookup = actionData?.lookup;

  return (
    <Page title="Orders">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Order lookup test (admin)
              </Text>
              <Text as="p" tone="subdued" variant="bodySm">
                Smoke-test order tracking before using the storefront widget.
                Uses the same backend as the chat widget.
              </Text>
              <Form method="post">
                <input type="hidden" name="intent" value="test_lookup" />
                <BlockStack gap="200">
                  <label>
                    <Text as="span" variant="bodyMd">
                      Order number
                    </Text>
                    <input
                      type="text"
                      name="orderNumber"
                      placeholder="#1001"
                      style={{ display: "block", width: "100%", marginTop: 8 }}
                    />
                  </label>
                  <label>
                    <Text as="span" variant="bodyMd">
                      Email
                    </Text>
                    <input
                      type="email"
                      name="email"
                      placeholder="customer@example.com"
                      style={{ display: "block", width: "100%", marginTop: 8 }}
                    />
                  </label>
                  <Button submit>Test lookup</Button>
                </BlockStack>
              </Form>
              {lookup && (
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm">
                    Result: <strong>{lookup.status}</strong>
                  </Text>
                  <Text as="p" variant="bodySm">
                    {lookup.message}
                  </Text>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Badge tone="info">Synced orders from Shopify</Badge>
        </Layout.Section>
        <Layout.Section>
          <BlockStack gap="400">
            {orders.length === 0 ? (
              <Card>
                <Text as="p" tone="subdued">
                  No synced orders yet. Run Settings → Sync now after connecting
                  PostgreSQL.
                </Text>
              </Card>
            ) : (
              orders.map((order) => (
                <Card key={order.id}>
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      {order.name ?? order.externalId}
                    </Text>
                    <Text as="p" variant="bodySm">
                      Email: {order.email ?? "—"} · Fulfillment:{" "}
                      {order.fulfillmentStatus ?? "—"}
                    </Text>
                    {order.fulfillments.map((f) => (
                      <Text key={f.id} as="p" variant="bodySm">
                        {f.trackingCompany ?? "Carrier"} ·{" "}
                        {f.trackingNumber ?? "No tracking"} · {f.status ?? "—"}
                      </Text>
                    ))}
                  </BlockStack>
                </Card>
              ))
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
