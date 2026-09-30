// @vitest-environment happy-dom
import type { Me } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../../api/apiClient";
import { emptyApi, renderWithApi, TEST_ME } from "../../api/testing";
import { errors } from "../../i18n/strings/errors";
import { i18next } from "../../i18n/i18n";
import { keepChosenLanguage, readChosenLanguage } from "../../i18n/language";
import { SettingsNote } from "./SettingsNote";
import { statsClearPeek } from "./settingsPeek";

const restart = vi.fn();
let unmount = () => {};

afterEach(async () => {
  unmount();
  vi.unstubAllGlobals();
  localStorage.clear();
  restart.mockReset();
  vi.restoreAllMocks();
  await i18next.changeLanguage("en");
});

/** The note, for someone whose account chose `languageChoice`, saving through `setLanguageChoice`. */
function render(
  setLanguageChoice: ApiClient["setLanguageChoice"],
  languageChoice: Me["languageChoice"] = null,
) {
  const me = { ...TEST_ME, languageChoice };
  const view = renderWithApi(
    <SettingsNote restart={restart} />,
    emptyApi({ setLanguageChoice }),
    me,
  );
  unmount = view.unmount;
  return view.host;
}

const saving = () =>
  vi.fn<ApiClient["setLanguageChoice"]>((choice) =>
    Promise.resolve({ ...TEST_ME, languageChoice: choice }),
  );

const option = (host: HTMLElement, label: string) => {
  const found = [...host.querySelectorAll("label")].find((l) => l.textContent === label);
  const input = found?.querySelector("input");
  if (!input) throw new Error(`No option ${label}`);
  return input;
};

const choose = (host: HTMLElement, label: string) => act(async () => option(host, label).click());

const alert = (host: HTMLElement) => host.querySelector('[role="alert"]')?.textContent;

describe("the Settings note's language", () => {
  it("saves a choice to your account, keeps it on this phone, then restarts in it", async () => {
    const setLanguageChoice = saving();
    const host = render(setLanguageChoice);
    await choose(host, "日本語");
    expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith("ja");
    expect(readChosenLanguage()).toBe("ja");
    expect(restart).toHaveBeenCalledOnce();
  });

  it("clears both with Same as LINE", async () => {
    keepChosenLanguage("ja");
    const setLanguageChoice = saving();
    const host = render(setLanguageChoice, "ja");
    expect(option(host, "日本語").checked).toBe(true);
    await choose(host, "Same as LINE (English)");
    expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith(null);
    expect(readChosenLanguage()).toBeNull();
    expect(restart).toHaveBeenCalledOnce();
  });

  it("says why a choice wasn't saved, and leaves this phone's choice and the app as they were", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const offline = new ApiError(0, { error: "network", detail: "Failed to fetch" });
    const host = render(() => Promise.reject(offline));
    await choose(host, "日本語");
    expect(alert(host)).toContain(errors.network.en);
    expect(alert(host)).toContain("Failed to fetch");
    expect(readChosenLanguage()).toBeNull();
    expect(option(host, "Same as LINE (English)").checked).toBe(true);
    expect(restart).not.toHaveBeenCalled();
  });

  it("says why this phone couldn't keep a saved choice, and doesn't restart", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // A stand-in storage: spying on happy-dom's own leaves it unable to write for later tests.
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new DOMException("The storage is full", "QuotaExceededError");
      },
    });
    const setLanguageChoice = saving();
    const host = render(setLanguageChoice);
    await choose(host, "日本語");
    expect(setLanguageChoice).toHaveBeenCalledWith("ja");
    expect(alert(host)).toContain("The storage is full");
    expect(restart).not.toHaveBeenCalled();
  });

  it("reads in Japanese, naming each language in its own language", async () => {
    await i18next.changeLanguage("ja");
    const host = render(saving());
    expect(host.querySelector("h3")?.textContent).toBe("設定");
    expect(host.querySelector("legend")?.textContent).toBe("言語");
    expect([...host.querySelectorAll("label")].map((l) => l.textContent)).toEqual([
      "LINEと同じ（English）",
      "English",
      "日本語",
    ]);
  });
});

describe("the Settings note's peek", () => {
  it("shows only where the stats end above the cork's foot band", () => {
    // A cork 520px tall whose foot band is 60px: stats to 440px leave room, stats to 480px don't.
    expect(statsClearPeek(520, 440, 60)).toBe(true);
    expect(statsClearPeek(520, 480, 60)).toBe(false);
    expect(statsClearPeek(900, 480, 60)).toBe(true);
  });
});
