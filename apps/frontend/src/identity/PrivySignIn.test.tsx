// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Privy's SDK stands in as a marker: what's tested is when it loads, not what it does.
const loadedSdk = vi.hoisted(() => vi.fn());
const sdkFailure = vi.hoisted(() => ({ render: false }));
vi.mock("./PrivySession", () => {
  loadedSdk();
  return {
    default: () => {
      if (sdkFailure.render) throw new Error("Wallet provider failed to initialize");
      return "privy";
    },
  };
});

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // Privy starts once per page load, and the LIFF Mock switch is read as the module loads.
  vi.resetModules();
  loadedSdk.mockClear();
  sdkFailure.render = false;
  vi.stubEnv("VITE_LIFF_MOCK", "off");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  performance.clearMarks();
});

async function openApp() {
  const [{ PrivySignIn }, privyStart, suiWallet] = await Promise.all([
    import("./PrivySignIn"),
    import("./privyStart"),
    import("./suiWallet"),
  ]);
  await act(async () => root.render(<PrivySignIn />));
  const settle = () => act(() => vi.dynamicImportSettled());
  return { ...privyStart, ...suiWallet, settle };
}

/** How many times Privy started for `why`, as the performance recording saw it. */
const startsFor = (why: string) => performance.getEntriesByName(`privy-start:${why}`).length;

describe("PrivySignIn", () => {
  it("leaves Privy's SDK unloaded until Privy starts, then loads it once", async () => {
    const app = await openApp();
    await app.settle();
    expect(loadedSdk).not.toHaveBeenCalled();
    expect(host.textContent).toBe("");

    act(() => app.startPrivy("board-settled"));
    await app.settle();
    expect(host.textContent).toBe("privy");

    // Already started: nothing mounts twice, and the first reason stays.
    act(() => app.startPrivy("gift-link"));
    await app.settle();
    expect(loadedSdk).toHaveBeenCalledOnce();
    expect(startsFor("board-settled")).toBe(1);
    expect(startsFor("gift-link")).toBe(0);
  });

  it("starts at once when sealing, giving or receiving waits for the wallet", async () => {
    const app = await openApp();
    await act(async () => {
      void app.waitForSuiAddress().catch(() => {});
      await vi.dynamicImportSettled();
    });
    expect(startsFor("wallet-needed")).toBe(1);
    expect(host.textContent).toBe("privy");
  });

  it("shows Reload after a thrown wallet provider and reloads from the address paper", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal("location", { reload });
    sdkFailure.render = true;
    const [
      { PrivySignIn },
      { startPrivy },
      { privyStatus, resetPrivySignIn },
      { useSuiAddress },
      { AddressPapers },
      { acceptSession },
      { sessionEnvelope },
      { TEST_ME },
    ] = await Promise.all([
      import("./PrivySignIn"),
      import("./privyStart"),
      import("./privy"),
      import("../sticker-board/stat-board/addresses"),
      import("../sticker-board/stat-board/AddressPapers"),
      import("../api/sessionContext"),
      import("../api/sessionTestFixtures"),
      import("../api/testing"),
    ]);
    acceptSession(sessionEnvelope(TEST_ME));
    function YourAddressPaper() {
      return (
        <AddressPapers sui={useSuiAddress()} lifted={false} paperRef={null} onOpen={() => {}} />
      );
    }
    await act(async () =>
      root.render(
        <>
          <PrivySignIn />
          <YourAddressPaper />
        </>,
      ),
    );
    act(() => startPrivy("wallet-needed"));
    await act(() => vi.dynamicImportSettled());
    expect(privyStatus()).toMatchObject({ state: "failed", reloadRequired: true });

    resetPrivySignIn();
    expect(privyStatus()).toMatchObject({ state: "failed", reloadRequired: true });
    expect(reload).not.toHaveBeenCalled();
    const reloadAction = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Reload",
    );
    expect(reloadAction).toBeDefined();
    act(() => reloadAction?.click());
    expect(reload).toHaveBeenCalledOnce();
  });

  it("marks a rejected lazy import as needing reload", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.doMock("./PrivySession", () => {
      throw new Error("Privy code did not load");
    });
    const app = await openApp();
    act(() => app.startPrivy("wallet-needed"));
    await app.settle();
    const { privyStatus } = await import("./privy");
    expect(privyStatus()).toMatchObject({ state: "failed", reloadRequired: true });
  });
});
