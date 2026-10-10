import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/apiClient";
import { withBreakHints } from "../../i18n/i18n";
import { errors } from "../../i18n/strings/errors";
import { inLanguage } from "../../ui/testing";
import { trayProblemKey, trayProblemWords, type TrayProblem } from "./trayProblem";

const problem = (overrides: Partial<TrayProblem> = {}): TrayProblem => ({
  kind: "place",
  nos: [143],
  error: new Error("Canvas 2D context unavailable"),
  ...overrides,
});

describe("trayProblemKey", () => {
  it("is shared by problems that say the same thing, and differs when any part of one does", () => {
    const key = trayProblemKey(problem());
    expect(trayProblemKey(problem())).toBe(key);

    // A failure that isn't the API's has one reason for every cause, so only its detail tells two apart.
    const differing: Partial<TrayProblem>[] = [
      { kind: "cut" },
      { nos: [143, 144] },
      { error: new Error("Another English") },
      { error: new ApiError(0, { error: "network" }) },
    ];
    for (const change of differing) expect(trayProblemKey(problem(change))).not.toBe(key);
  });
});

describe("trayProblemWords", () => {
  it("says why in the app's language at the time it's read", async () => {
    const offline = problem({
      error: new ApiError(0, { error: "network", detail: "Failed to fetch" }),
    });
    expect(trayProblemWords(offline).reason).toBe(withBreakHints(errors.network.en));
    await inLanguage("ja");
    expect(trayProblemWords(offline).reason).toBe(withBreakHints(errors.network.ja));
  });
});
