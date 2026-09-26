import { spawn } from "node:child_process";
import { once } from "node:events";
import { Readable } from "node:stream";
import type { ServerLog } from "../deps.ts";

/** The box's units whose journal is the server log: this API, and the LINE → Privy auth server. */
const UNITS = ["drawing-api", "sticker-auth"];

/** The server log as the box's journal keeps it, printed by journalctl. */
export const journalLog: ServerLog = async () => {
  const journalctl = spawn(
    "journalctl",
    [...UNITS.map((unit) => `--unit=${unit}`), "-o", "short-iso"],
    {
      // journalctl's own complaints, such as a journal it can't read, go to the API's log.
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  // Off the box there's no journalctl: this rejects before any of the answer is sent.
  await once(journalctl, "spawn");
  return Readable.toWeb(journalctl.stdout);
};
