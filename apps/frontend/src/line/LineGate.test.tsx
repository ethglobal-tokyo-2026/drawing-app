// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../i18n/i18n";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// LINE as each test needs it to behave.
const liff = vi.hoisted(() => ({
  init: vi.fn<() => Promise<void>>(),
  isLoggedIn: vi.fn(() => true),
  isInClient: vi.fn(() => true),
  getDecodedIDToken: vi.fn<() => { sub?: string; name?: string; picture?: string } | null>(
    () => null,
  ),
  getProfile: vi.fn<() => Promise<{ userId: string; displayName: string; pictureUrl?: string }>>(
    async () => ({ userId: "U1", displayName: "Bob Tanaka" }),
  ),
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
        <p>board</p>
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

afterEach(async () => {
  act(() => root.unmount());
  host.remove();
  await i18next.changeLanguage("en");
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

  it("asks in Japanese to log in with LINE", async () => {
    liff.init.mockResolvedValue();
    liff.isLoggedIn.mockReturnValueOnce(false);
    await openApp();
    await settle();
    // After openApp, whose fresh import of the gate starts i18next again in English.
    await act(() => i18next.changeLanguage("ja"));
    expect(host.textContent).toContain("LINEでログイン");
  });

  it("says it's opening while LINE starts, and ends a start LINE never answers on the error screen", async () => {
    liff.init.mockReturnValue(new Promise(() => {}));
    await openApp();
    expect(host.querySelector('[role="status"]')?.textContent).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(host.textContent).toContain("LINE didn’t start");
    expect(host.textContent).toContain("Try again");
  });

  it("opens with the ID token's name and picture without waiting for LINE's profile, then takes the profile", async () => {
    liff.init.mockResolvedValue();
    liff.getDecodedIDToken.mockReturnValueOnce({
      sub: "U1",
      name: "Bob",
      picture: "https://p/bob",
    });
    let answer = (_: { userId: string; displayName: string; pictureUrl?: string }) => {};
    liff.getProfile.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    vi.resetModules();
    const { initLine, useLine } = await import("./liff");
    const { LineGate } = await import("./LineGate");
    function Named() {
      const line = useLine();
      return line.status === "ready" ? `${line.profile.userId} ${line.profile.displayName}` : null;
    }
    void initLine();
    await act(async () => {
      root.render(
        <LineGate>
          <Named />
        </LineGate>,
      );
    });
    await settle();
    expect(host.textContent).toBe("U1 Bob");
    answer({ userId: "U1", displayName: "Bob Tanaka", pictureUrl: "https://p/bob" });
    await settle();
    expect(host.textContent).toBe("U1 Bob Tanaka");
  });

  it("says in the app's language that LINE didn't answer, when its start times out", async () => {
    liff.init.mockReturnValue(new Promise(() => {}));
    await openApp();
    const { START_TIMEOUT_MS } = await import("./liff");
    await act(() => vi.advanceTimersByTimeAsync(START_TIMEOUT_MS));
    const detail = () => host.querySelector(".line-gate__detail")?.textContent;
    expect(detail()).toBe(`LINE didn’t answer within ${START_TIMEOUT_MS / 1000} s`);
    await act(() => i18next.changeLanguage("ja"));
    expect(detail()).toContain(`${START_TIMEOUT_MS / 1000}秒`);
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
