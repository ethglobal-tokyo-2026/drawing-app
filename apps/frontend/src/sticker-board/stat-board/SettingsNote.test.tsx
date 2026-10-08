// @vitest-environment happy-dom
import type { Me } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME, TEST_OWNER } from "../../api/testing";
import { toPerson } from "../../api/views";
import { errors } from "../../i18n/strings/errors";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import { currentLanguage, i18next } from "../../i18n/i18n";
import { keepChosenLanguage, readChosenLanguage } from "../../i18n/language";
import { keepBoard, keptBoardFor, readKeptBoardAgain } from "../lastBoard";
import { SettingsNote } from "./SettingsNote";
import { statsClearPeek } from "./settingsPeek";

const liff = vi.hoisted(() => ({ isInClient: vi.fn(() => false), openWindow: vi.fn() }));
vi.mock("@line/liff", () => ({ default: liff }));

let unmount = () => {};

afterEach(async () => {
  unmount();
  vi.unstubAllGlobals();
  localStorage.clear();
  readKeptBoardAgain();
  vi.restoreAllMocks();
  liff.isInClient.mockReset().mockReturnValue(false);
  liff.openWindow.mockReset();
  await i18next.changeLanguage("en");
});

/** The note, for `me`, saving through the methods `overrides` give. */
function renderNote(overrides: Partial<ApiClient>, me: Me = TEST_ME) {
  const view = renderWithApi(<SettingsNote />, emptyApi(overrides), me);
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

/** Show 18+ stickers, the note's first switch. */
const switchOf = (host: HTMLElement) => {
  const found = host.querySelector<HTMLInputElement>('input[role="switch"]');
  if (!found) throw new Error("No switch on the note");
  return found;
};
const flip = (host: HTMLElement) => act(async () => switchOf(host).click());

const alert = (host: HTMLElement) => host.querySelector('[role="alert"]')?.textContent;

/** Each setting's status line, language first. */
const statuses = (host: HTMLElement) =>
  [...host.querySelectorAll('[role="status"]')].map((p) => p.textContent);

describe("the Settings note's language", () => {
  it("saves a choice to your account, keeps it on this phone, and switches the app to it in place", async () => {
    const setLanguageChoice = saving();
    const host = render(setLanguageChoice);
    await choose(host, "日本語");
    expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith("ja", "en");
    expect(readChosenLanguage()).toBe("ja");
    expect(currentLanguage()).toBe("ja");
    expect(option(host, "日本語").checked).toBe(true);
    expect(statuses(host)[0]).toBe(
      i18next.t(($) => $.stickerBoard.settings.language.applied, { language: "日本語" }),
    );
  });

  it("goes back to following LINE", async () => {
    keepChosenLanguage("ja");
    await i18next.changeLanguage("ja");
    const setLanguageChoice = saving();
    const host = render(setLanguageChoice, "ja");
    expect(option(host, "日本語").checked).toBe(true);
    await choose(host, "LINEと同じ（English）");
    expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith(null, "en");
    expect(readChosenLanguage()).toBeNull();
    expect(currentLanguage()).toBe("en");
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
    expect(currentLanguage()).toBe("en");
  });

  it("switches even when this phone can't keep the choice, and says so in the new language", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // A stand-in storage: spying on happy-dom's own leaves it unable to write for later tests.
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new DOMException("The storage is full", "QuotaExceededError");
      },
    });
    const host = render(saving());
    await choose(host, "日本語");
    expect(currentLanguage()).toBe("ja");
    expect(alert(host)).toContain(stickerBoard.settings.language.notKept.ja);
    expect(host.textContent).toContain("The storage is full");
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
  const keepABoard = () => keepBoard(TEST_ME.id, { owner: toPerson(TEST_OWNER), stickers: [] });

  it("is off until turned on, and says what it does", () => {
    const host = renderNote({});
    expect(switchOf(host).checked).toBe(false);
    expect(switchOf(host).closest("label")?.textContent).toBe("Show 18+ stickers");
    expect(host.textContent).toContain("For people 18 or older.");
  });

  it("saves it to your account, forgets the board kept on this phone, and says the stickers show", async () => {
    const setNsfwOptIn = savingOptIn();
    const host = renderNote({ setNsfwOptIn });
    keepABoard();
    await flip(host);
    expect(setNsfwOptIn).toHaveBeenCalledExactlyOnceWith(true);
    expect(switchOf(host).checked).toBe(true);
    expect(keptBoardFor(TEST_ME.id)).toBeNull();
    expect(statuses(host)).toEqual(["", stickerBoard.settings.nsfw.shown.en, ""]);
  });

  it("turns it off the same way, and says they're blurred now", async () => {
    const setNsfwOptIn = savingOptIn();
    const host = renderNote({ setNsfwOptIn }, { ...TEST_ME, nsfwOptIn: true });
    expect(switchOf(host).checked).toBe(true);
    await flip(host);
    expect(setNsfwOptIn).toHaveBeenCalledExactlyOnceWith(false);
    expect(statuses(host)).toEqual(["", stickerBoard.settings.nsfw.blurred.en, ""]);
  });

  it("says why it wasn't saved, and leaves the switch and the kept board as they were", async () => {
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
  });

  it("reads in Japanese", async () => {
    await i18next.changeLanguage("ja");
    const host = renderNote({});
    expect([...host.querySelectorAll("legend")].map((l) => l.textContent)).toEqual([
      "言語",
      "18+のシール",
      "入試",
    ]);
    expect(host.querySelector("label:has(input[role='switch'])")?.textContent).toBe(
      "18+のシールを表示する",
    );
  });
});

