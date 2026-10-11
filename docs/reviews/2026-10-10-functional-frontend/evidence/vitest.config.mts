import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const frontend = fileURLToPath(new URL("../../../../apps/frontend/", import.meta.url));
const requireFrontend = createRequire(resolve(frontend, "package.json"));
const { defineConfig } = await import(requireFrontend.resolve("vite"));
const { default: react } = await import(requireFrontend.resolve("@vitejs/plugin-react"));
const evidence = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: frontend,
  plugins: [react()],
  resolve: {
    alias: {
      vitest: resolve(frontend, "node_modules/vitest"),
      react: resolve(frontend, "node_modules/react"),
      "react-dom": resolve(frontend, "node_modules/react-dom"),
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: [resolve(frontend, "src/testSetup.ts")],
    include: [resolve(evidence, "*.test.{ts,tsx}")],
  },
});
