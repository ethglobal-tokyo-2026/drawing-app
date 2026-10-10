// @vitest-environment happy-dom
import type { Me } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME, TEST_OWNER } from "../../api/testing";
import { refusingStorage, SWITCH } from "../../ui/testing";
import { toPerson } from "../../api/views";
import { errors } from "../../i18n/strings/errors";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import { currentLanguage, i18next } from "../../i18n/i18n";
import { readChosenLanguage } from "../../i18n/language";
import { forgetsSoFar, keepBoard, keptBoardFor, readKeptBoardAgain } from "../lastBoard";
// The help sheet loads lazily; importing it here keeps that load out of the tap's short wait, which a busy
// machine stretched past its limit.
import "../../kyoto-seika/KyotoSeikaHelp";
import { SettingsNote } from "./SettingsNote";
import { statsClearPeek } from "./settingsPeek";

let unmount = () => {};

afterEach(async () => {
  unmount();
  vi.unstubAllGlobals();
  localStorage.clear();
  readKeptBoardAgain();
  vi.restoreAllMocks();
  await i18next.changeLanguage("en");
});

/** The note, for `me`, saving through the methods `overrides` give. */
function renderNote(overrides: Partial<ApiClient>, me: Me = TEST_ME) {
  const view = renderWithApi(<SettingsNote />, emptyApi(overrides), me);
  unmount = view.unmount;
  return view.host;
}

/** The note, saving the language through `setLanguageChoice`. */
const render = (setLanguageChoice: ApiClient["setLanguageChoice"]) =>
  renderNote({ setLanguageChoice });

const saving = () =>
  vi.fn<ApiClient["setLanguageChoice"]>((language) => Promise.resolve({ ...TEST_ME, language }));

/** The language's choices, a radio group. */
const languages = (host: HTMLElement) => {
  const found = host.querySelector<HTMLElement>('[data-setting="language"] [role="radiogroup"]');
  if (!found) throw new Error("No language choices on the note");
  return found;
};
const languageRadios = (host: HTMLElement) => [
  ...languages(host).querySelectorAll<HTMLElement>('[role="radio"]'),
];

/** The language picked, as it names it. */
const picked = (host: HTMLElement) =>
  languageRadios(host).find((radio) => radio.getAttribute("aria-checked") === "true")?.textContent;

const choose = (host: HTMLElement, label: string) =>
  act(async () => {
    const choice = languageRadios(host).find((radio) => radio.textContent === label);
    if (!choice) throw new Error(`No language ${label}`);
    choice.click();
  });

/** Show 18+ stickers, the note's first switch. */
const switchOf = (host: HTMLElement) => {
  const found = host.querySelector<HTMLInputElement>(SWITCH);
  if (!found) throw new Error("No switch on the note");
  return found;
};
const flip = (host: HTMLElement) => act(async () => switchOf(host).click());

const alert = (host: HTMLElement) => host.querySelector('[role="alert"]')?.textContent;

/** Whether the setting named `setting` is marked busy, saving. */
const busy = (host: HTMLElement, setting: string) =>
  host.querySelector(`[data-setting="${setting}"]`)?.getAttribute("aria-busy");

/** A save that waits for `answer`, as a slow server does. */
function slowly<T>(answer: T) {
  let land = () => {};
  const request = vi.fn(() => new Promise<T>((resolve) => (land = () => resolve(answer))));
  return { request, land: () => act(async () => land()) };
}

