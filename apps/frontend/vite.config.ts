import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The live site, where the LINE → Privy auth server runs.
const LIVE_ORIGIN = "https://stickeroo.art";

// The CDN in front of the box, which deploy/deploy.sh passes in: the build loads its hashed files from there.
// index.html and the public folder's files stay on the page's own origin, where LIFF and LINE open them by fixed paths.
const CDN_ORIGIN = process.env.CDN_ORIGIN || undefined;
if (CDN_ORIGIN && !(URL.canParse(CDN_ORIGIN) && new URL(CDN_ORIGIN).origin === CDN_ORIGIN)) {
  throw new Error(
    `CDN_ORIGIN must be an origin, such as https://example.cloudfront.net, not ${CDN_ORIGIN}`,
  );
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  experimental: {
    renderBuiltUrl: (filename, { type }) =>
      CDN_ORIGIN && type === "asset" ? `${CDN_ORIGIN}/${filename}` : undefined,
  },
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
