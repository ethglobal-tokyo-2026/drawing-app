// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Sheet } from "./Sheet";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

const render = (open: boolean) =>
  act(() =>
    root.render(
      <Sheet label="Color" open={open} onClose={() => {}}>
        <p>Swatches</p>
      </Sheet>,
    ),
  );
const sheet = () => host.querySelector(".bottom-sheet");
const animationEnds = () =>
  act(() => void sheet()?.dispatchEvent(new Event("animationend", { bubbles: true })));

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("Sheet", () => {
  it("slides a closing sheet away before it goes", () => {
    render(true);
    render(false);
    expect(sheet()?.classList.contains("is-leaving")).toBe(true);
    animationEnds();
    expect(sheet()).toBeNull();
  });

  it("stays when it opens again on its way out", () => {
    render(true);
    render(false);
    render(true);
    animationEnds();
    expect(sheet()?.classList.contains("is-leaving")).toBe(false);
  });
});
