import "server-only";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

const SECRETS_OVERRIDE_MESSAGE =
  "Unset BETTER_AUTH_SECRETS. This app signs sessions with BETTER_AUTH_SECRET only, and Better Auth would use BETTER_AUTH_SECRETS instead.";

const PRODUCTION_URL_MESSAGE =
  "Invalid environment variable: BETTER_AUTH_URL must start with https:// when NODE_ENV is production";

function invalidVariableNames(issues: { path: PropertyKey[] }[]): string {
  const names = new Set<string>();
  for (const issue of issues) {
    const key = issue.path[0];
    names.add(typeof key === "string" ? key : "environment");
  }
  return [...names].join(", ");
}

/**
 * A non-empty BETTER_AUTH_SECRETS is set. Empty is ignored by Better Auth
 * (`parseSecretsEnv` returns null). The value is never copied into a message:
 * a Zod issue would include the raw input.
 */
function isSecretsOverrideSet(value: string | undefined): boolean {
  return value !== undefined && value.length > 0;
}

/**
 * `next build` sets NODE_ENV to production and does not serve traffic, and
 * the local URL is still http. The Secure cookie follows the https:// prefix
 * only on the running server, so the build phase stays exempt.
 */
function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  );
}

/**
 * Shape check only. Does not open a connection and does not read
 * POSTGRES_PASSWORD. The thrown message names the variable and omits the
 * value, because a Zod issue includes the raw input.
 */
export function getEnv(): AppEnv {
  if (cached) {
    return cached;
  }

  const problems: string[] = [];

  if (isSecretsOverrideSet(process.env.BETTER_AUTH_SECRETS)) {
    problems.push(SECRETS_OVERRIDE_MESSAGE);
  }

  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  });

  if (!parsed.success) {
    problems.push(
      `Invalid environment variable: ${invalidVariableNames(parsed.error.issues)}`,
    );
    throw new Error(problems.join(" "));
  }

  if (
    isProductionRuntime() &&
    !parsed.data.BETTER_AUTH_URL.startsWith("https://")
  ) {
    problems.push(PRODUCTION_URL_MESSAGE);
  }

  if (problems.length > 0) {
    throw new Error(problems.join(" "));
  }

  cached = parsed.data;
  return cached;
}
