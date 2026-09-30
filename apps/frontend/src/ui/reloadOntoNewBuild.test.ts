// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reloadOntoNewBuild } from "./reloadOntoNewBuild";

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
