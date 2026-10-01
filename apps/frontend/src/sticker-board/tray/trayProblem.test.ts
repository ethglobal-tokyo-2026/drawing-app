import { describe, expect, it } from "vitest";
import { trayProblemKey, type TrayProblem } from "./trayProblem";

const problem = (overrides: Partial<TrayProblem> = {}): TrayProblem => ({
  kind: "cut",
  nos: [143],
  reason: "Couldn't read it",
  detail: "Canvas 2D context unavailable",
  ...overrides,
});

describe("trayProblemKey", () => {
  it("is shared by problems that say the same thing, and differs when any part of one does", () => {
    const key = trayProblemKey(problem());
    expect(trayProblemKey(problem())).toBe(key);

    // A failure that isn't the API's has one reason for every cause, so only its detail tells two apart.
    const differing: Partial<TrayProblem>[] = [
      { kind: "place" },
      { nos: [143, 144] },
      { reason: "Not now" },
      { detail: "Another English" },
    ];
    for (const change of differing) expect(trayProblemKey(problem(change))).not.toBe(key);
  });
});
