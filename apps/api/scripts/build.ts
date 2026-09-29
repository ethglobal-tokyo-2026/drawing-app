// Bundles the REST API as dist/server.mjs. better-sqlite3 and sharp stay out of the bundle: they're native, so
// deploy/deploy-api.sh installs the box's own builds beside it.
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

await build({
  entryPoints: { server: path("../src/server.ts") },
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
