import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { auth } from "@/lib/auth";

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export const getSession = cache(async (): Promise<Session> => {
  return auth.api.getSession({
    headers: await headers(),
  });
});
