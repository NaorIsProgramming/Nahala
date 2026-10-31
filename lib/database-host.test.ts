import { describe, expect, it } from "vitest";

import { databaseHosts, isLocalDatabaseUrl } from "@/lib/database-host";

describe("database host", () => {
  it("accepts localhost and loopback", () => {
    expect(isLocalDatabaseUrl("postgres://user:pw@127.0.0.1:5432/nahala")).toBe(true);
    expect(isLocalDatabaseUrl("postgres://user:pw@localhost/nahala")).toBe(true);
  });

  it("refuses a remote host, a mixed host list, and a fragment that only looks local", () => {
    expect(isLocalDatabaseUrl("postgres://user:pw@example.com/nahala")).toBe(false);
    expect(isLocalDatabaseUrl("postgres://user:pw@127.0.0.1,example.com/nahala")).toBe(
      false,
    );
    expect(isLocalDatabaseUrl("postgres://user:pw@evil.com/nahala#@127.0.0.1")).toBe(
      false,
    );
    expect(isLocalDatabaseUrl("")).toBe(false);
    expect(databaseHosts("postgres://user:pw@127.0.0.1/nahala#@evil.com")).toEqual([
      "127.0.0.1",
    ]);
  });
});
