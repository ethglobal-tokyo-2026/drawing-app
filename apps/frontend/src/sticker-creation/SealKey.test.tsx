// @vitest-environment happy-dom
import { describe, expect, it, onTestFinished } from "vitest";
import { renderInHost } from "../ui/testing";
import { SealKey } from "./SealKey";

describe("seal notices", () => {
  it("announces accepted Fill progress as status and seal failures as alerts", () => {
    const view = renderInHost(<SealKey shown problem="Finishing fill…" status onTap={() => {}} />);
    onTestFinished(view.unmount);
    expect(view.host.querySelector('[role="status"]')?.textContent).toBe("Finishing fill…");
    expect(view.host.querySelector('[role="alert"]')).toBeNull();

    view.rerender(
      <SealKey
        shown
        problem="Your sticker could not seal."
        detail="The server refused the seal."
        onTap={() => {}}
      />,
    );
    expect(view.host.querySelector('[role="alert"]')?.textContent).toBe(
      "Your sticker could not seal.",
    );
    expect(view.host.querySelector(".error-detail")?.textContent).toContain(
      "The server refused the seal.",
    );
    expect(view.host.querySelector('[role="status"]')).toBeNull();
    expect(view.host.querySelector(".seal-chip")?.hasAttribute("inert")).toBe(false);

    view.rerender(<SealKey shown problem={null} onTap={() => {}} />);
    expect(view.host.querySelector(".seal-chip")?.getAttribute("aria-hidden")).toBe("true");
    expect(view.host.querySelector(".seal-chip")?.hasAttribute("inert")).toBe(true);
  });
});
