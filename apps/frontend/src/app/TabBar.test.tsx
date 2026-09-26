// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../i18n/i18n";
import { TabBar } from "./TabBar";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../line/liff", () => ({
  useLine: () => ({
    status: "ready",
    profile: { userId: "U1", displayName: "Bob Tanaka" },
    inClient: true,
  }),
}));

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
