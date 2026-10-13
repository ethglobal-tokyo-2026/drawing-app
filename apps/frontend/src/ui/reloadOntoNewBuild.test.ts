// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { reloadOntoNewBuild } from "./reloadOntoNewBuild";
import { BoardPlacementSaves } from "../sticker-board/boardPlacementSaves";
import { emptyApi, TEST_ME } from "../api/testing";
import { sessionEnvelope } from "../api/sessionTestFixtures";
import { acceptSession, currentSelection, suspendSession } from "../api/sessionContext";

// WebKit, every iPhone's LINE browser, words every failed import this way, whichever chunk it was.
const failedImport = () => {
  const event = new Event("vite:preloadError", { cancelable: true });
  return Object.assign(event, { payload: new TypeError("Importing a module script failed.") });
};

const reload = vi.fn<() => void>();

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(location, "reload").mockImplementation(reload);
});

afterEach(() => {
  vi.restoreAllMocks();
  reload.mockReset();
});

describe("reloading onto the new build", () => {
  it("leaves an already-attempted build failure visible without freezing an owner whose positions cannot be preserved", async () => {
    // This is the fresh page after an earlier automatic reload landed on the same build.
    vi.resetModules();
    const [{ beforeAccountRelease }, buildReload] = await Promise.all([
      import("../api/sessionLoss"),
      import("./reloadOntoNewBuild"),
    ]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    sessionStorage.setItem("draw.reloadedFrom", "/assets/already-attempted.js");
    acceptSession(sessionEnvelope(TEST_ME, { selectionVersion: "first" }));
    const saves = new BoardPlacementSaves(emptyApi(), "me", {
      getItem: () => null,
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {},
    });
    saves.save(
      { id: "sticker-a", no: 42 },
      { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
    );
    const stop = beforeAccountRelease({
      userId: "me",
      preservationError: () => saves.read().preservationError,
      retryPreservation: () => saves.retryPreservation(),
      blocked: suspendSession,
    });
    onTestFinished(() => {
      stop();
      suspendSession();
    });
    const repeated = failedImport();
    buildReload.reloadOntoNewBuild(repeated, "/assets/already-attempted.js");
    expect(reload).not.toHaveBeenCalled();
    expect(repeated.defaultPrevented).toBe(false);
    expect(buildReload.reloadingOntoNewBuild()).toBe(false);
    expect(currentSelection()).toEqual({ userId: "me", selectionVersion: "first" });
    expect(saves.pendingSpots().get("sticker-a")?.phone?.x).toBe(0.5);
  });
  it("reloads once per build, however alike the failures read", () => {
    const first = failedImport();
    reloadOntoNewBuild(first, "/assets/index-a.js");
    expect(first.defaultPrevented).toBe(true);

    // The reload landed on the same build: another reload wouldn't help.
    const again = failedImport();
    reloadOntoNewBuild(again, "/assets/index-a.js");
    expect(again.defaultPrevented).toBe(false);

    // A later deploy, in the same tab session.
    reloadOntoNewBuild(failedImport(), "/assets/index-b.js");
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
