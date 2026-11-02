/** Only a pallet-set path may be used to send the user back after creating a name. */
export function safePalletSetReturn(value: string | undefined): string | null {
  if (value === undefined || !value.startsWith("/app/pallet-sets")) {
    return null;
  }
  if (value.includes("..") || value.includes("\\") || value.includes("//")) {
    return null;
  }
  try {
    const url = new URL(value, "http://nahala.local");
    if (url.origin !== "http://nahala.local" || !url.pathname.startsWith("/app/pallet-sets")) {
      return null;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function withCreatedName(returnTo: string, field: string, id: string): string {
  const url = new URL(returnTo, "http://nahala.local");
  if (field === "grower") {
    url.searchParams.set("grower", id);
  } else {
    url.searchParams.set("createdField", field);
    url.searchParams.set("createdId", id);
  }
  return `${url.pathname}${url.search}`;
}
