import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { journalLog } from "./journal.ts";

describe("journalLog", () => {
  let emptyDir: string | undefined;
  afterEach(() => {
    vi.unstubAllEnvs();
    if (emptyDir) rmSync(emptyDir, { recursive: true });
  });

  it("rejects where there's no journalctl, instead of the error taking the server down", async () => {
    emptyDir = mkdtempSync(join(tmpdir(), "drawing-app-no-journalctl-"));
    vi.stubEnv("PATH", emptyDir);
    await expect(journalLog()).rejects.toThrow(/ENOENT/);
  });
});