describe("the Settings note's language", () => {
  it("saves a choice to your account, keeps it on this phone, and switches the app to it in place", async () => {
    const setLanguageChoice = saving();
    const host = render(setLanguageChoice);
    await choose(host, "日本語");
    expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith("ja");
    expect(readChosenLanguage()).toBe("ja");
    expect(currentLanguage()).toBe("ja");
    expect(picked(host)).toBe("日本語");
    // The choice says it: no status line.
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it("shows the choice while it saves, busy and taking no other pick, then takes picks again", async () => {
    const { request, land } = slowly({ ...TEST_ME, language: "ja" as const });
    const host = render(request);
    await choose(host, "日本語");
    expect(picked(host)).toBe("日本語");
    expect(busy(host, "language")).toBe("true");
    expect(languages(host).getAttribute("aria-disabled")).toBe("true");
    await choose(host, "English");
    expect(request).toHaveBeenCalledOnce();

    await land();
    expect(busy(host, "language")).toBe("false");
    expect(languages(host).hasAttribute("aria-disabled")).toBe(false);
    expect(picked(host)).toBe("日本語");
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it("says why a choice wasn't saved, and leaves this phone's choice and the app as they were", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const offline = new ApiError(0, { error: "network", detail: "Failed to fetch" });
    const host = render(() => Promise.reject(offline));
    await choose(host, "日本語");
    expect(alert(host)).toContain(errors.network.en);
    expect(host.textContent).toContain("Failed to fetch");
    expect(readChosenLanguage()).toBeNull();
    expect(picked(host)).toBe("English");
    expect(currentLanguage()).toBe("en");
  });

  it("switches even when this phone can't keep the choice, and says so in the new language", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("localStorage", refusingStorage);
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
    const name = languages(host).getAttribute("aria-labelledby") ?? "";
    expect(document.getElementById(name)?.textContent).toBe("言語");
    expect(languageRadios(host).map((radio) => [radio.textContent, radio.lang])).toEqual([
      ["English", "en"],
      ["日本語", "ja"],
    ]);
  });
});

describe("the Settings note's 18+ switch", () => {
  const savingOptIn = () =>
    vi.fn<ApiClient["setNsfwOptIn"]>((nsfwOptIn) => Promise.resolve({ ...TEST_ME, nsfwOptIn }));
  const keepABoard = () =>
    keepBoard(TEST_ME.id, { owner: toPerson(TEST_OWNER), stickers: [] }, forgetsSoFar());

  it("is off until turned on", () => {
    const host = renderNote({});
    expect(switchOf(host).checked).toBe(false);
    expect(switchOf(host).closest("label")?.textContent).toBe("Show 18+ stickers");
  });

  it("saves it to your account, forgets the board kept on this phone, and shows it on", async () => {
    const setNsfwOptIn = savingOptIn();
    const host = renderNote({ setNsfwOptIn });
    keepABoard();
    await flip(host);
    expect(setNsfwOptIn).toHaveBeenCalledExactlyOnceWith(true);
    expect(switchOf(host).checked).toBe(true);
    expect(keptBoardFor(TEST_ME.id)).toBeNull();
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it("turns it off the same way", async () => {
    const setNsfwOptIn = savingOptIn();
    const host = renderNote({ setNsfwOptIn }, { ...TEST_ME, nsfwOptIn: true });
    expect(switchOf(host).checked).toBe(true);
    await flip(host);
    expect(setNsfwOptIn).toHaveBeenCalledExactlyOnceWith(false);
    expect(switchOf(host).checked).toBe(false);
  });

  it("shows its new state while it saves, busy and taking no flip, then takes flips again", async () => {
    const { request, land } = slowly({ ...TEST_ME, nsfwOptIn: true });
    const host = renderNote({ setNsfwOptIn: request });
    await flip(host);
    expect(switchOf(host).checked).toBe(true);
    expect(switchOf(host).getAttribute("aria-disabled")).toBe("true");
    expect(busy(host, "nsfw")).toBe("true");
    await flip(host);
    expect(switchOf(host).checked).toBe(true);
    expect(request).toHaveBeenCalledOnce();

    await land();
    expect(busy(host, "nsfw")).toBe("false");
    expect(switchOf(host).hasAttribute("aria-disabled")).toBe(false);
    expect(switchOf(host).checked).toBe(true);
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
    expect(busy(host, "nsfw")).toBe("false");
    expect(keptBoardFor(TEST_ME.id)).not.toBeNull();
  });

  it("reads in Japanese", async () => {
    await i18next.changeLanguage("ja");
    const host = renderNote({});
    expect(host.querySelector("label:has(input[role='switch'])")?.textContent).toBe(
      "18+のシールを表示する",
    );
  });
});

describe("the Settings note's Kyoto Seika Practice Mode", () => {
  const row = (host: HTMLElement) => {
    const found = host.querySelector<HTMLElement>('[data-setting="kyoto-seika"]');
    if (!found) throw new Error("No Kyoto Seika Practice Mode on the note");
    return found;
  };
  const switchIn = (host: HTMLElement) => {
    const found = row(host).querySelector<HTMLInputElement>(SWITCH);
    if (!found) throw new Error("No Kyoto Seika Practice Mode switch on the note");
    return found;
  };
  const help = (host: HTMLElement) =>
    row(host).querySelector<HTMLButtonElement>(
      `button[aria-label="${stickerBoard.settings.kyotoSeika.help.en}"]`,
    );

  it("turns on in place: it saves, your tickets reload, and the switch shows it", async () => {
    const setKyotoSeikaPractice = vi.fn<ApiClient["setKyotoSeikaPractice"]>((change) =>
      Promise.resolve({ ...TEST_ME, ...change }),
    );
    const tickets = vi.fn<ApiClient["tickets"]>(() => Promise.resolve(FRESH_TICKETS));
    const host = renderNote({ setKyotoSeikaPractice, tickets });
    await act(async () => switchIn(host).click());
    expect(setKyotoSeikaPractice).toHaveBeenCalledExactlyOnceWith({ kyotoSeikaPractice: true });
    expect(switchIn(host).checked).toBe(true);
    expect(tickets).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it("names its switch for screen readers without its censor bar", () => {
    const host = renderNote({});
    expect(switchIn(host).getAttribute("aria-label")).toBe(
      stickerBoard.settings.kyotoSeika.spokenName.en,
    );
  });

  it("has its help right after its name, and a tap on it opens the help sheet and leaves the switch alone", async () => {
    const host = renderNote({});
    const button = help(host);
    const sheet = () => host.querySelector("[role=dialog]");
    expect(button?.previousElementSibling?.matches(`label[for="${switchIn(host).id}"]`)).toBe(true);
    expect(sheet()).toBeNull();
    await act(async () => button?.click());
    // Its code comes in through the lazy import on the first tap.
    await vi.waitFor(() =>
      expect(sheet()?.getAttribute("aria-label")).toBe(
        stickerBoard.settings.kyotoSeika.spokenName.en,
      ),
    );
    expect(switchIn(host).checked).toBe(false);
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
      setLanguageChoice: vi.fn<ApiClient["setLanguageChoice"]>((language) => keep({ language })),
      setNsfwOptIn: vi.fn<ApiClient["setNsfwOptIn"]>((nsfwOptIn) => keep({ nsfwOptIn })),
    };
  }
  /** The 18+ setting's alert, under its switch. */
  const nsfwProblem = (host: HTMLElement) =>
    switchOf(host).closest(".settings-note__setting")?.querySelector('[role="alert"]')?.textContent;

  it("keeps a setting's failure while another setting saves, until that setting saves", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const server = keepingServer();
    server.setNsfwOptIn.mockRejectedValueOnce(
      new ApiError(0, { error: "network", detail: "Failed to fetch" }),
    );
    const host = renderNote(server);
    await flip(host);
    expect(nsfwProblem(host)).toContain("Your 18+ setting couldn’t be saved");

    // The failure stays, in the app's new language.
    await choose(host, "日本語");
    expect(nsfwProblem(host)).toContain("18+の設定を保存できなかった");
    expect(switchOf(host).checked).toBe(false);

    await flip(host);
    expect(nsfwProblem(host)).toBeUndefined();
    expect(switchOf(host).checked).toBe(true);
  });

  it("keeps a save's progress and failure for the note you find back on the board", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let refuse = () => {};
    const api = emptyApi({
      setNsfwOptIn: () =>
        new Promise((_, reject) => {
          refuse = () => reject(new ApiError(0, { error: "network", detail: "Failed to fetch" }));
        }),
    });
    // Another tab unmounts the board, and the note with it.
    const visit = () => {
      const view = renderWithApi(<SettingsNote />, api);
      unmount = view.unmount;
      return view.host;
    };
    await flip(visit());
    unmount();

    // Back while it saves, the switch shows the change on its way.
    let host = visit();
    expect(busy(host, "nsfw")).toBe("true");
    expect(switchOf(host).checked).toBe(true);
    unmount();

    // It fails while you're away again; back on the board, the note says why.
    await act(async () => refuse());
    host = visit();
    expect(alert(host)).toContain(errors.network.en);
    expect(switchOf(host).checked).toBe(false);
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
    await choose(host, "日本語");
    await flip(host);
    // It shows the change, busy, and waits for the language's answer.
    expect(switchOf(host).checked).toBe(true);
    expect(busy(host, "nsfw")).toBe("true");
    expect(server.setNsfwOptIn).not.toHaveBeenCalled();

    await act(async () => answerLanguage());
    expect(server.setNsfwOptIn).toHaveBeenCalledExactlyOnceWith(true);
    expect(picked(host)).toBe("日本語");
    expect(switchOf(host).checked).toBe(true);
    expect([busy(host, "language"), busy(host, "nsfw")]).toEqual(["false", "false"]);
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
