import { AiService } from "@support/ai";
import {
  OrderTrackingService,
  ReturnCollectionService,
} from "@support/core";
import { ShopifyOrderConnector } from "@support/shopify-connector";
import prisma from "../db.server";
import { PrismaAnalyticsRepository } from "./repositories/analytics.repository";
import { PrismaConversationRepository } from "./repositories/conversation.repository";
import { PrismaReturnRepository } from "./repositories/return.repository";
import { PrismaStoreRepository } from "./repositories/store.repository";
import { createAdminClientForStore } from "./shopify-admin.server";

let container: AppContainer | null = null;

export type AppContainer = {
  storeRepo: PrismaStoreRepository;
  conversationRepo: PrismaConversationRepository;
  returnRepo: PrismaReturnRepository;
  analyticsRepo: PrismaAnalyticsRepository;
  orderTracking: OrderTrackingService;
  returnCollection: ReturnCollectionService;
  ai: AiService;
};

export function getContainer(): AppContainer {
  if (!container) {
    const storeRepo = new PrismaStoreRepository(prisma);
    const orderConnector = new ShopifyOrderConnector({
      getAdminClient: createAdminClientForStore,
    });

    container = {
      storeRepo,
      conversationRepo: new PrismaConversationRepository(prisma),
      returnRepo: new PrismaReturnRepository(prisma),
      analyticsRepo: new PrismaAnalyticsRepository(prisma),
      orderTracking: new OrderTrackingService(orderConnector),
      returnCollection: new ReturnCollectionService(
        new PrismaReturnRepository(prisma),
      ),
      ai: new AiService(),
    };
  }
  return container;
}
