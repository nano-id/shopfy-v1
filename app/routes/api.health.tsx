import type { LoaderFunctionArgs } from "react-router";
import { checkDatabaseHealth } from "~/services/system-status.server";

export const loader = async (_args: LoaderFunctionArgs) => {
  const db = await checkDatabaseHealth();

  return Response.json(
    {
      ok: true,
      service: "shopify-support-ai",
      database: db.ok ? "ok" : "error",
      timestamp: new Date().toISOString(),
      ...(db.ok ? {} : { databaseMessage: db.message }),
    },
    { status: 200 },
  );
};
