import { createAuthClient } from "better-auth/react";

// Same-origin `/api/auth`. Leaving baseURL unset keeps server env out of the browser bundle.
export const authClient = createAuthClient();
