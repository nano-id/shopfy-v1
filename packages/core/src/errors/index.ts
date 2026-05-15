export class TenantIsolationError extends Error {
  constructor(message = "Cross-tenant access denied") {
    super(message);
    this.name = "TenantIsolationError";
  }
}

export class OrderVerificationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "EMAIL_MISMATCH"
      | "INVALID_INPUT"
      | "RATE_LIMITED",
  ) {
    super(message);
    this.name = "OrderVerificationError";
  }
}

export class DeterministicFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeterministicFlowError";
  }
}
