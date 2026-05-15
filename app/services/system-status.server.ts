import type { SyncLog, SyncResource, SyncStatus } from "@prisma/client";
import prisma from "~/db.server";

export type DatabaseHealth = {
  ok: boolean;
  message?: string;
};

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return { ok: false, message };
  }
}

export type LastSyncInfo = {
  resource: SyncResource;
  status: SyncStatus | "none";
  message: string | null;
  finishedAt: string | null;
};

export type SystemStatus = {
  databaseConnected: boolean;
  databaseMessage?: string;
  storeConnected: boolean;
  widgetEnabled: boolean;
  lastProductSync: LastSyncInfo;
  lastOrderSync: LastSyncInfo;
};

function mapSyncLog(
  resource: SyncResource,
  log: SyncLog | null,
): LastSyncInfo {
  if (!log) {
    return { resource, status: "none", message: null, finishedAt: null };
  }
  return {
    resource,
    status: log.status,
    message: log.message,
    finishedAt: log.finishedAt?.toISOString() ?? null,
  };
}

export async function getSystemStatus(
  storeId: string,
  store: { status: string; widgetEnabled: boolean },
): Promise<SystemStatus> {
  const db = await checkDatabaseHealth();

  const [productLog, orderLog] = await Promise.all([
    prisma.syncLog.findFirst({
      where: { storeId, resource: "PRODUCTS" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.syncLog.findFirst({
      where: { storeId, resource: "ORDERS" },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  return {
    databaseConnected: db.ok,
    databaseMessage: db.ok ? undefined : db.message,
    storeConnected: store.status === "ACTIVE",
    widgetEnabled: store.widgetEnabled,
    lastProductSync: mapSyncLog("PRODUCTS", productLog),
    lastOrderSync: mapSyncLog("ORDERS", orderLog),
  };
}
