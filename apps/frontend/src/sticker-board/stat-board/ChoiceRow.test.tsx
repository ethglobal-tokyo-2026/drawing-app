// @vitest-environment happy-dom
import { act, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../../api/testing";
import { ChoiceRow } from "./ChoiceRow";

const SIZES = ["small", "medium", "large"] as const;
type Size = (typeof SIZES)[number];

let unmount = () => {};
afterEach(() => unmount());

/** A row of three choices that shows what's chosen, as Settings does; `busy` while its setting saves. */
function render({ busy = false } = {}) {
  const chosen = vi.fn<(size: Size) => void>();
  function Row() {
    const [value, setValue] = useState<Size>("small");
    const choose = (size: Size) => {
      chosen(size);
      setValue(size);
    };
    return (
      <ChoiceRow
        label="Size"
        choices={SIZES}
        value={value}
        nameOf={(size) => size}
        onChoose={choose}
        busy={busy}
      />
    );
  }
  const view = renderWithApi(<Row />);
  unmount = view.unmount;
  return { host: view.host, chosen };
}

const radios = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[role="radio"]')];
const picked = (host: HTMLElement) =>
  radios(host).find((radio) => radio.getAttribute("aria-checked") === "true")?.textContent;
const press = (key: string) =>
  act(async () => {
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });

describe("a choice row", () => {
  it("is a radio group named by its label, with the picked choice its one stop for Tab", () => {
    const { host } = render();
    const group = host.querySelector('[role="radiogroup"]');
    expect(document.getElementById(group?.getAttribute("aria-labelledby") ?? "")?.textContent).toBe(
      "Size",
    );
    expect(radios(host).map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
  });

  it("picks a choice by a tap, and a tap on the picked one changes nothing", () => {
    const { host, chosen } = render();
    act(() => radios(host)[2]?.click());
    expect(picked(host)).toBe("large");
    expect(radios(host).map((radio) => radio.tabIndex)).toEqual([-1, -1, 0]);
    act(() => radios(host)[2]?.click());
    expect(chosen).toHaveBeenCalledExactlyOnceWith("large");
  });

  it("moves the pick with the arrow keys, round from either end, and focus goes with it", async () => {
    const { host } = render();
    act(() => radios(host)[0]?.focus());
    await press("ArrowRight");
    expect(picked(host)).toBe("medium");
    expect(document.activeElement).toBe(radios(host)[1]);
    await press("ArrowDown");
    await press("ArrowRight");
    expect(picked(host)).toBe("small");
    await press("ArrowLeft");
    expect(picked(host)).toBe("large");
    await press("Home");
    expect(picked(host)).toBe("small");
    await press("End");
    expect(picked(host)).toBe("large");
    expect(document.activeElement).toBe(radios(host)[2]);
  });

  it("takes no pick while its setting saves", async () => {
    const { host, chosen } = render({ busy: true });
    expect(host.querySelector('[role="radiogroup"]')?.getAttribute("aria-disabled")).toBe("true");
    act(() => radios(host)[1]?.click());
    act(() => radios(host)[0]?.focus());
    await press("ArrowRight");
    expect(chosen).not.toHaveBeenCalled();
    expect(picked(host)).toBe("small");
  });
});
