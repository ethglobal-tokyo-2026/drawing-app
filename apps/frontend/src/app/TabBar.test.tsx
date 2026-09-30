// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../i18n/i18n";
import { IDLE_MS, TabBar } from "./TabBar";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  act(() => root.unmount());
  host.remove();
  await i18next.changeLanguage("en");
});

describe("TabBar", () => {
  it("reads マイボード, さがす and ショップ in Japanese, and names itself and its grabber in Japanese", async () => {
    await i18next.changeLanguage("ja");
    // Tucked away, so the grabber shows too.
    act(() => root.render(<TabBar tucked onChange={() => {}} />));
    const nav = host.querySelector("nav");
    const tabs = [...(nav?.querySelectorAll("button") ?? [])].map((tab) => tab.textContent);
    expect(tabs).toEqual(["マイボード", "さがす", "ショップ"]);
    expect(nav?.getAttribute("aria-label")).toBe("アプリのセクション");
    expect(host.querySelector(".tab-grabber")?.getAttribute("aria-label")).toBe(
      "マイボード・さがす・ショップのタブを出す",
    );
  });
});

describe("TabBar tucked away, and brought back", () => {
  const grabber = () => host.querySelector<HTMLButtonElement>(".tab-grabber");
  const strip = () => host.querySelector("nav");
  const peeking = () => strip()?.classList.contains("is-peeking");
  /** The grabber's click: a touch's has a detail of 1, a keyboard's or a screen reader's none. */
  const click = (detail: number) => {
    act(() => {
      grabber()?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail }));
    });
  };
  const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  beforeEach(() => {
    vi.useFakeTimers();
    act(() => root.render(<TabBar tucked onChange={() => {}} />));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tucks again after the idle seconds when a touch brought it up", async () => {
    click(1);
    expect(peeking()).toBe(true);
    await wait(IDLE_MS - 1);
    expect(peeking()).toBe(true);
    await wait(1);
    expect(peeking()).toBe(false);
  });

  it("stays up for a keyboard's or screen reader's activation while focus is in it, and tucks once focus leaves", async () => {
    grabber()?.focus();
    click(0);
    expect(document.activeElement).toBe(strip()?.querySelector("button"));
    await wait(IDLE_MS * 3);
    expect(peeking()).toBe(true);

    act(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await wait(IDLE_MS);
    expect(peeking()).toBe(false);
  });

  it("tucks on Escape, and hands focus back to the grabber", () => {
    grabber()?.focus();
    click(0);
    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(peeking()).toBe(false);
    expect(document.activeElement).toBe(grabber());
  });
});
