import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { apiError } from "../../api/apiClient";
import { useMe } from "../../api/meContext";
import { useApi } from "../../api/useApi";
import { problemOf, type Problem } from "../../i18n/errorMessage";
import { keepChosenLanguage, type Language } from "../../i18n/language";
import { lineLanguage } from "../../i18n/pageLanguage";
import { useTranslation } from "../../i18n/react";
import { ErrorLine } from "../../ui/ErrorLine";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { forgetBoard } from "../lastBoard";
import { reopenOnSettingsNextStart } from "./reopenOnSettings";
import { statsClearPeek } from "./settingsPeek";
import "./settings-note.css";

/** A language, or null to follow LINE's. */
type Choice = Language | null;

const CHOICES: readonly Choice[] = [null, "en", "ja"];

/** How much of the paper under its title peeks above the cork's foot, in px. */
const PEEK_UNDER_TITLE = 10;

/** A change to one setting: a language choice, or Show 18+ stickers on or off. */
type Change = { setting: "language"; choice: Choice } | { setting: "nsfw"; on: boolean };

/** One setting saves at a time, since a save that lands restarts the app. */
type Status =
  | { step: "idle" }
  | { step: "saving"; change: Change }
  | { step: "failed"; setting: Change["setting"]; problem: Problem };

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
 * The app restarted for a change in Settings, so the note comes into view as the cork shows and stays
 * there while the figures above it load and change height, until the person touches the cork.
 */
function useOpenInView(
  note: RefObject<HTMLElement | null>,
  reveal: (behavior?: ScrollBehavior) => void,
  opened: boolean,
) {
  const revealNow = useEffectEvent(() => reveal("instant"));
  useEffect(() => {
    const cork = note.current?.parentElement;
    const above = cork?.querySelector(".stat-board__stats");
    if (!opened || !cork || !above) return;
    revealNow();
    const resized = new ResizeObserver(revealNow);
    resized.observe(above);
    const letGo = () => resized.disconnect();
    const touches = ["pointerdown", "wheel", "keydown"] as const;
    for (const type of touches) cork.addEventListener(type, letGo, { once: true, passive: true });
    return () => {
      resized.disconnect();
      for (const type of touches) cork.removeEventListener(type, letGo);
    };
  }, [note, opened]);
}

/** A setting's status line, which screen readers hear while it saves, and why it wasn't saved. */
function SaveStatus({ saving, problem }: { saving: boolean; problem: Problem | null }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="fine settings-note__status" role="status">
        {saving ? t(($) => $.stickerBoard.settings.saving) : ""}
      </p>
      {problem && (
        <ErrorLine className="settings-note__problem" detail={problem.detail}>
          {problem.message}
        </ErrorLine>
      )}
    </>
  );
}

/**
 * Your Settings, the first paper under the stats on your cork back. A language is saved to your
 * account, then kept on this phone for the first screen of the next start, and the app restarts in
 * it, so text built outside React follows too. Show 18+ stickers, the NSFW opt-in, is saved to your
 * account, and the app restarts without the board this phone kept, whose stickers showed by the old
 * setting. The start after a change opens on this note, so the person sees it took (`openedInView`).
 */
export function SettingsNote({
  restart = () => location.reload(),
  openedInView = false,
}: {
  restart?: () => void;
  openedInView?: boolean;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const me = useMe();
  const id = useId();
  const note = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [saved, setSaved] = useState<Choice>(me.languageChoice);
  const [status, setStatus] = useState<Status>({ step: "idle" });
  const reveal = usePeek(note, title);
  useOpenInView(note, reveal, openedInView);

  /** Saves a change to your account; false, with the note saying why, when it wasn't saved. */
  const save = async (change: Change, send: () => Promise<unknown>) => {
    if (status.step === "saving") return false;
    setStatus({ step: "saving", change });
    try {
      await send();
      return true;
    } catch (error) {
      const failure = apiError(error);
      const { message: reason, detail } = problemOf(failure);
      const [what, message] =
        change.setting === "language"
          ? ["language choice", t(($) => $.stickerBoard.settings.language.notSaved, { reason })]
          : ["NSFW opt-in", t(($) => $.stickerBoard.settings.nsfw.notSaved, { reason })];
      console.error(`The ${what} wasn't saved`, failure);
      setStatus({ step: "failed", setting: change.setting, problem: { message, detail } });
      return false;
    }
  };

  const choose = async (choice: Choice) => {
    if (!(await save({ setting: "language", choice }, () => api.setLanguageChoice(choice)))) return;
    setSaved(choice);
    try {
      keepChosenLanguage(choice);
    } catch (error) {
      console.error("The saved language choice couldn't be kept on this phone", error);
      const { detail } = problemOf(error);
      const message = t(($) => $.stickerBoard.settings.language.notKept);
      setStatus({ step: "failed", setting: "language", problem: { message, detail } });
      return;
    }
    reopenOnSettingsNextStart();
    restart();
  };

  const showNsfw = async (on: boolean) => {
    if (!(await save({ setting: "nsfw", on }, () => api.setNsfwOptIn(on)))) return;
    forgetBoard();
    reopenOnSettingsNextStart();
    restart();
  };

  const named = (language: Language) => t(($) => $.stickerBoard.settings.language.names[language]);
  const label = (choice: Choice) =>
    choice === null
      ? t(($) => $.stickerBoard.settings.language.sameAsLine, { language: named(lineLanguage()) })
      : named(choice);
  const saving = status.step === "saving" ? status.change : null;
  const problemOn = (setting: Change["setting"]) =>
    status.step === "failed" && status.setting === setting ? status.problem : null;
  const checked = saving?.setting === "language" ? saving.choice : saved;
  const nsfwOn = saving?.setting === "nsfw" ? saving.on : me.nsfwOptIn;

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
        <fieldset className="settings-note__setting" aria-busy={saving?.setting === "language"}>
          <legend className="fine settings-note__legend">
            {t(($) => $.stickerBoard.settings.language.title)}
          </legend>
          {CHOICES.map((choice) => (
            <label key={choice ?? "line"} className="settings-note__option">
              <input
                type="radio"
                name={`${id}-language`}
                checked={checked === choice}
                onChange={() => void choose(choice)}
              />
              {/* A language's own name is in that language, for screen readers too. */}
              <span lang={choice ?? undefined}>{label(choice)}</span>
            </label>
          ))}
          <p className="fine settings-note__restarts">
            {t(($) => $.stickerBoard.settings.language.restarts)}
          </p>
          <SaveStatus saving={saving?.setting === "language"} problem={problemOn("language")} />
        </fieldset>
        <fieldset className="settings-note__setting" aria-busy={saving?.setting === "nsfw"}>
          <legend className="fine settings-note__legend">
            {t(($) => $.stickerBoard.settings.nsfw.title)}
          </legend>
          <label className="settings-note__option settings-note__switch">
            <span>{t(($) => $.stickerBoard.settings.nsfw.show)}</span>
            <input
              type="checkbox"
              role="switch"
              checked={nsfwOn}
              aria-describedby={`${id}-nsfw-about ${id}-nsfw-restarts`}
              onChange={(e) => void showNsfw(e.currentTarget.checked)}
            />
          </label>
          <p className="fine settings-note__about" id={`${id}-nsfw-about`}>
            {t(($) => $.stickerBoard.settings.nsfw.about)}
          </p>
          <p className="fine settings-note__restarts" id={`${id}-nsfw-restarts`}>
            {t(($) => $.stickerBoard.settings.nsfw.restarts)}
          </p>
          <SaveStatus saving={saving?.setting === "nsfw"} problem={problemOn("nsfw")} />
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
