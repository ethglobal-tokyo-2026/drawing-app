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
  sessionStorage.clear();
  readKeptBoardAgain();
  restart.mockReset();
  vi.restoreAllMocks();
  await i18next.changeLanguage("en");
});

/** The note, for you as `account` says, saving through `api`. */
function render(api: Partial<ApiClient>, account: Partial<Me> = {}) {
  const me = { ...TEST_ME, languageChoice: null, ...account };
  const view = renderWithApi(<SettingsNote restart={restart} />, emptyApi(api), me);
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
    const host = render({ setLanguageChoice });
    await choose(host, "日本語");
    expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith("ja");
    expect(readChosenLanguage()).toBe("ja");
    expect(restart).toHaveBeenCalledOnce();
  });

  it("has the restart reopen on Settings, once, so the person sees their pick took", async () => {
    const host = render({ setLanguageChoice: saving() });
    await choose(host, "日本語");
    expect(takeReopenOnSettings()).toBe(true);
    expect(takeReopenOnSettings()).toBe(false);
  });

  it("clears both with Same as LINE", async () => {
    keepChosenLanguage("ja");
    const setLanguageChoice = saving();
    const host = render({ setLanguageChoice }, { languageChoice: "ja" });
    expect(option(host, "日本語").checked).toBe(true);
    await choose(host, "Same as LINE (English)");
    expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith(null);
    expect(readChosenLanguage()).toBeNull();
    expect(restart).toHaveBeenCalledOnce();
  });

  it("says why a choice wasn't saved, and leaves this phone's choice and the app as they were", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const offline = new ApiError(0, { error: "network", detail: "Failed to fetch" });
    const host = render({ setLanguageChoice: () => Promise.reject(offline) });
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
    const host = render({ setLanguageChoice });
    await choose(host, "日本語");
    expect(setLanguageChoice).toHaveBeenCalledWith("ja");
    expect(alert(host)).toContain("couldn’t keep it");
    expect(host.textContent).toContain("The storage is full");
    expect(restart).not.toHaveBeenCalled();
  });

  it("reads in Japanese, naming each language in its own language", async () => {
    await i18next.changeLanguage("ja");
    const host = render({ setLanguageChoice: saving() });
    expect(host.querySelector("h3")?.textContent).toBe("設定");
    expect(host.querySelector("legend")?.textContent).toBe("言語");
    const choices = [...host.querySelectorAll('input[type="radio"]')];
    expect(choices.map((choice) => choice.closest("label")?.textContent)).toEqual([
      "LINEと同じ（English）",
      "English",
      "日本語",
    ]);
  });
});

describe("the Settings note's Show 18+ stickers", () => {
  /** A board this phone kept, which shows its stickers veiled or not by the setting it was kept under. */
  const KEPT = { owner: toPerson(TEST_OWNER), stickers: [] };

  const theSwitch = (host: HTMLElement) => {
    const found = host.querySelector<HTMLInputElement>('input[role="switch"]');
    if (!found) throw new Error("No Show 18+ stickers switch");
    return found;
  };
  const flip = (host: HTMLElement) => act(async () => theSwitch(host).click());

  it.each([false, true])(
    "saves a change from %s to your account, forgets the board this phone kept, then restarts on Settings",
    async (wasOn) => {
      keepBoard(TEST_ME.id, KEPT);
      const setNsfwOptIn = vi.fn<ApiClient["setNsfwOptIn"]>((nsfwOptIn) =>
        Promise.resolve({ ...TEST_ME, nsfwOptIn }),
      );
      const host = render({ setNsfwOptIn }, { nsfwOptIn: wasOn });
      expect(theSwitch(host).checked).toBe(wasOn);
      await flip(host);
      expect(setNsfwOptIn).toHaveBeenCalledExactlyOnceWith(!wasOn);
      expect(keptBoardFor(TEST_ME.id)).toBeNull();
      expect(takeReopenOnSettings()).toBe(true);
      expect(restart).toHaveBeenCalledOnce();
    },
  );

  it("says why a change wasn't saved, and leaves it, the kept board and the app as they were", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    keepBoard(TEST_ME.id, KEPT);
    const offline = new ApiError(0, { error: "network", detail: "Failed to fetch" });
    const host = render({ setNsfwOptIn: () => Promise.reject(offline) }, { nsfwOptIn: false });
    await flip(host);
    expect(alert(host)).toContain(
      i18next.t(($) => $.stickerBoard.settings.nsfw.notSaved, { reason: errors.network.en }),
    );
    expect(host.textContent).toContain("Failed to fetch");
    expect(theSwitch(host).checked).toBe(false);
    expect(keptBoardFor(TEST_ME.id)).toEqual(KEPT);
    expect(takeReopenOnSettings()).toBe(false);
    expect(restart).not.toHaveBeenCalled();
  });

  it("says it's saving, and takes no other change until it's saved, since saving restarts the app", async () => {
    const setLanguageChoice = saving();
    const host = render({ setNsfwOptIn: () => new Promise(() => {}), setLanguageChoice });
    await flip(host);
    expect(theSwitch(host).closest("fieldset")?.textContent).toContain(
      i18next.t(($) => $.stickerBoard.settings.saving),
    );
    await choose(host, "日本語");
    expect(setLanguageChoice).not.toHaveBeenCalled();
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
