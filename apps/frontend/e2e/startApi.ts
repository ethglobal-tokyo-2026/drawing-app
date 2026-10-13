import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { openDb, users } from "../../../packages/db/src/index.ts";
import { migrateDatabase } from "../../../packages/db/src/migrate.ts";
import { E2E_DATA_DIR, E2E_DATABASE } from "./dataDir.ts";
import { E2E_BIGWHEEL_ID, E2E_BIGWHEEL_LINE_ID, E2E_HANA_ID } from "./personPair.ts";

// Refuse any invocation that could wipe or seed a database other than the runner's explicit one.
if (process.env.DATABASE_URL !== E2E_DATABASE || resolve(E2E_DATA_DIR) === "/") {
  throw new Error("Browser API startup requires the isolated E2E database");
}
rmSync(E2E_DATA_DIR, { recursive: true, force: true });
mkdirSync(`${E2E_DATA_DIR}/images`, { recursive: true });
migrateDatabase(E2E_DATABASE);
const db = openDb(E2E_DATABASE);
try {
  db.insert(users)
    .values([
      {
        id: E2E_BIGWHEEL_ID,
        lineUserId: E2E_BIGWHEEL_LINE_ID,
        lineDisplayName: "Bigwheel",
        handle: "BIGWHEEL",
        language: "en",
      },
      {
        id: E2E_HANA_ID,
        lineUserId: "dev-video-hana",
        lineDisplayName: "Hana",
        handle: "Hana",
        language: "en",
      },
    ])
    .run();
} finally {
  db.$client.close();
}
// Startup validates the exact pair only after the isolated database contains its rows.
const serverModule = "../../api/src/server.ts";
await import(serverModule);
