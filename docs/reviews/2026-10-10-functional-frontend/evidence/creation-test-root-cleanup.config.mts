import { fileURLToPath } from "node:url";
import base from "./vitest.config.mts";

export default {
  ...base,
  test: {
    ...base.test,
    include: [fileURLToPath(new URL("./creation-test-root-cleanup.probe.ts", import.meta.url))],
  },
};
