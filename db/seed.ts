import { stdin, stdout } from "node:process";

import { isLocalDatabaseUrl } from "../lib/database-host";

const MIN_PASSWORD_LENGTH = 12;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function assertLocalDatabase(): void {
  if (!isLocalDatabaseUrl(process.env.DATABASE_URL ?? "")) {
    fail(
      "Refusing to seed: DATABASE_URL host must be localhost or 127.0.0.1.",
    );
  }
}

function requireEmail(): string {
  const email = process.env.SEED_USER_EMAIL?.trim();
  if (!email) {
    fail("SEED_USER_EMAIL is required.");
  }

  return email;
}

function displayName(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  return local.length > 0 ? local : "user";
}

function promptHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    // Raw mode before the prompt so keystrokes are not echoed, including
    // input that arrives as soon as the prompt is visible.
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdout.write(prompt);

    let value = "";

    const onData = (chunk: string | Buffer) => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");

      for (const char of text) {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }

        if (char === "\u0003") {
          stdin.setRawMode(false);
          fail("Seed cancelled.");
        }

        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }

        value += char;
      }
    };

    stdin.on("data", onData);
  });
}

async function readPassword(): Promise<string> {
  const fromEnv = process.env.SEED_USER_PASSWORD;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }

  if (!stdin.isTTY) {
    fail("SEED_USER_PASSWORD is required.");
  }

  return promptHidden("Password: ");
}

function isExistingUser(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("body" in error)) {
    return false;
  }

  const body = error.body;
  if (typeof body !== "object" || body === null || !("code" in body)) {
    return false;
  }

  return body.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL";
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    fail("Refusing to seed when NODE_ENV is production.");
  }

  assertLocalDatabase();
  process.env.BOOTSTRAP_SIGN_UP = "1";

  const email = requireEmail();
  const password = await readPassword();
  delete process.env.SEED_USER_PASSWORD;
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail("Password must be at least 12 characters.");
  }

  const { auth } = await import("../lib/auth");
  const { db } = await import("./index");
  const { user } = await import("./schema");
  const { eq } = await import("drizzle-orm");
  const { ensureGlobalWriteGrant } = await import("../lib/seed-grant");

  try {
    await auth.api.signUpEmail({
      body: {
        email,
        name: displayName(email),
        password,
      },
    });
    console.log(`Created user ${email}.`);
  } catch (error: unknown) {
    if (!isExistingUser(error)) {
      if (
        error instanceof Error &&
        error.message.startsWith("Invalid environment variable:")
      ) {
        fail(error.message);
      }

      fail("Sign-up failed.");
    }

    console.log(`User already exists: ${email}.`);
  }

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  const userId = existing[0]?.id;
  if (!userId) {
    fail("Sign-up failed.");
  }

  try {
    const grant = await ensureGlobalWriteGrant(userId);
    console.log(
      grant === "inserted"
        ? "Added the global write grant."
        : "Global write grant already present.",
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "Could not store the global write grant."
    ) {
      fail(error.message);
    }

    fail("Could not store the global write grant.");
  }

  process.exit(0);
}

main().catch((error: unknown) => {
  if (
    error instanceof Error &&
    error.message.startsWith("Invalid environment variable:")
  ) {
    fail(error.message);
  }

  fail("Sign-up failed.");
});
