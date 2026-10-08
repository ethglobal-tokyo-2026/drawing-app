import { mergeConfig } from "vite";
import appConfig from "../vite.config.ts";
import { E2E_API_PORT, E2E_APP_PORT } from "./ports.ts";

// The app's own dev server, on the end-to-end suite's ports, so it runs beside `pnpm dev`.
export default mergeConfig(appConfig, {
  server: {
    port: E2E_APP_PORT,
    strictPort: true,
    proxy: { "/api": { target: `http://127.0.0.1:${E2E_API_PORT}` } },
  },
});
