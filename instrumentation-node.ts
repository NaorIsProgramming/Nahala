/**
 * Node-only startup check. Next.js compiles `instrumentation.ts` for Edge
 * as well, and `process.exit` is not an Edge API, so the shutdown stays here.
 *
 * Installed Next.js 16.4 skips `register()` during `next build` and awaits
 * it before a route runs. Exiting refuses the request instead of rendering
 * the error and its stack as a page.
 */
export async function registerNode(): Promise<void> {
  const { getEnv } = await import("./lib/env");
  try {
    getEnv();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid environment";
    console.error(message);
    process.exit(1);
  }
}
