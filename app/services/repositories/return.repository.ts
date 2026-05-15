import type { PrismaClient } from "@prisma/client";
import type { ReturnRepository } from "@support/core";
import type { ReturnReasonCode, ReturnRequestInput } from "@support/core";

export class PrismaReturnRepository implements ReturnRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(storeId: string, input: ReturnRequestInput) {
    const record = await this.prisma.returnRequest.create({
      data: {
        storeId,
        reasonCode: input.reasonCode,
        reasonNote: input.reasonNote,
        customerEmail: input.customerEmail,
        productTitle: input.productTitle,
        variantTitle: input.variantTitle,
        conversationId: input.conversationId,
      },
    });
    return { id: record.id };
  }

  async countByReason(storeId: string) {
    const groups = await this.prisma.returnRequest.groupBy({
      by: ["reasonCode"],
      where: { storeId },
      _count: true,
      orderBy: { _count: { reasonCode: "desc" } },
    });

    return groups.map((g) => ({
      reasonCode: g.reasonCode as ReturnReasonCode,
      count: g._count,
    }));
  }
}