describe("the Settings note's Kyoto Seika Practice Mode", () => {
  const switchIn = (host: HTMLElement, setting: "kyoto-seika" | "kyoto-seika-dark") => {
    const found = host.querySelector<HTMLInputElement>(
      `[data-setting="${setting}"] > label input[role="switch"]`,
    );
    if (!found) throw new Error(`No ${setting} switch on the note`);
    return found;
  };
  const savingSwitches = () =>
    vi.fn<ApiClient["setKyotoSeikaPractice"]>((change) =>
      Promise.resolve({ ...TEST_ME, kyotoSeikaPractice: true, ...change }),
    );

  it("turns on in place: it saves, your tickets reload, it says so, and the dark subjects switch shows", async () => {
    const setKyotoSeikaPractice = savingSwitches();
    const tickets = vi.fn<ApiClient["tickets"]>(() => Promise.resolve(FRESH_TICKETS));
    const host = renderNote({ setKyotoSeikaPractice, tickets });
    expect(host.querySelector('[data-setting="kyoto-seika-dark"]')).toBeNull();
    await act(async () => switchIn(host, "kyoto-seika").click());
    expect(setKyotoSeikaPractice).toHaveBeenCalledExactlyOnceWith({ kyotoSeikaPractice: true });
    expect(switchIn(host, "kyoto-seika").checked).toBe(true);
    expect(tickets).toHaveBeenCalledTimes(2);
    expect(statuses(host)[2]).toBe(stickerBoard.settings.kyotoSeika.on.en);
    expect(switchIn(host, "kyoto-seika-dark").checked).toBe(false);
  });

  it("turns dark subjects on under it, leaving the mode as it is", async () => {
    const setKyotoSeikaPractice = savingSwitches();
    const host = renderNote({ setKyotoSeikaPractice }, { ...TEST_ME, kyotoSeikaPractice: true });
    await act(async () => switchIn(host, "kyoto-seika-dark").click());
    expect(setKyotoSeikaPractice).toHaveBeenCalledExactlyOnceWith({ kyotoSeikaDarkSubjects: true });
    expect(switchIn(host, "kyoto-seika-dark").checked).toBe(true);
    expect(switchIn(host, "kyoto-seika").checked).toBe(true);
  });

  it("names the mode for screen readers without its censor bar", () => {
    const host = renderNote({});
    expect(switchIn(host, "kyoto-seika").getAttribute("aria-label")).toBe(
      stickerBoard.settings.kyotoSeika.spokenName.en,
    );
  });

  it("opens the mode's note under its legend, and closes it", async () => {
    const host = renderNote({});
    const help = host.querySelector<HTMLButtonElement>(
      '[data-setting="kyoto-seika"] .settings-note__help',
    );
    const note = () => document.getElementById(help?.getAttribute("aria-controls") ?? "");
    expect(note()?.hidden).toBe(true);
    await act(async () => help?.click());
    expect(help?.getAttribute("aria-expanded")).toBe("true");
    expect(note()?.hidden).toBe(false);
    await act(async () => help?.click());
    expect(note()?.hidden).toBe(true);
  });

  it("opens its credit's Sources in LINE's own browser inside LINE's app", () => {
    liff.isInClient.mockReturnValue(true);
    const host = renderNote({});
    const sources = host.querySelector<HTMLAnchorElement>(".settings-note__credit a[href]");
    if (!sources) throw new Error("No Sources link in the credit");
    const tap = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => void sources.dispatchEvent(tap));
    expect(tap.defaultPrevented).toBe(true);
    expect(liff.openWindow).toHaveBeenCalledExactlyOnceWith({ url: sources.href, external: false });
  });
});

