import type { PrismaClient } from "@prisma/client";
import type { AnalyticsRepository, DashboardMetrics } from "@support/core";
import type { ReturnReasonCode } from "@support/core";

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboardMetrics(storeId: string): Promise<DashboardMetrics> {
    const [
      aiResolved,
      trackingMessages,
      returnCount,
      unresolved,
      topReasons,
    ] = await Promise.all([
      this.prisma.conversation.count({
        where: { storeId, status: "RESOLVED", aiHandled: true },
      }),
      this.prisma.message.count({
        where: {
          conversation: { storeId },
          role: "BOT",
          content: { contains: "tracking", mode: "insensitive" },
        },
      }),
      this.prisma.returnRequest.count({ where: { storeId } }),
      this.prisma.conversation.count({
        where: { storeId, status: { in: ["OPEN", "NEEDS_HUMAN"] } },
      }),
      this.prisma.returnRequest.groupBy({
        by: ["reasonCode"],
        where: { storeId },
        _count: true,
        orderBy: { _count: { reasonCode: "desc" } },
        take: 5,
      }),
    ]);

    return {
      aiResolvedConversations: aiResolved,
      orderTrackingRequests: trackingMessages,
      returnRequestsCaptured: returnCount,
      unresolvedConversations: unresolved,
      topReturnReasons: topReasons.map((r) => ({
        reasonCode: r.reasonCode as ReturnReasonCode,
        count: r._count,
      })),
    };
  }
}
