// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderInHost } from "../../ui/testing";
import { i18next } from "../../i18n/i18n";
import type { SmoothingMode } from "../canvas/stabilizer";
import { SmoothingBar } from "./SmoothingBar";

const onChange = vi.fn<(value: number) => void>();
const onPostChange = vi.fn();
const onModeChange = vi.fn();
let view: ReturnType<typeof renderInHost> | undefined;

const bar = (value: number, mode: SmoothingMode = "fixed") => (
  <SmoothingBar
    id="bar"
    open
    value={value}
    onChange={onChange}
    mode={mode}
    onModeChange={onModeChange}
    postCorrection={{ strength: 20, adjustBySpeed: false, adjustByScale: true }}
    onPostChange={onPostChange}
  />
);
const slider = () => {
  const input = view?.host.querySelector("input");
  if (!input) throw new Error("the slider isn't rendered");
  return input;
};

afterEach(async () => {
  view?.unmount();
  view = undefined;
  onChange.mockReset();
  onPostChange.mockReset();
  onModeChange.mockReset();
  await act(async () => i18next.changeLanguage("en"));
});

describe("SmoothingBar", () => {
  it.each([
    ["en", "slow", "Pen only. Applies at Smoothing 0–30; above 30 stays fixed."],
    ["en", "fast", "Pen only. Applies at Smoothing 3 or above; below 3 stays fixed."],
    ["ja", "slow", "ペン入力のみ。手ぶれ補正0〜30で適用。30を超えると一定になります。"],
    ["ja", "fast", "ペン入力のみ。手ぶれ補正3以上で適用。3未満は一定になります。"],
  ] as const)("explains the %s %s strength limit", async (language, mode, help) => {
    await act(async () => i18next.changeLanguage(language));
    view = renderInHost(bar(35, mode));
    const helpId = view.host.querySelector("select")?.getAttribute("aria-describedby");
    expect(view.host.querySelector(`#${helpId}`)?.textContent).toBe(help);
  });
  it("names the pen speed choices and their scope in Japanese", async () => {
    await act(async () => i18next.changeLanguage("ja"));
    view = renderInHost(bar(30));
    const select = view.host.querySelector("select");
    expect(select?.labels?.[0]?.textContent).toBe("ペン速度");
    expect(Array.from(select?.options ?? []).map((option) => option.textContent)).toEqual([
      "一定",
      "ゆっくり描くときに補正",
      "速く描くときに補正",
    ]);
    const helpId = select?.getAttribute("aria-describedby");
    expect(view.host.querySelector(`#${helpId}`)?.textContent).toBe(
      "ペン入力のみ。描いている間に調整します。",
    );
  });
  it("selects pen speed independently of strength and post correction", () => {
    view = renderInHost(bar(30));
    const select = view.host.querySelector("select");
    expect(select).not.toBeNull();
    expect(select?.value).toBe("fixed");
    expect(Array.from(select?.options ?? []).map((option) => option.value)).toEqual([
      "fixed",
      "slow",
      "fast",
    ]);
    act(() => {
      if (!select) return;
      select.value = "slow";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onModeChange).toHaveBeenCalledExactlyOnceWith("slow");
    expect(onChange).not.toHaveBeenCalled();
    expect(onPostChange).not.toHaveBeenCalled();
  });
  it("moves its slider to a value that came from elsewhere, as a kept drawing's does", () => {
    view = renderInHost(bar(30));
    expect(slider().valueAsNumber).toBe(30);
    view.rerender(bar(80));
    expect(slider().valueAsNumber).toBe(80);
  });

  it("hands over the value once, as the slider is let go", () => {
    view = renderInHost(bar(30));
    act(() => {
      slider().value = "55";
      slider().dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => void slider().dispatchEvent(new Event("change", { bubbles: true })));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(55);
  });

  it("sets post strength independently, committing once when released", () => {
    view = renderInHost(bar(30));
    const post = view.host.querySelector<HTMLInputElement>('input[aria-label="Post correction"]');
    if (!post) throw new Error("Post correction slider was not rendered");
    act(() => {
      post.value = "40";
      post.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onPostChange).not.toHaveBeenCalled();
    act(() => void post.dispatchEvent(new Event("change", { bubbles: true })));
    expect(onPostChange).toHaveBeenCalledExactlyOnceWith({
      strength: 40,
      adjustBySpeed: false,
      adjustByScale: true,
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exposes speed and scale as separately named switches", () => {
    view = renderInHost(bar(30));
    const switches = view.host.querySelectorAll<HTMLInputElement>('input[role="switch"]');
    expect(switches).toHaveLength(2);
    expect(switches[0].checked).toBe(false);
    expect(switches[1].checked).toBe(true);
    act(() => switches[0].click());
    expect(onPostChange).toHaveBeenCalledExactlyOnceWith({
      strength: 20,
      adjustBySpeed: true,
      adjustByScale: true,
    });
  });
});
