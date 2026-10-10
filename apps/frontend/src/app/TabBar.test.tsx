// @vitest-environment happy-dom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TabsLead } from "../ui/TabsLead";
import { inLanguage, onLargeScreen } from "../ui/testing";
import { TabBar } from "./TabBar";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("TabBar", () => {
  it("reads マイボード, 発見 and ショップ in Japanese, and names itself in Japanese", async () => {
    await inLanguage("ja");
    act(() => root.render(<TabBar active="board" onChange={() => {}} />));
    const nav = host.querySelector("nav");
    const tabs = [...(nav?.querySelectorAll("button") ?? [])].map((tab) => tab.textContent);
    expect(tabs).toEqual(["マイボード", "発見", "ショップ"]);
    expect(nav?.getAttribute("aria-label")).toBe("アプリのセクション");
  });
});

describe("TabBar's lead on a large screen", () => {
  /** A board's key, which counts its mounts. */
  function BoardKey({ onMount }: { onMount: () => void }) {
    useEffect(onMount, [onMount]);
    return (
      <button type="button" className="board-key">
        Draw
      </button>
    );
  }

  afterEach(() => vi.restoreAllMocks());

  it("mounts a board's key once, in the tab row's lead, and hands it back to the board on a phone", () => {
    const large = onLargeScreen();
    const onMount = vi.fn();
    // As App renders the screen before the tabs.
    act(() =>
      root.render(
        <>
          <TabsLead>
            <BoardKey onMount={onMount} />
          </TabsLead>
          <TabBar active="board" onChange={() => {}} />
        </>,
      ),
    );
    const key = () => host.querySelector(".board-key");
    expect(key()?.parentElement?.classList.contains("tabs-lead")).toBe(true);
    expect(onMount).toHaveBeenCalledOnce();

    act(() => large.change(false));
    expect(key()?.parentElement).toBe(host);
  });
});
