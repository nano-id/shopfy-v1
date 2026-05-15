import type { PrismaClient, ConversationStatus } from "@prisma/client";
import type {
  ConversationRepository,
  ConversationRecord,
} from "@support/core";

export class PrismaConversationRepository implements ConversationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByStore(
    storeId: string,
    options?: { status?: ConversationStatus; limit?: number },
  ): Promise<ConversationRecord[]> {
    const rows = await this.prisma.conversation.findMany({
      where: {
        storeId,
        ...(options?.status ? { status: options.status } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: options?.limit ?? 50,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      storeId: r.storeId,
      status: r.status as ConversationRecord["status"],
      aiHandled: r.aiHandled,
      createdAt: r.createdAt,
      lastMessagePreview: r.messages[0]?.content?.slice(0, 120),
    }));
  }

  async countByStatus(
    storeId: string,
  ): Promise<Record<ConversationStatus, number>> {
    const groups = await this.prisma.conversation.groupBy({
      by: ["status"],
      where: { storeId },
      _count: true,
    });

    const base: Record<ConversationStatus, number> = {
      OPEN: 0,
      RESOLVED: 0,
      NEEDS_HUMAN: 0,
      CLOSED: 0,
    };

    for (const g of groups) {
      base[g.status] = g._count;
    }
    return base;
  }
}
