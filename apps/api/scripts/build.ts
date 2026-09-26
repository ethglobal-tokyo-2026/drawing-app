// Bundles the REST API into one ES module for the box. better-sqlite3 stays out of the bundle: it's native, so
// deploy/deploy-api.sh installs the box's own build beside it.
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

await build({
  entryPoints: [fileURLToPath(new URL("../src/server.ts", import.meta.url))],
  outfile: fileURLToPath(new URL("../dist/server.mjs", import.meta.url)),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  // In a bundle, import.meta.main is true everywhere, so migrate.ts's own entry check would migrate a second time.
  define: { "import.meta.main": "false" },
  external: ["better-sqlite3"],
  // The bundled CommonJS packages call require, which an ES module lacks.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "warning",
});
