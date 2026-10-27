// `auth generate` cannot load this file while the server-only import is present.
// Remove it only for that command, then restore it.
import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as authSchema from "@/db/schema/auth";
import { getEnv } from "@/lib/env";

const env = getEnv();
const authOrigin = new URL(env.BETTER_AUTH_URL).origin;

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [authOrigin],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  advanced: {
    database: {
      joins: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
  rateLimit: {
    enabled: true,
    storage: "memory",
    customRules: {
      "/sign-in/email": {
        window: 10,
        max: 3,
      },
      "/sign-up/email": {
        window: 10,
        max: 3,
      },
    },
  },
  plugins: [nextCookies()],
});
