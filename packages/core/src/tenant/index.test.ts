import { describe, expect, it } from "vitest";
import { assertStoreOwnership } from "./index.js";
import { TenantIsolationError } from "../errors/index.js";

describe("assertStoreOwnership", () => {
  it("passes when store ids match", () => {
    expect(() => assertStoreOwnership("store-a", "store-a")).not.toThrow();
  });

  it("throws when store ids differ", () => {
    expect(() => assertStoreOwnership("store-a", "store-b")).toThrow(
      TenantIsolationError,
    );
  });
});
