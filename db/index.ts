import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "../lib/env";
import * as schema from "./schema";

/**
 * Development hot reload re-evaluates this module. The client stays on
 * globalThis so a reload reuses the pool. Production loads this module
 * once per process, so it does not keep a second reference.
 */
declare global {
  var nahalaPostgres: ReturnType<typeof postgres> | undefined;
}

function getPostgresClient(): ReturnType<typeof postgres> {
  if (globalThis.nahalaPostgres) {
    return globalThis.nahalaPostgres;
  }

  // One process. 10 leaves room under Postgres max_connections (100).
  const client = postgres(getEnv().DATABASE_URL, { max: 10 });

  if (process.env.NODE_ENV !== "production") {
    globalThis.nahalaPostgres = client;
  }

  return client;
}

export const db = drizzle({
  client: getPostgresClient(),
  schema,
});
