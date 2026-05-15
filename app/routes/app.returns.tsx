import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { Card, DataTable, Layout, Page, Text } from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { RETURN_REASON_LABELS, type ReturnReasonCode } from "@support/core";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { requireStoreForShop } from "~/services/tenant.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await requireStoreForShop(session.shop);

  const [returns, reasonSummary] = await Promise.all([
    prisma.returnRequest.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { variant: true },
    }),
    prisma.returnRequest.groupBy({
      by: ["reasonCode", "productTitle", "variantTitle"],
      where: { storeId: store.id },
      _count: true,
      orderBy: { _count: { reasonCode: "desc" } },
      take: 20,
    }),
  ]);

  return { returns, reasonSummary };
};

export default function ReturnsPage() {
  const { returns, reasonSummary } = useLoaderData<typeof loader>();

  const summaryRows = reasonSummary.map((r) => [
    r.productTitle ?? "—",
    r.variantTitle ?? "—",
    RETURN_REASON_LABELS[r.reasonCode as ReturnReasonCode],
    String(r._count),
  ]);

  const requestRows = returns.map((r) => [
    r.createdAt.toISOString().slice(0, 10),
    RETURN_REASON_LABELS[r.reasonCode as ReturnReasonCode],
    r.productTitle ?? "—",
    r.variantTitle ?? r.variant?.title ?? "—",
    r.customerEmail ?? "—",
  ]);

  return (
    <Page title="Returns">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Return reason analytics
            </Text>
            {summaryRows.length > 0 ? (
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric"]}
                headings={["Product", "Variant", "Reason", "Count"]}
                rows={summaryRows}
              />
            ) : (
              <Text as="p" tone="subdued">
                No return requests yet.
              </Text>
            )}
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Recent return requests
            </Text>
            {requestRows.length > 0 ? (
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text"]}
                headings={["Date", "Reason", "Product", "Variant", "Email"]}
                rows={requestRows}
              />
            ) : (
              <Text as="p" tone="subdued">
                No requests captured yet.
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
