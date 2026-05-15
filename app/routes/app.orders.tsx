import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import {
  Badge,
  BlockStack,
  Card,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { requireStoreForShop } from "~/services/tenant.server";

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

export default function OrdersPage() {
  const { orders } = useLoaderData<typeof loader>();

  return (
    <Page title="Orders">
      <Layout>
        <Layout.Section>
          <Badge tone="info">Delayed / missing tracking report — Milestone 2</Badge>
        </Layout.Section>
        <Layout.Section>
          <BlockStack gap="400">
            {orders.length === 0 ? (
              <Card>
                <Text as="p" tone="subdued">
                  No synced orders yet. Run product/order sync in Milestone 2.
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
