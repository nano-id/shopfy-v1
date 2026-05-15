import type { LoaderFunctionArgs } from "react-router";
import { checkDatabaseHealth } from "~/services/system-status.server";

export const loader = async (_args: LoaderFunctionArgs) => {
  const db = await checkDatabaseHealth();

  const isProduction = process.env.NODE_ENV === "production";

  return Response.json(
    {
      ok: true,
      service: "shopify-support-ai",
      database: db.ok ? "ok" : "error",
      timestamp: new Date().toISOString(),
      ...(!db.ok && !isProduction && db.message
        ? { databaseMessage: db.message }
        : {}),
      ...(!db.ok && isProduction
        ? { databaseMessage: "Database unavailable" }
        : {}),
    },
    { status: 200 },
  );
};
