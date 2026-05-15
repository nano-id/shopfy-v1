import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import {
  Badge,
  BlockStack,
  Card,
  DataTable,
  InlineGrid,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { RETURN_REASON_LABELS } from "@support/core";
import { authenticate } from "~/shopify.server";
import { getContainer } from "~/services/container.server";
import { requireStoreForShop } from "~/services/tenant.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await requireStoreForShop(session.shop);
  const { analyticsRepo, conversationRepo } = getContainer();

  const [metrics, recentConversations] = await Promise.all([
    analyticsRepo.getDashboardMetrics(store.id),
    conversationRepo.listByStore(store.id, { limit: 5 }),
  ]);

  return { metrics, recentConversations };
};

export default function DashboardPage() {
  const { metrics, recentConversations } = useLoaderData<typeof loader>();

  const statCards = [
    { title: "AI resolved", value: metrics.aiResolvedConversations },
    { title: "Tracking requests", value: metrics.orderTrackingRequests },
    { title: "Returns captured", value: metrics.returnRequestsCaptured },
    { title: "Unresolved", value: metrics.unresolvedConversations },
  ];

  const reasonRows = metrics.topReturnReasons.map((r) => [
    RETURN_REASON_LABELS[r.reasonCode],
    String(r.count),
  ]);

  const conversationRows = recentConversations.map((c) => [
    c.id.slice(0, 8),
    c.status,
    c.aiHandled ? "Yes" : "No",
    c.lastMessagePreview ?? "—",
  ]);

  return (
    <Page title="Support AI Dashboard">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            {statCards.map((card) => (
              <Card key={card.title}>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    {card.title}
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {card.value}
                  </Text>
                </BlockStack>
              </Card>
            ))}
          </InlineGrid>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Top return reasons
              </Text>
              {reasonRows.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "numeric"]}
                  headings={["Reason", "Count"]}
                  rows={reasonRows}
                />
              ) : (
                <Text as="p" tone="subdued">
                  No return data yet.
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="300">
              <InlineGrid columns={2}>
                <Text as="h2" variant="headingMd">
                  Recent conversations
                </Text>
                <Badge tone="info">Delayed orders — Milestone 2</Badge>
              </InlineGrid>
              {conversationRows.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["ID", "Status", "AI", "Preview"]}
                  rows={conversationRows}
                />
              ) : (
                <Text as="p" tone="subdued">
                  No conversations yet.
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
