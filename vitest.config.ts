import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "."),
      "server-only": path.resolve(root, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    setupFiles: ["./vitest.setup.ts"],
  },
});
