function postgresErrorCode(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current);
    if (
      "code" in current &&
      typeof current.code === "string" &&
      /^\d{5}$/.test(current.code)
    ) {
      return current.code;
    }

    current = "cause" in current ? current.cause : undefined;
  }

  return undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  return postgresErrorCode(error) === "23505";
}

export function isCheckViolation(error: unknown): boolean {
  return postgresErrorCode(error) === "23514";
}

export function logPostgresFailure(label: string, error: unknown): void {
  console.error(label, postgresErrorCode(error) ?? "unknown");
}
