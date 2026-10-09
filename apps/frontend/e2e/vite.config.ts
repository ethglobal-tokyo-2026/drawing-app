import { defineConfig, mergeConfig } from "vite";
import appConfig from "../vite.config.ts";
import { E2E_API_PORT, E2E_APP_PORT } from "./ports.ts";

// The app's own dev server, on the end-to-end suite's ports, so it runs beside `pnpm dev`.
export default mergeConfig(
  appConfig,
  defineConfig({
    server: {
      port: E2E_APP_PORT,
      strictPort: true,
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${E2E_API_PORT}`,
          // WebKit drops a Secure cookie on http://localhost, so the session cookie reaches the
          // suite's browsers without the flag. The API still sets it.
          configure: (proxy) =>
            proxy.on("proxyRes", (res) => {
              res.headers["set-cookie"] = res.headers["set-cookie"]?.map((cookie) =>
                cookie.replace(/;\s*secure(?=;|$)/i, ""),
              );
            }),
        },
      },
    },
  }),
);
