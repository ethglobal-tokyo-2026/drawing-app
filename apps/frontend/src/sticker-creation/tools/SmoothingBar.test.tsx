// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { SmoothingBar } from "./SmoothingBar";

const onChange = vi.fn<(value: number) => void>();
let view: ReturnType<typeof renderWithApi> | undefined;

const bar = (value: number) => <SmoothingBar id="bar" open value={value} onChange={onChange} />;
const slider = () => {
  const input = view?.host.querySelector("input");
  if (!input) throw new Error("the slider isn't rendered");
  return input;
};

afterEach(() => {
  view?.unmount();
  view = undefined;
  onChange.mockReset();
});

describe("SmoothingBar", () => {
  it("moves its slider to a value that came from elsewhere, as a kept drawing's does", () => {
    view = renderWithApi(bar(30));
    expect(slider().valueAsNumber).toBe(30);
    view.rerender(bar(80));
    expect(slider().valueAsNumber).toBe(80);
  });

  it("hands over the value once, as the slider is let go", () => {
    view = renderWithApi(bar(30));
    act(() => {
      slider().value = "55";
      slider().dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => void slider().dispatchEvent(new Event("change", { bubbles: true })));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(55);
  });
});
