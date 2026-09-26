import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The live site, where the LINE → Privy auth server runs.
const LIVE_ORIGIN = "https://sticker.195-201-8-147.sslip.io";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // HTTPS tunnels for testing inside LINE on a phone. A leading dot allows
    // any subdomain, so a new ngrok URL doesn't need a config change.
    allowedHosts: [".ngrok-free.app", ".ngrok.app", ".trycloudflare.com"],
    // Against real LINE, the dev server trades ID tokens at the live auth server. It only answers the
    // app's own origin, so the proxy presents that.
    proxy: {
      "/v1/auth": { target: LIVE_ORIGIN, changeOrigin: true, headers: { origin: LIVE_ORIGIN } },
      // The REST API, which `pnpm dev` runs beside this server.
      "/api": { target: "http://127.0.0.1:8788" },
    },
  },
});
