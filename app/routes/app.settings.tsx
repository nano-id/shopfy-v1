import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import {
  BlockStack,
  Button,
  Card,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import type { StoreSyncSummary } from "~/services/sync.server";
import { getSystemStatus } from "~/services/system-status.server";
import { requireStoreForShop } from "~/services/tenant.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await requireStoreForShop(session.shop);

  const policies = await prisma.storePolicy.findMany({
    where: { storeId: store.id },
  });

  const systemStatus = await getSystemStatus(store.id, {
    status: store.status,
    widgetEnabled: store.widgetEnabled,
  });

  return {
    store: {
      supportEmail: store.supportEmail ?? "",
      widgetEnabled: store.widgetEnabled,
    },
    policies,
    systemStatus,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await requireStoreForShop(session.shop);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "sync") {
    const { runInitialStoreSync } = await import("~/services/sync.server");
    const syncResult = await runInitialStoreSync(store.shopDomain);
    return {
      ok: syncResult.ok,
      synced: true,
      syncResult,
    };
  }

  await prisma.store.update({
    where: { id: store.id },
    data: {
      supportEmail: String(form.get("supportEmail") ?? "") || null,
      widgetEnabled: form.get("widgetEnabled") === "on",
    },
  });

  return { ok: true };
};

function formatSyncLine(
  label: string,
  outcome: StoreSyncSummary["products"],
): string {
  if (outcome.ok) {
    return `${label}: ${outcome.message}`;
  }
  return `${label}: failed — ${outcome.error}`;
}

function formatLastSync(
  resource: string,
  info: {
    status: string;
    message: string | null;
    finishedAt: string | null;
  },
): string {
  if (info.status === "none") {
    return `${resource}: no sync yet`;
  }
  const time = info.finishedAt
    ? new Date(info.finishedAt).toLocaleString()
    : "in progress";
  return `${resource}: ${info.status}${info.message ? ` — ${info.message}` : ""} (${time})`;
}

export default function SettingsPage() {
  const { store, policies, systemStatus } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          {actionData?.ok === true && actionData.synced && actionData.syncResult && (
            <BlockStack gap="100">
              <Text as="p" tone="success">
                Sync finished.
              </Text>
              <Text as="p" variant="bodySm">
                {formatSyncLine("Products", actionData.syncResult.products)}
              </Text>
              <Text as="p" variant="bodySm">
                {formatSyncLine("Orders", actionData.syncResult.orders)}
              </Text>
            </BlockStack>
          )}
          {actionData?.synced && actionData.ok === false && actionData.syncResult && (
            <BlockStack gap="100">
              <Text as="p" tone="critical">
                Sync completed with errors.
              </Text>
              <Text as="p" variant="bodySm">
                {formatSyncLine("Products", actionData.syncResult.products)}
              </Text>
              <Text as="p" variant="bodySm">
                {formatSyncLine("Orders", actionData.syncResult.orders)}
              </Text>
            </BlockStack>
          )}
          {actionData?.ok && !actionData.synced && (
            <Text as="p" tone="success">
              Settings saved.
            </Text>
          )}
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                System status
              </Text>
              <Text as="p" variant="bodySm">
                Database connected:{" "}
                {systemStatus.databaseConnected ? "yes" : "no"}
                {!systemStatus.databaseConnected &&
                  systemStatus.databaseMessage &&
                  ` (${systemStatus.databaseMessage})`}
              </Text>
              <Text as="p" variant="bodySm">
                Store connected: {systemStatus.storeConnected ? "yes" : "no"}
              </Text>
              <Text as="p" variant="bodySm">
                Widget enabled: {systemStatus.widgetEnabled ? "yes" : "no"}
              </Text>
              <Text as="p" variant="bodySm">
                {formatLastSync("Products", systemStatus.lastProductSync)}
              </Text>
              <Text as="p" variant="bodySm">
                {formatLastSync("Orders", systemStatus.lastOrderSync)}
              </Text>
              <Text as="p" tone="subdued" variant="bodySm">
                Public health check: GET /api/health
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Form method="post">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Support & widget
                </Text>
                <label>
                  <Text as="span" variant="bodyMd">
                    Support email
                  </Text>
                  <input
                    type="email"
                    name="supportEmail"
                    defaultValue={store.supportEmail}
                    style={{ display: "block", width: "100%", marginTop: 8 }}
                  />
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    name="widgetEnabled"
                    defaultChecked={store.widgetEnabled}
                  />
                  <Text as="span">Enable storefront chat widget</Text>
                </label>
                <Text as="p" tone="subdued" variant="bodySm">
                  AI behavior tuning and policy editor — Milestone 2.
                </Text>
                <Button submit variant="primary">
                  Save
                </Button>
              </BlockStack>
            </Card>
          </Form>
        </Layout.Section>
        <Layout.Section>
          <Form method="post">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Data sync
                </Text>
                <Text as="p" tone="subdued">
                  Pull products, variants, orders, and fulfillments from Shopify.
                </Text>
                <input type="hidden" name="intent" value="sync" />
                <Button submit>Sync now</Button>
              </BlockStack>
            </Card>
          </Form>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Store policies ({policies.length})
              </Text>
              <Text as="p" tone="subdued">
                Shipping, returns, and sizing policies will be editable here for
                deterministic bot answers.
              </Text>
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
