import { expect, vi } from "vitest";
import { z } from "zod";
import type { DiagnosticFields, withRequestDiagnostics } from "../diagnostics.ts";

/** A structured log line, as logInfo and logFailure print it: its event, then its fields. */
const logEntry = z.looseObject({ event: z.string() });

/** What a line can hold besides its event: its own fields, and the request it was logged in. */
type LoggedFields = DiagnosticFields & Partial<Parameters<typeof withRequestDiagnostics>[0]>;

/**
 * Captures what the API logs to console.info and console.error. Call it in beforeEach, with
 * `vi.restoreAllMocks()` in afterEach to put console back. Printing anything but one JSON string
 * throws, so a line that isn't structured fails the test that printed it.
 */
export function captureLogLines() {
  const entries: z.infer<typeof logEntry>[] = [];
  const raw: string[] = [];
  const capture = (line: unknown) => {
    if (typeof line !== "string") throw new Error("Expected one structured log line");
    const entry = logEntry.parse(JSON.parse(line));
    raw.push(line);
    entries.push(entry);
  };
  vi.spyOn(console, "info").mockImplementation(capture);
  vi.spyOn(console, "error").mockImplementation(capture);
  return {
    /** Each line, parsed. */
    entries,
    /** Each line as printed, for checking what the log leaves out. */
    raw,
    /** Asserts a line logged `event` with `fields`, among any others it holds. */
    expectLogged(event: string, fields: LoggedFields = {}) {
      expect(entries).toContainEqual(expect.objectContaining({ event, ...fields }));
    },
  };
}

export type LogLines = ReturnType<typeof captureLogLines>;
