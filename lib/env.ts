import "server-only";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

function invalidVariableNames(issues: { path: PropertyKey[] }[]): string {
  const names = new Set<string>();
  for (const issue of issues) {
    const key = issue.path[0];
    names.add(typeof key === "string" ? key : "environment");
  }
  return [...names].join(", ");
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

  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid environment variable: ${invalidVariableNames(parsed.error.issues)}`,
    );
  }

  cached = parsed.data;
  return cached;
}
