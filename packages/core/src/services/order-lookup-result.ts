import type { NormalizedOrder } from "../types/index.js";

/** Result from platform order connector — distinguishes missing order vs API failure. */
export type OrderConnectorLookupResult =
  | { status: "found"; order: NormalizedOrder }
  | { status: "not_found" }
  | {
      status: "unavailable";
      code: "API_ERROR" | "NO_CLIENT" | "THROTTLED";
      cause?: string;
    };
