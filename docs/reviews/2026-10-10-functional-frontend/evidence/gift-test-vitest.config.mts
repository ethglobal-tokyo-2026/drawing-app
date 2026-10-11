import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import shared from "./vitest.config.mts";

const frontend = fileURLToPath(new URL("../../../../apps/frontend/", import.meta.url));

export default {
  ...shared,
  plugins: [
    ...shared.plugins,
    {
      name: "review-heart-never-disappears",
      enforce: "pre",
      transform(source, id) {
        if (
          process.env.CROQUIS_GIFT_TEST_KEEP_HEART_VISIBLE !== "1" ||
          !id.endsWith("/gratitude/heartMotion.ts")
        )
          return;
        const original = "        opacity,";
        if (!source.includes(original)) throw new Error("Review mutation target changed");
        return source.replace(original, "        opacity: Math.max(0.001, opacity),");
      },
    },
  ],
  test: {
    ...shared.test,
    environment: "node",
    pool: "threads",
    include: [resolve(frontend, "src/gratitude/heartMotion.test.ts")],
    testTimeout: 100,
  },
};
