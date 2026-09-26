// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readChosenLanguage } from "../../i18n/language";
import { LanguageControls } from "./LanguageControls";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const restart = vi.fn();
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<LanguageControls restart={restart} />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  localStorage.clear();
  restart.mockReset();
  vi.restoreAllMocks();
});

const choose = (label: string) => {
  const option = [...host.querySelectorAll("label")].find((l) => l.textContent === label);
  if (!option) throw new Error(`No option ${label}`);
  act(() => option.querySelector("input")?.click());
};

describe("the language switch on the developer slip", () => {
  it("keeps the choice for the next start and restarts in it; LINE's clears the choice", () => {
    choose("日本語");
    expect(readChosenLanguage()).toBe("ja");
    choose("LINE's");
    expect(readChosenLanguage()).toBeNull();
    expect(restart).toHaveBeenCalledTimes(2);
  });

  it("says why a choice couldn't be kept, and doesn't restart", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // A stand-in storage: spying on happy-dom's own leaves it unable to write for later tests.
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new DOMException("The storage is full", "QuotaExceededError");
      },
    });
    choose("日本語");
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("The storage is full");
    expect(restart).not.toHaveBeenCalled();
  });
});
