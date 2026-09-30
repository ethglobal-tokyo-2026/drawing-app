// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Privy's SDK stands in as a marker: what's tested is when it loads, not what it does.
const loadedSdk = vi.hoisted(() => vi.fn());
vi.mock("./PrivySession", () => {
  loadedSdk();
  return { default: () => "privy" };
});

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // Privy starts once per page load, and the LIFF Mock switch is read as the module loads.
  vi.resetModules();
  loadedSdk.mockClear();
  vi.stubEnv("VITE_LIFF_MOCK", "off");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllEnvs();
  performance.clearMarks();
});

async function openApp() {
  const [{ PrivySignIn }, privyStart, smartWallet] = await Promise.all([
    import("./PrivySignIn"),
    import("./privyStart"),
    import("./smartWallet"),
  ]);
  await act(async () => root.render(<PrivySignIn />));
  const settle = () => act(() => vi.dynamicImportSettled());
  return { ...privyStart, ...smartWallet, settle };
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
    void app.waitForSmartWallet().catch(() => {});
    await app.settle();
    expect(startsFor("wallet-needed")).toBe(1);
    expect(host.textContent).toBe("privy");
  });
});
