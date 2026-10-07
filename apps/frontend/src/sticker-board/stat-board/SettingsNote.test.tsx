// @vitest-environment happy-dom
import type { Me } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../../api/apiClient";
import { emptyApi, renderWithApi, TEST_ME, TEST_OWNER } from "../../api/testing";
import { toPerson } from "../../api/views";
import { errors } from "../../i18n/strings/errors";
import { i18next } from "../../i18n/i18n";
import { keepChosenLanguage, readChosenLanguage } from "../../i18n/language";
import { keepBoard, keptBoardFor, readKeptBoardAgain } from "../lastBoard";
import { takeReopenOnSettings } from "./reopenOnSettings";
import { SettingsNote } from "./SettingsNote";
import { statsClearPeek } from "./settingsPeek";

const restart = vi.fn();
let unmount = () => {};

afterEach(async () => {
  unmount();
  vi.unstubAllGlobals();
  localStorage.clear();
  readKeptBoardAgain();
  sessionStorage.clear();
  restart.mockReset();
  vi.restoreAllMocks();
  await i18next.changeLanguage("en");
});

/** The note, for `me`, saving through the methods `overrides` give. */
function renderNote(overrides: Partial<ApiClient>, me: Me = TEST_ME) {
  const view = renderWithApi(<SettingsNote restart={restart} />, emptyApi(overrides), me);
  unmount = view.unmount;
  return view.host;
}

/** The note, for someone whose account chose `languageChoice`, saving through `setLanguageChoice`. */
const render = (
  setLanguageChoice: ApiClient["setLanguageChoice"],
  languageChoice: Me["languageChoice"] = null,
) => renderNote({ setLanguageChoice }, { ...TEST_ME, languageChoice });

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
    expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith("ja", "en");
    expect(readChosenLanguage()).toBe("ja");
    expect(restart).toHaveBeenCalledOnce();
  });

  it("has the restart reopen on Settings, once, so the person sees their pick took", async () => {
    const host = render(saving());
    await choose(host, "日本語");
    expect(takeReopenOnSettings()).toBe(true);
    expect(takeReopenOnSettings()).toBe(false);
  });

  it("clears both with Same as LINE", async () => {
    keepChosenLanguage("ja");
    const setLanguageChoice = saving();
    const host = render(setLanguageChoice, "ja");
    expect(option(host, "日本語").checked).toBe(true);
    await choose(host, "Same as LINE (English)");
    expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith(null, "en");
    expect(readChosenLanguage()).toBeNull();
    expect(restart).toHaveBeenCalledOnce();
  });

  it("says why a choice wasn't saved, and leaves this phone's choice and the app as they were", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const offline = new ApiError(0, { error: "network", detail: "Failed to fetch" });
    const host = render(() => Promise.reject(offline));
    await choose(host, "日本語");
    expect(alert(host)).toContain(errors.network.en);
    expect(host.textContent).toContain("Failed to fetch");
    expect(readChosenLanguage()).toBeNull();
    expect(option(host, "Same as LINE (English)").checked).toBe(true);
    expect(restart).not.toHaveBeenCalled();
    expect(takeReopenOnSettings()).toBe(false);
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
    expect(setLanguageChoice).toHaveBeenCalledWith("ja", "en");
    expect(alert(host)).toContain("couldn’t keep it");
    expect(host.textContent).toContain("The storage is full");
    expect(restart).not.toHaveBeenCalled();
  });

  it("reads in Japanese, naming each language in its own language", async () => {
    await i18next.changeLanguage("ja");
    const host = render(saving());
    expect(host.querySelector("h3")?.textContent).toBe("設定");
    expect(host.querySelector("legend")?.textContent).toBe("言語");
    expect(
      [...host.querySelectorAll("label:has(input[type=radio])")].map((l) => l.textContent),
    ).toEqual(["LINEと同じ（English）", "English", "日本語"]);
  });
});

describe("the Settings note's 18+ switch", () => {
  const savingOptIn = () =>
    vi.fn<ApiClient["setNsfwOptIn"]>((nsfwOptIn) => Promise.resolve({ ...TEST_ME, nsfwOptIn }));
  const switchOf = (host: HTMLElement) => {
    const found = host.querySelector<HTMLInputElement>('input[role="switch"]');
    if (!found) throw new Error("No switch on the note");
    return found;
  };
  const flip = (host: HTMLElement) => act(async () => switchOf(host).click());
  const keepABoard = () => keepBoard(TEST_ME.id, { owner: toPerson(TEST_OWNER), stickers: [] });

  it("is off until turned on, and says what it does", () => {
    const host = renderNote({});
    expect(switchOf(host).checked).toBe(false);
    expect(switchOf(host).closest("label")?.textContent).toBe("Show 18+ stickers");
    expect(host.textContent).toContain("For people 18 or older.");
    expect(host.textContent).toContain("Changing it restarts Croquis.");
  });

  it("saves it to your account, forgets the board kept on this phone, then restarts on Settings", async () => {
    const setNsfwOptIn = savingOptIn();
    const host = renderNote({ setNsfwOptIn });
    keepABoard();
    await flip(host);
    expect(setNsfwOptIn).toHaveBeenCalledExactlyOnceWith(true);
    expect(keptBoardFor(TEST_ME.id)).toBeNull();
    expect(takeReopenOnSettings()).toBe(true);
    expect(restart).toHaveBeenCalledOnce();
    expect(switchOf(host).checked).toBe(true);
  });

  it("turns it off the same way", async () => {
    const setNsfwOptIn = savingOptIn();
    const host = renderNote({ setNsfwOptIn }, { ...TEST_ME, nsfwOptIn: true });
    expect(switchOf(host).checked).toBe(true);
    await flip(host);
    expect(setNsfwOptIn).toHaveBeenCalledExactlyOnceWith(false);
    expect(restart).toHaveBeenCalledOnce();
  });

  it("says why it wasn't saved, and leaves the switch, the kept board and the app as they were", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const offline = new ApiError(0, { error: "network", detail: "Failed to fetch" });
    const host = renderNote({ setNsfwOptIn: () => Promise.reject(offline) });
    keepABoard();
    await flip(host);
    expect(alert(host)).toContain(errors.network.en);
    expect(alert(host)).toContain("Your 18+ setting couldn’t be saved, so it hasn’t changed");
    expect(host.textContent).toContain("Failed to fetch");
    expect(switchOf(host).checked).toBe(false);
    expect(keptBoardFor(TEST_ME.id)).not.toBeNull();
    expect(restart).not.toHaveBeenCalled();
    expect(takeReopenOnSettings()).toBe(false);
  });

  it("reads in Japanese", async () => {
    await i18next.changeLanguage("ja");
    const host = renderNote({});
    expect([...host.querySelectorAll("legend")].map((l) => l.textContent)).toEqual([
      "言語",
      "18+のシール",
    ]);
    expect(host.querySelector("label:has(input[role='switch'])")?.textContent).toBe(
      "18+のシールを表示する",
    );
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
