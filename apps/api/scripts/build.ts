// Bundles the REST API into one ES module for the box, and the one-off sticker WebP backfill beside it.
// better-sqlite3 and sharp stay out of the bundles: they're native, so deploy/deploy-api.sh installs the box's
// own builds beside them.
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

await build({
  entryPoints: {
    server: path("../src/server.ts"),
    "backfill-sticker-webp": path("./backfill-sticker-webp.ts"),
  },
  outdir: path("../dist"),
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  // In a bundle, import.meta.main is true everywhere, so migrate.ts's own entry check would migrate a second time.
  define: { "import.meta.main": "false" },
  external: ["better-sqlite3", "sharp"],
  // The bundled CommonJS packages call require, which an ES module lacks.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "warning",
});
