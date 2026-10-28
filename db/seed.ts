import { stdin, stdout } from "node:process";

const MIN_PASSWORD_LENGTH = 12;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/**
 * Hosts postgres.js can dial. A comma after the first `@` selects those
 * hosts, not `URL.hostname`. Otherwise the WHATWG hostname is used, so a
 * `#` fragment cannot hide a remote host. The password is never read.
 */
function databaseHosts(databaseUrl: string): string[] | undefined {
  const schemeIndex = databaseUrl.indexOf("://");
  if (schemeIndex === -1) {
    return undefined;
  }

  const afterScheme = databaseUrl.slice(schemeIndex + 3);
  const authorityEnd = afterScheme.search(/[?/]/);
  const authority =
    authorityEnd === -1 ? afterScheme : afterScheme.slice(0, authorityEnd);
  const at = authority.indexOf("@");
  let driverHost = at === -1 ? authority : authority.slice(at + 1);

  try {
    driverHost = decodeURIComponent(driverHost);
  } catch {
    return undefined;
  }

  if (driverHost.includes(",")) {
    const hosts = driverHost.split(",").map((part) => {
      if (part.startsWith("[")) {
        const end = part.indexOf("]");
        return end === -1 ? "" : part.slice(1, end);
      }

      const colon = part.indexOf(":");
      return colon === -1 ? part : part.slice(0, colon);
    });

    return hosts.length > 0 ? hosts : undefined;
  }

  try {
    const hostname = new URL(databaseUrl).hostname;
    return hostname.length > 0 ? [hostname] : undefined;
  } catch {
    return undefined;
  }
}

function assertLocalDatabase(): void {
  const hosts = databaseHosts(process.env.DATABASE_URL ?? "");
  const isLocal =
    hosts !== undefined &&
    hosts.length > 0 &&
    hosts.every((host) => LOCAL_HOSTS.has(host));

  if (!isLocal) {
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

  try {
    await auth.api.signUpEmail({
      body: {
        email,
        name: displayName(email),
        password,
      },
    });
  } catch (error: unknown) {
    if (isExistingUser(error)) {
      console.log(`User already exists: ${email}.`);
      process.exit(0);
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Invalid environment variable:")
    ) {
      fail(error.message);
    }

    fail("Sign-up failed.");
  }

  console.log(`Created user ${email}.`);
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