describe("the Settings note's saves", () => {
  /** A server that keeps your settings, so each save answers with the account as it then is. */
  function keepingServer() {
    let account = TEST_ME;
    const keep = (change: Partial<Me>) => {
      account = { ...account, ...change };
      return Promise.resolve(account);
    };
    return {
      setLanguageChoice: vi.fn<ApiClient["setLanguageChoice"]>((languageChoice, language) =>
        keep({ languageChoice, language: languageChoice ?? language }),
      ),
      setNsfwOptIn: vi.fn<ApiClient["setNsfwOptIn"]>((nsfwOptIn) => keep({ nsfwOptIn })),
    };
  }
  /** The 18+ setting's alert, under its switch. */
  const nsfwProblem = (host: HTMLElement) =>
    switchOf(host).closest("fieldset")?.querySelector('[role="alert"]')?.textContent;

  it("keeps a setting's failure while another setting saves, until that setting saves", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const server = keepingServer();
    server.setNsfwOptIn.mockRejectedValueOnce(
      new ApiError(0, { error: "network", detail: "Failed to fetch" }),
    );
    const host = renderNote(server);
    await flip(host);
    expect(nsfwProblem(host)).toContain("Your 18+ setting couldn’t be saved");

    await choose(host, "English");
    expect(nsfwProblem(host)).toContain("Your 18+ setting couldn’t be saved");
    expect(switchOf(host).checked).toBe(false);

    await flip(host);
    expect(nsfwProblem(host)).toBeUndefined();
    expect(switchOf(host).checked).toBe(true);
  });

  it("saves a setting changed while another saves once that one has, rather than dropping it", async () => {
    const server = keepingServer();
    let answerLanguage = () => {};
    const { setLanguageChoice } = server;
    server.setLanguageChoice = vi.fn<ApiClient["setLanguageChoice"]>(
      (...choice) =>
        new Promise((resolve) => {
          answerLanguage = () => resolve(setLanguageChoice(...choice));
        }),
    );
    const host = renderNote(server);
    await choose(host, "English");
    await flip(host);
    // It shows the change, says it's saving, and waits for the language's answer.
    expect(switchOf(host).checked).toBe(true);
    expect(statuses(host)[1]).toBe(stickerBoard.settings.saving.en);
    expect(server.setNsfwOptIn).not.toHaveBeenCalled();

    await act(async () => answerLanguage());
    expect(server.setNsfwOptIn).toHaveBeenCalledExactlyOnceWith(true);
    expect(option(host, "English").checked).toBe(true);
    expect(switchOf(host).checked).toBe(true);
    expect(statuses(host)).toEqual([
      i18next.t(($) => $.stickerBoard.settings.language.applied, { language: "English" }),
      stickerBoard.settings.nsfw.shown.en,
      "",
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
