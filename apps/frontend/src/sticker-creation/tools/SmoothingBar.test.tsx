// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmoothingBar } from "./SmoothingBar";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const onChange = vi.fn<(value: number) => void>();

const render = (value: number) =>
  act(() => root.render(<SmoothingBar id="bar" open value={value} onChange={onChange} />));
const slider = () => {
  const input = host.querySelector("input");
  if (!input) throw new Error("the slider isn't rendered");
  return input;
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onChange.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("SmoothingBar", () => {
  it("moves its slider to a value that came from elsewhere, as a kept drawing's does", () => {
    render(30);
    expect(slider().valueAsNumber).toBe(30);
    render(80);
    expect(slider().valueAsNumber).toBe(80);
  });

  it("hands over the value once, as the slider is let go", () => {
    render(30);
    act(() => {
      slider().value = "55";
      slider().dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => void slider().dispatchEvent(new Event("change", { bubbles: true })));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(55);
  });
});
