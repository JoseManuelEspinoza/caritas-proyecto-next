import { defineConfig } from "vitest/config";
import path from "path";

// globals: false — all tests import { describe, test, expect } from 'vitest' explicitly,
// so globals are not needed and don't clash with `next build` typechecking.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "tests/__mocks__/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.{test,spec}.ts", "core/**/*.test.ts", "app/**/*.test.ts"],
  },
});
