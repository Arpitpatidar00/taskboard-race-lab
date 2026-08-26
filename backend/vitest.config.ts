import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["../tests/backend/**/*.test.ts"],
    environment: "node",
  },
});
