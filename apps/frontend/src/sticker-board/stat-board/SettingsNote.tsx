import type { Me } from "@drawing-app/api/client";
import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { apiError } from "../../api/apiClient";
import { useMe, useSetMe } from "../../api/meContext";
import { useApi } from "../../api/useApi";
import { problemOf } from "../../i18n/errorMessage";
import { currentLanguage } from "../../i18n/i18n";
import { keepChosenLanguage, type Language } from "../../i18n/language";
import { followLanguageChoice, lineLanguage } from "../../i18n/pageLanguage";
import { useTranslation } from "../../i18n/react";
import { ErrorLine } from "../../ui/ErrorLine";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { forget as forgetKeptBoard } from "../lastBoard";
import { statsClearPeek } from "./settingsPeek";
import "./settings-note.css";

/** A language, or null to follow LINE's. */
type Choice = Language | null;

const CHOICES: readonly Choice[] = [null, "en", "ja"];

/** How much of the paper under its title peeks above the cork's foot, in px. */
const PEEK_UNDER_TITLE = 10;

/** The settings on the note, each saved to your account and applied in place; one saves at a time. */
type Setting = "language" | "nsfw";
/** The account's settings as the note shows them: a saving one shows its new value. */
type Shown = Pick<Me, "languageChoice" | "nsfwOptIn">;
/** Why a setting didn't take: kept as it failed, so its words follow the app's language. */
type Failure = { kind: "notSaved" | "notKept"; error: unknown };
type Status =
  | { step: "idle" }
  | { step: "saving"; setting: Setting; to: Partial<Shown> }
  | { step: "applied"; setting: Setting }
  | { step: "failed"; setting: Setting; failure: Failure };

/**
 * Sticks the note to the cork's foot with only its title showing, until it scrolls into view: CSS
 * tucks it down by the rest of its height, measured here whenever that changes. A sticky box keeps
 * clear of its scroller's padding, so the tuck reaches through the cork's too. Where the stats run
 * into that band it stays below them instead, and scrolling finds it.
 *
 * Returns `reveal`, which scrolls the cork until the whole note shows above its foot. A tap on the
 * tucked note uses it, and so does focus, which the browser's own scrolling can't bring out of a tuck.
 */
function usePeek(note: RefObject<HTMLElement | null>, title: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const paper = note.current;
    const heading = title.current;
    if (!paper || !heading) return;
    const cork = paper.parentElement;
    const stats = cork?.querySelector<HTMLElement>(".stat-board__stats");
    const tuck = () => {
      const padding = cork ? parseFloat(getComputedStyle(cork).paddingBottom) || 0 : 0;
      const shown = heading.offsetTop + heading.offsetHeight + PEEK_UNDER_TITLE;
      const tucked = Math.max(0, paper.offsetHeight - shown + padding);
      paper.style.setProperty("--settings-tuck", `${tucked}px`);
      if (cork && stats)
        paper.toggleAttribute(
          "data-below-stats",
          !statsClearPeek(cork.clientHeight, stats.offsetTop + stats.offsetHeight, shown),
        );
    };
    tuck();
    const resized = new ResizeObserver(tuck);
    for (const el of [paper, cork, stats]) if (el) resized.observe(el);
    return () => resized.disconnect();
  }, [note, title]);

  return (behavior: ScrollBehavior = reduced ? "auto" : "smooth") => {
    const paper = note.current;
    const cork = paper?.parentElement;
    // Tucked, or partly scrolled in, the note's foot is below the cork's.
    if (!paper || !cork) return;
    const edge = cork.getBoundingClientRect().bottom;
    if (paper.getBoundingClientRect().bottom <= edge + 1) return;
    // Unstuck for a moment, it measures where it lies in the cork, which may go on past it.
    paper.style.setProperty("position", "relative");
    const below = paper.getBoundingClientRect().bottom - edge;
    paper.style.removeProperty("position");
    const padding = parseFloat(getComputedStyle(cork).paddingBottom) || 0;
    cork.scrollBy({ top: below + padding, behavior });
  };
}

/**
 * Your Settings, the first paper under the stats on your cork back. Each setting saves to your account
 * and applies in place: `me` takes the server's answer, and every screen follows it. A language is
 * also kept on this phone for the first screens of the next start.
 */
