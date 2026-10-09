import { fileURLToPath } from "node:url";

/** The suite's own database and sticker images, made fresh by each run; data/ is gitignored. */
export const E2E_DATA_DIR = fileURLToPath(new URL("../../../data/e2e", import.meta.url));

/** The database the suite's API serves. */
export const E2E_DATABASE = `${E2E_DATA_DIR}/drawing-app.db`;
