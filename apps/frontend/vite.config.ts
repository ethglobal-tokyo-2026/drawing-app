import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // HTTPS tunnels for testing inside LINE on a phone. A leading dot allows
    // any subdomain, so a new ngrok URL doesn't need a config change.
    allowedHosts: [".ngrok-free.app", ".ngrok.app", ".trycloudflare.com"],
  },
});
