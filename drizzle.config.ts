import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit push is only for a throwaway local database. It skips
 * migration files. Do not run it against nahala, and do not add a db:push
 * script. Apply schema changes with db:generate, then db:migrate.
 */
function migrateDatabaseUrl(): string {
  const url = process.env.MIGRATE_DATABASE_URL;
  if (!url) {
    throw new Error("Invalid environment variable: MIGRATE_DATABASE_URL");
  }
  return url;
}

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: migrateDatabaseUrl(),
  },
});
