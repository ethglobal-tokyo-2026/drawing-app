import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { Readable } from "node:stream";
import type { ServerLog } from "../deps.ts";
import { logInfo } from "../diagnostics.ts";

/** The box's units whose journal is the server log: this API, and the LINE → Privy auth server. */
const UNITS = ["drawing-api", "sticker-auth"];

/** How long one journalctl may run before it's stopped, so a reader that stalls can't hold the log. */
export const JOURNALCTL_TIMEOUT_MS = 60_000;

/**
 * The server log as the box's journal keeps it, printed by journalctl: its newest `lines` lines,
 * newest first. Each line a process prints is its own journal entry, so a multi-line error reads
 * from its last line up. Anyone can ask, so one journalctl runs at a time; null while one does.
 */
export function createJournalLog(): ServerLog {
  let running: ChildProcess | null = null;
  return async (lines) => {
    if (running) return null;
    const journalctl = spawn(
      "journalctl",
      [
        ...UNITS.map((unit) => `--unit=${unit}`),
        `--lines=${lines}`,
        "--reverse",
        "-o",
        "short-iso",
      ],
      {
        // journalctl's own complaints, such as a journal it can't read, go to the API's log.
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
    running = journalctl;
    const timeout = setTimeout(() => {
      logInfo("server_log.timed_out");
      journalctl.kill();
      // The reader's answer fails, rather than ending as if it were the whole log.
      journalctl.stdout.destroy();
    }, JOURNALCTL_TIMEOUT_MS);
    const ended = () => {
      clearTimeout(timeout);
      if (running === journalctl) running = null;
    };
    // 'end' comes before the reader sees the end, so its next request finds journalctl free; 'close'
    // covers a reader that lets go first, and 'error' a journalctl that never started.
    journalctl.stdout.once("end", ended).once("close", ended);
    journalctl.once("error", ended);
    // Off the box there's no journalctl: this rejects before any of the answer is sent.
    await once(journalctl, "spawn");
    return Readable.toWeb(journalctl.stdout);
  };
}

/** The server log the API serves. */
export const journalLog = createJournalLog();
