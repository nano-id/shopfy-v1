import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";

export function PolarisAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <PolarisProvider i18n={enTranslations}>{children}</PolarisProvider>
  );
}
