import { mergeConfig } from "vite";
import appConfig from "./vite.config.ts";

// A demo on a phone: React's production build, quick through an HTTPS tunnel, with LIFF Mock and the
// developer slip kept in, in front of the API's `demo` script. DEV switches only those two, and their
// VITE_ values are pinned, so a real-LINE .env can't turn either off.
export default mergeConfig(appConfig, {
  define: {
    "import.meta.env.DEV": "true",
    "import.meta.env.VITE_LIFF_MOCK": JSON.stringify("on"),
    "import.meta.env.VITE_DEV_SLIP": JSON.stringify("on"),
  },
  build: { outDir: "dist-demo", emptyOutDir: true },
  preview: {
    host: "127.0.0.1",
    port: 5186,
    strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:8785" } },
  },
});
