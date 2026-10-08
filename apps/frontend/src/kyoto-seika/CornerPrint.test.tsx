// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CornerPrint } from "./CornerPrint";
import { SPORTS, WIND } from "./testSubjects";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let cleanup = () => {};
afterEach(() => cleanup());

function render(node: React.ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  cleanup = () => {
    act(() => root.unmount());
    host.remove();
  };
  return host;
}

describe("the corner print", () => {
  it("prints each subject's word alone, without its furigana or English, hidden from screen readers", () => {
    const print = render(<CornerPrint subjects={[WIND, SPORTS]} />).querySelector(".corner-print");
    if (!print) throw new Error("No corner print");
    expect(print.getAttribute("aria-hidden")).toBe("true");
    const words = [...print.querySelectorAll(".corner-print__word")].map((w) => w.textContent);
    expect(words).toEqual([WIND.ja, SPORTS.ja]);
    expect(print.textContent).not.toContain(SPORTS.en);
  });
});