export function SettingsNote() {
  const { t } = useTranslation();
  const api = useApi();
  const me = useMe();
  const setMe = useSetMe();
  const id = useId();
  const note = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState<Status>({ step: "idle" });
  const reveal = usePeek(note, title);

  /** Saves a setting, then applies it: `me` takes the answer, and `apply` does what it changes on this phone. */
  const save = async (
    setting: Setting,
    to: Partial<Shown>,
    request: () => Promise<Me>,
    apply: () => Promise<Failure | null> | Failure | null,
  ) => {
    if (status.step === "saving") return;
    setStatus({ step: "saving", setting, to });
    let saved: Me;
    try {
      saved = await request();
    } catch (error) {
      const failure = apiError(error);
      console.error(`The ${setting} setting wasn't saved`, failure);
      setStatus({ step: "failed", setting, failure: { kind: "notSaved", error: failure } });
      return;
    }
    setMe(saved);
    const failure = await apply();
    setStatus(failure ? { step: "failed", setting, failure } : { step: "applied", setting });
  };

  const choose = (choice: Choice) =>
    save(
      "language",
      { languageChoice: choice },
      () => api.setLanguageChoice(choice, lineLanguage()),
      async () => {
        let failure: Failure | null = null;
        try {
          keepChosenLanguage(choice);
        } catch (error) {
          // The app switches anyway: only the next start's screens before sign-in are in the old language.
          console.error("The saved language choice couldn't be kept on this phone", error);
          failure = { kind: "notKept", error };
        }
        await followLanguageChoice(choice);
        return failure;
      },
    );

  const switchNsfw = (nsfwOptIn: boolean) =>
    save(
      "nsfw",
      { nsfwOptIn },
      () => api.setNsfwOptIn(nsfwOptIn),
      () => {
        // Its images were picked for the other setting; screens follow `me` themselves.
        forgetKeptBoard();
        return null;
      },
    );

  const named = (language: Language) => t(($) => $.stickerBoard.settings.language.names[language]);
  const label = (choice: Choice) =>
    choice === null
      ? t(($) => $.stickerBoard.settings.language.sameAsLine, { language: named(lineLanguage()) })
      : named(choice);
  const shown: Shown = status.step === "saving" ? { ...me, ...status.to } : me;
  const saving = (setting: Setting) => status.step === "saving" && status.setting === setting;
  /** A setting's status line: saving, then what took, in the app's language now. */
  const statusLine = (setting: Setting) => {
    if (saving(setting)) return t(($) => $.stickerBoard.settings.saving);
    if (status.step !== "applied" || status.setting !== setting) return "";
    if (setting === "language")
      return t(($) => $.stickerBoard.settings.language.applied, {
        language: named(currentLanguage()),
      });
    return me.nsfwOptIn
      ? t(($) => $.stickerBoard.settings.nsfw.shown)
      : t(($) => $.stickerBoard.settings.nsfw.blurred);
  };
  /** Why a setting didn't take, in the app's language now. */
  const problem = (setting: Setting) => {
    if (status.step !== "failed" || status.setting !== setting) return null;
    const { message, detail } = problemOf(status.failure.error);
    const words =
      status.failure.kind === "notKept"
        ? t(($) => $.stickerBoard.settings.language.notKept)
        : t(($) => $.stickerBoard.settings[setting].notSaved, { reason: message });
    return (
      <ErrorLine className="settings-note__problem" detail={detail}>
        {words}
      </ErrorLine>
    );
  };

  return (
    <section
      ref={note}
      className="stat-board__note settings-note"
      aria-labelledby={`${id}-title`}
      onClick={() => reveal()}
      onFocus={() => reveal()}
    >
      <div className="stat-board__paper">
        <h3 ref={title} className="settings-note__title" id={`${id}-title`}>
          {t(($) => $.stickerBoard.settings.title)}
        </h3>
        <fieldset className="settings-note__setting" aria-busy={saving("language")}>
          <legend className="fine settings-note__legend">
            {t(($) => $.stickerBoard.settings.language.title)}
          </legend>
          {CHOICES.map((choice) => (
            <label key={choice ?? "line"} className="settings-note__option">
              <input
                type="radio"
                name={`${id}-language`}
                checked={shown.languageChoice === choice}
                onChange={() => void choose(choice)}
              />
              {/* A language's own name is in that language, for screen readers too. */}
              <span lang={choice ?? undefined}>{label(choice)}</span>
            </label>
          ))}
          <p className="fine settings-note__status" role="status">
            {statusLine("language")}
          </p>
          {problem("language")}
        </fieldset>
        <fieldset className="settings-note__setting" aria-busy={saving("nsfw")}>
          <legend className="fine settings-note__legend">
            {t(($) => $.stickerBoard.settings.nsfw.title)}
          </legend>
          <label className="settings-note__option settings-note__switch">
            <span>{t(($) => $.stickerBoard.settings.nsfw.show)}</span>
            <input
              type="checkbox"
              role="switch"
              checked={shown.nsfwOptIn}
              aria-describedby={`${id}-nsfw-about`}
              onChange={() => void switchNsfw(!shown.nsfwOptIn)}
            />
          </label>
          <p className="fine settings-note__about" id={`${id}-nsfw-about`}>
            {t(($) => $.stickerBoard.settings.nsfw.about)}
          </p>
          <p className="fine settings-note__status" role="status">
            {statusLine("nsfw")}
          </p>
          {problem("nsfw")}
        </fieldset>
      </div>
      <i
        className="stat-board__washi settings-note__washi settings-note__washi--start"
        aria-hidden
      />
      <i className="stat-board__washi settings-note__washi settings-note__washi--end" aria-hidden />
    </section>
  );
}
