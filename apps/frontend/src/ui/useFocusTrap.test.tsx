// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFocusTrap } from "./useFocusTrap";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** A dialog whose last two controls take no Tab stop: one tucked away, one stepped aside. */
function Dialog({
  active,
  onEscape,
  returnFocus,
  refocus,
  middle = true,
}: {
  active: boolean;
  onEscape: () => void;
  returnFocus?: () => HTMLElement | null;
  refocus?: string;
  middle?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { active, onEscape, returnFocus, refocus });
  return (
    <div ref={ref} id="dialog" tabIndex={-1}>
      <button id="first">First</button>
      {middle && <button id="middle">Middle</button>}
      <button id="last">Last</button>
      <div inert>
        <button>Tucked</button>
      </div>
      <button tabIndex={-1}>Stepped aside</button>
    </div>
  );
}

let host: HTMLDivElement;
let root: Root;
let opener: HTMLButtonElement;
const onEscape = vi.fn();

const render = (active: boolean) =>
  act(() => root.render(<Dialog active={active} onEscape={onEscape} />));
const byId = (id: string) => document.getElementById(id);
const press = (key: string, shiftKey = false) =>
  document.activeElement?.dispatchEvent(
    new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }),
  );

beforeEach(() => {
  opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onEscape.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  opener.remove();
});

describe("useFocusTrap", () => {
  it("moves focus to the first control when it activates", () => {
    render(true);
    expect(document.activeElement).toBe(byId("first"));
  });

  it("moves focus to the first control again when its refocus key changes, and only then", () => {
    const dialog = (refocus: string) =>
      act(() => root.render(<Dialog active onEscape={onEscape} refocus={refocus} />));
    dialog("asking");
    byId("last")?.focus();
    dialog("asking");
    expect(document.activeElement).toBe(byId("last"));
    dialog("answered");
    expect(document.activeElement).toBe(byId("first"));
  });

  it("wraps Tab from the last control to the first, past controls that take no stop, and Shift+Tab back", () => {
    render(true);
    byId("last")?.focus();
    press("Tab");
    expect(document.activeElement).toBe(byId("first"));
    press("Tab", true);
    expect(document.activeElement).toBe(byId("last"));
  });

  it("wraps Shift+Tab from the dialog itself to its last control", () => {
    render(true);
    byId("dialog")?.focus();
    press("Tab", true);
    expect(document.activeElement).toBe(byId("last"));
  });

  it("calls onEscape on Escape", () => {
    render(true);
    press("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("still hears Escape and Tab once the focused control goes, and takes focus back", () => {
    render(true);
    byId("middle")?.focus();
    act(() => root.render(<Dialog active onEscape={onEscape} middle={false} />));
    expect(document.activeElement).toBe(document.body);
    press("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);
    press("Tab");
    expect(document.activeElement).toBe(byId("first"));
  });

  it("leaves the keys to the dialog opened last", () => {
    render(true);
    const onTopEscape = vi.fn();
    const onTop = document.createElement("div");
    document.body.append(onTop);
    const top = createRoot(onTop);
    act(() => top.render(<Dialog active onEscape={onTopEscape} />));
    press("Escape");
    expect(onTopEscape).toHaveBeenCalledTimes(1);
    expect(onEscape).not.toHaveBeenCalled();
    act(() => top.unmount());
    onTop.remove();
  });

  it("gives focus back to where it was when it deactivates", () => {
    render(true);
    render(false);
    expect(document.activeElement).toBe(opener);
  });

  it("gives focus to the element returnFocus names instead, while there is one", () => {
    const origin = document.createElement("button");
    document.body.append(origin);
    let target: HTMLElement | null = origin;
    const dialog = (active: boolean) =>
      act(() =>
        root.render(<Dialog active={active} onEscape={onEscape} returnFocus={() => target} />),
      );
    dialog(true);
    dialog(false);
    expect(document.activeElement).toBe(origin);

    opener.focus();
    target = null;
    dialog(true);
    dialog(false);
    expect(document.activeElement).toBe(opener);
    origin.remove();
  });
});
