import { defineConfig } from "vitest/config";

// lib/ holds vendored Solidity repositories with their own test suites, which aren't ours to run.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"] },
});
