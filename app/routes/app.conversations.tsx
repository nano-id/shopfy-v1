import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { Card, DataTable, Layout, Page, Text } from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "~/shopify.server";
import { getContainer } from "~/services/container.server";
import { requireStoreForShop } from "~/services/tenant.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await requireStoreForShop(session.shop);
  const conversations = await getContainer().conversationRepo.listByStore(
    store.id,
    { limit: 100 },
  );
  return { conversations };
};

export default function ConversationsPage() {
  const { conversations } = useLoaderData<typeof loader>();

  const rows = conversations.map((c) => [
    c.id.slice(0, 10),
    c.status,
    c.aiHandled ? "AI handled" : "Manual",
    c.status === "NEEDS_HUMAN" ? "Needs human" : "—",
    c.lastMessagePreview ?? "—",
    c.createdAt.toISOString().slice(0, 10),
  ]);

  return (
    <Page title="Conversations">
      <Layout>
        <Layout.Section>
          <Card>
            {rows.length > 0 ? (
              <DataTable
                columnContentTypes={[
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                ]}
                headings={[
                  "ID",
                  "Status",
                  "Handled by",
                  "Handoff",
                  "Preview",
                  "Created",
                ]}
                rows={rows}
              />
            ) : (
              <Text as="p" tone="subdued">
                No conversations yet. Enable the storefront widget to start
                capturing chats.
              </Text>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
