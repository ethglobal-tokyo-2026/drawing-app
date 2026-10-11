// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18next } from "../i18n/i18n";
import { testHost } from "../sticker-creation/layers/testHost";
import { CornerPrint } from "./CornerPrint";
import subjects from "./subjects/subjects.json";

const { render, find } = testHost();
const subject = (ja: string) => {
  const found = subjects.find((item) => item.ja === ja);
  if (!found) throw new Error(ja);
  return found;
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("localized full Kyoto Seika Subjects", () => {
  it.each([
    ["en", "見合い", "高校生", "meeting with a view to marriage × senior high school student"],
    ["ja", "アーティスト", "宇宙飛行士", "アーティスト × 宇宙飛行士"],
    ["en", "入院", "管理人", "hospitalization × administrator"],
  ])("keeps the complete %s pair %s and %s", async (language, first, second, expected) => {
    await act(async () => {
      await i18next.changeLanguage(language);
    });
    try {
      render(<CornerPrint subjects={[subject(first), subject(second)]} />);
      expect(find(".corner-print").textContent).toBe(expected);
      expect(find(".corner-print").getAttribute("aria-hidden")).toBe("true");
    } finally {
      await act(async () => {
        await i18next.changeLanguage("en");
      });
    }
  });
  it("moves overflowing words above the footer and rechecks when the container changes", () => {
    let height = 60;
    const callbacks: (() => void)[] = [];
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      return new DOMRect(0, 0, 100, this.classList.contains("corner-print__pair") ? height : 46);
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          callbacks.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<CornerPrint subjects={[subject("見合い"), subject("高校生")]} />);
    expect(find(".corner-print").classList.contains("is-long")).toBe(true);
    height = 34;
    act(() => callbacks.forEach((callback) => callback()));
    expect(find(".corner-print").classList.contains("is-long")).toBe(false);
  });
});
