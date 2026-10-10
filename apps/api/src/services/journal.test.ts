import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, MAX_SERVER_LOG_LINES, SERVER_LOG_LINES } from "../app.ts";
import { createTestApp } from "../testing/createTestApp.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { refusalOf } from "../testing/responses.ts";
import { createJournalLog, JOURNALCTL_TIMEOUT_MS } from "./journal.ts";

/** A journalctl that prints each of its arguments on a line. */
const PRINTS_ITS_ARGUMENTS = `printf '%s\\n' "$@"`;
/** A journalctl that prints until its reader lets go, as one with a long log does. */
const PRINTS_UNTIL_LET_GO = "while :; do echo line; done";

let logs: LogLines;
let binDir: string | undefined;

beforeEach(() => {
  logs = captureLogLines();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  if (binDir) rmSync(binDir, { recursive: true });
  binDir = undefined;
});

/** Makes a directory the whole PATH, holding a journalctl that runs `script` if there is one. */
function journalctlOnPath(script?: string) {
  binDir = mkdtempSync(join(tmpdir(), "drawing-app-journalctl-"));
  if (script !== undefined) {
    writeFileSync(join(binDir, "journalctl"), `#!/bin/sh\n${script}\n`, { mode: 0o755 });
  }
  vi.stubEnv("PATH", binDir);
}

/** The server as the box runs it, reading the log through journalctl. */
async function logServer() {
  const test = await createTestApp({ serverLog: createJournalLog() });
  return createServer(test.deps, tmpdir());
}

/** Asks for the log until journalctl is free to answer. */
const nextLog = (server: Awaited<ReturnType<typeof logServer>>) =>
  vi.waitFor(async () => {
    const response = await server.request("/api/logs");
    expect(response.status).toBe(200);
    return response;
  });

describe("the server log", () => {
  it("rejects where there's no journalctl, instead of the error taking the server down", async () => {
    journalctlOnPath();
    const log = createJournalLog();
    await expect(log(SERVER_LOG_LINES)).rejects.toThrow(/ENOENT/);
    // A journalctl that never started doesn't hold the log from the next request.
    await expect(log(SERVER_LOG_LINES)).rejects.toThrow(/ENOENT/);
  });

  it("asks journalctl for the newest SERVER_LOG_LINES lines, or up to MAX_SERVER_LOG_LINES", async () => {
    journalctlOnPath(PRINTS_ITS_ARGUMENTS);
    const server = await logServer();
    const linesAskedFor = async (path: string) =>
      (await (await server.request(path)).text())
        .split("\n")
        .filter((arg) => arg.startsWith("--lines="));

    expect(await linesAskedFor("/api/logs")).toEqual([`--lines=${SERVER_LOG_LINES}`]);
    expect(await linesAskedFor(`/api/logs?lines=${MAX_SERVER_LOG_LINES}`)).toEqual([
      `--lines=${MAX_SERVER_LOG_LINES}`,
    ]);
    expect(
      await refusalOf(await server.request(`/api/logs?lines=${MAX_SERVER_LOG_LINES + 1}`)),
    ).toMatchObject({ status: 400, error: "invalid_request" });
  });

  it("runs one journalctl at a time, answering 503 until its reader lets go", async () => {
    journalctlOnPath(PRINTS_UNTIL_LET_GO);
    const server = await logServer();
    const first = await server.request("/api/logs");
    expect(first.status).toBe(200);
    const busy = await server.request("/api/logs");
    // A second log would never end, so its status is checked before its body is read.
    expect(busy.status).toBe(503);
    expect(await refusalOf(busy)).toMatchObject({ error: "server_log_busy" });

    await first.body?.cancel();
    await (await nextLog(server)).body?.cancel();
  });

  it("fails the log of a journalctl that exits with an error, rather than ending it as the whole log", async () => {
    journalctlOnPath("echo line; exit 1");
    const server = await logServer();
    const failed = await server.request("/api/logs");
    expect(failed.status).toBe(200);
    await expect(failed.text()).rejects.toThrow(/journalctl exited with 1/);
    logs.expectLogged("server_log.failed");
    await (await nextLog(server)).body?.cancel();
  });

  it("stops a journalctl whose reader stalls, once it runs past JOURNALCTL_TIMEOUT_MS", async () => {
    journalctlOnPath(PRINTS_UNTIL_LET_GO);
    const server = await logServer();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const stalled = await server.request("/api/logs");
    expect(stalled.status).toBe(200);

    await vi.advanceTimersByTimeAsync(JOURNALCTL_TIMEOUT_MS);
    logs.expectLogged("server_log.timed_out");
    // The cut-off log fails to arrive, rather than passing for the whole log.
    await expect(stalled.text()).rejects.toMatchObject({ name: "AbortError" });
    await (await nextLog(server)).body?.cancel();
  });
});
