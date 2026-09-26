// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// LINE as each test needs it to behave.
const liff = vi.hoisted(() => ({
  init: vi.fn<() => Promise<void>>(),
  isLoggedIn: vi.fn(() => true),
  isInClient: vi.fn(() => true),
  getProfile: vi.fn(async () => ({ userId: "U1", displayName: "Bob Tanaka" })),
}));
vi.mock("@line/liff", () => ({ default: liff }));

let host: HTMLDivElement;
let root: Root;

/** A fresh start of LINE (it starts once per page), with the gate rendered over a stand-in app. */
async function openApp() {
  vi.resetModules();
  const { initLine } = await import("./liff");
  const { LineGate } = await import("./LineGate");
  void initLine();
  await act(async () => {
    root.render(
      <LineGate>
        <p>{"board"}</p>
      </LineGate>,
    );
  });
}

const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("VITE_LIFF_MOCK", "off");
  vi.spyOn(console, "error").mockImplementation(() => {});
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("LineGate", () => {
  it("opens the app for a logged-in LINE user", async () => {
    liff.init.mockResolvedValue();
    await openApp();
    await settle();
    expect(host.textContent).toBe("board");
  });

  it("asks a browser outside LINE to log in", async () => {
    liff.init.mockResolvedValue();
    liff.isLoggedIn.mockReturnValueOnce(false);
    await openApp();
    await settle();
    expect(host.textContent).toContain("Log in with LINE");
  });

  it("says it's opening while LINE starts, and ends a start LINE never answers on the error screen", async () => {
    liff.init.mockReturnValue(new Promise(() => {}));
    await openApp();
    expect(host.querySelector('[role="status"]')?.textContent).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(host.textContent).toContain("LINE didn’t start");
    expect(host.textContent).toContain("Try again");
  });

  it("names LIFF's error code with the reason", async () => {
    liff.init.mockRejectedValue(
      Object.assign(new Error("channel not found"), { code: "INIT_FAILED" }),
    );
    await openApp();
    await settle();
    expect(host.textContent).toContain("INIT_FAILED: channel not found");
  });
});
