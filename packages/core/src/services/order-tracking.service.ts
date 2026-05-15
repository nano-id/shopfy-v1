import { OrderVerificationError } from "../errors/index.js";
import type { OrderLookupInput, OrderLookupResult } from "../types/index.js";
import type { OrderConnector } from "./order-connector.interface.js";
import { OrderVerificationService } from "./order-verification.service.js";
import { formatOrderTrackingMessage } from "./order-tracking-message.js";

const ORDER_NOT_FOUND_MESSAGE =
  "We could not find an order with that number and email. Please check your details and try again.";

const ORDER_UNAVAILABLE_MESSAGE =
  "We could not check your order right now. Please try again shortly.";

export class OrderTrackingService {
  constructor(
    private readonly connector: OrderConnector,
    private readonly verification = new OrderVerificationService(),
  ) {}

  async lookup(
    storeId: string,
    input: OrderLookupInput,
  ): Promise<OrderLookupResult> {
    this.verification.validateLookupInput(input);

    const orderNumber = this.verification.normalizeOrderNumber(
      input.orderNumber,
    );
    const email = this.verification.normalizeEmail(input.email);

    const connectorResult = await this.connector.findOrderByNumberAndEmail(
      storeId,
      orderNumber,
      email,
    );

    if (connectorResult.status === "unavailable") {
      return {
        success: false,
        code: "UNAVAILABLE",
        message: ORDER_UNAVAILABLE_MESSAGE,
      };
    }

    if (connectorResult.status === "not_found") {
      return {
        success: false,
        code: "NOT_FOUND",
        message: ORDER_NOT_FOUND_MESSAGE,
      };
    }

    const order = connectorResult.order;

    if (!this.verification.emailsMatch(order.email, email)) {
      throw new OrderVerificationError(
        "Order email does not match",
        "EMAIL_MISMATCH",
      );
    }

    return {
      success: true,
      order,
      message: formatOrderTrackingMessage(order),
    };
  }
}
