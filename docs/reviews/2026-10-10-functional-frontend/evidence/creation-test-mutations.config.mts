import { resolve } from "node:path";
import base from "./vitest.config.mts";

const mode = process.env.CREATION_TEST_MUTATION ?? "baseline";
const mutations = {
  transparent: {
    file: "/src/sticker-board/timelapse/timelapsePlayer.ts",
    from: "paintStroke(g, step.op, step.from, step.to)",
    to: 'paintStroke(g, { ...step.op, color: "#00000000" }, step.from, step.to)',
  },
  locks: {
    file: "/src/sticker-creation/session/keptSession.ts",
    from: ".request(dbName(this.userId), { steal: true }, () => held)",
    to: ".request(dbName(this.userId), { steal: false }, () => held)",
  },
};
if (mode !== "baseline" && !(mode in mutations)) throw new Error(`Unknown mutation ${mode}`);
const mutation = mutations[mode as keyof typeof mutations];

export default {
  ...base,
  plugins: [
    ...(base.plugins ?? []),
    {
      name: "creation-test-review-mutation",
      enforce: "pre" as const,
      transform(code: string, id: string) {
        if (!mutation || !id.endsWith(mutation.file)) return;
        if (code.split(mutation.from).length !== 2)
          throw new Error("Mutation target must match once");
        process.stderr.write(`Applied ${mode} mutation to ${id.slice(id.indexOf("/src/") + 1)}\n`);
        return code.replace(mutation.from, mutation.to);
      },
    },
  ],
  test: {
    ...base.test,
    include: [
      resolve(base.root!, "src/sticker-board/timelapse/timelapsePlayer.test.ts"),
      resolve(base.root!, "src/sticker-creation/session/keptSession.test.ts"),
    ],
  },
};
