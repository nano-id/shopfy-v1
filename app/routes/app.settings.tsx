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
import { requireStoreForShop } from "~/services/tenant.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await requireStoreForShop(session.shop);

  const policies = await prisma.storePolicy.findMany({
    where: { storeId: store.id },
  });

  return {
    store: {
      supportEmail: store.supportEmail ?? "",
      widgetEnabled: store.widgetEnabled,
    },
    policies,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await requireStoreForShop(session.shop);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "sync") {
    const { runInitialStoreSync } = await import("~/services/sync.server");
    await runInitialStoreSync(store.shopDomain);
    return { ok: true, synced: true };
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

export default function SettingsPage() {
  const { store, policies } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          {actionData?.ok && (
            <Text as="p" tone="success">
              {actionData.synced
                ? "Product and order sync completed."
                : "Settings saved."}
            </Text>
          )}
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
