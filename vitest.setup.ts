import { isLocalDatabaseUrl } from "./lib/database-host";

if (!isLocalDatabaseUrl(process.env.DATABASE_URL ?? "")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL host must be localhost or 127.0.0.1.",
  );
}
