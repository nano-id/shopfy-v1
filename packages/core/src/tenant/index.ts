import { TenantIsolationError } from "../errors/index.js";

/** Ensures a resource belongs to the requesting store. */
export function assertStoreOwnership(
  resourceStoreId: string,
  requestStoreId: string,
): void {
  if (resourceStoreId !== requestStoreId) {
    throw new TenantIsolationError();
  }
}

export type TenantContext = {
  storeId: string;
  shopDomain: string;
};
