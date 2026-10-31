const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * Hosts postgres.js can dial. A comma after the first `@` selects those
 * hosts, not `URL.hostname`. Otherwise the WHATWG hostname is used, so a
 * `#` fragment cannot hide a remote host. The password is never read.
 */
export function databaseHosts(databaseUrl: string): string[] | undefined {
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

export function isLocalDatabaseUrl(databaseUrl: string): boolean {
  const hosts = databaseHosts(databaseUrl);
  return (
    hosts !== undefined &&
    hosts.length > 0 &&
    hosts.every((host) => LOCAL_HOSTS.has(host))
  );
}
