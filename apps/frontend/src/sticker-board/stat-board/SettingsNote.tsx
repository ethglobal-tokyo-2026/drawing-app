import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { apiError } from "../../api/apiClient";
import { useMe } from "../../api/meContext";
import { useApi } from "../../api/useApi";
import { errorReason } from "../../i18n/errorMessage";
import { keepChosenLanguage, type Language } from "../../i18n/language";
import { lineLanguage } from "../../i18n/pageLanguage";
import { useTranslation } from "../../i18n/react";
import { useReducedMotion } from "../../ui/useReducedMotion";
import "./settings-note.css";

/** A language, or null to follow LINE's. */
type Choice = Language | null;

const CHOICES: readonly Choice[] = [null, "en", "ja"];

/** How much of the paper under its title peeks above the cork's foot, in px. */
const PEEK_UNDER_TITLE = 10;

type Status =
  | { step: "idle" }
  | { step: "saving"; choice: Choice }
  | { step: "failed"; problem: string };

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Sticks the note to the cork's foot with only its title showing, until it scrolls into view: CSS
 * tucks it down by the rest of its height, measured here whenever that changes. A sticky box keeps
 * clear of its scroller's padding, so the tuck reaches through the cork's too.
 *
 * Returns `reveal`, which scrolls the cork to its end, where the whole note shows. A tap on the tucked
 * note uses it, and so does focus, which the browser's own scrolling can't bring out of a tuck.
 */
function usePeek(note: RefObject<HTMLElement | null>, title: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const paper = note.current;
    const heading = title.current;
    if (!paper || !heading) return;
    const tuck = () => {
      const cork = paper.parentElement;
      const padding = cork ? parseFloat(getComputedStyle(cork).paddingBottom) || 0 : 0;
      const shown = heading.offsetTop + heading.offsetHeight + PEEK_UNDER_TITLE;
      const tucked = Math.max(0, paper.offsetHeight - shown + padding);
      paper.style.setProperty("--settings-tuck", `${tucked}px`);
    };
    tuck();
    const resized = new ResizeObserver(tuck);
    resized.observe(paper);
    return () => resized.disconnect();
  }, [note, title]);

  return () => {
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
    cork.scrollBy({ top: below + padding, behavior: reduced ? "auto" : "smooth" });
  };
}

/**
 * Your Settings, the last paper on your cork back. A language is saved to your account, then kept on
 * this phone for the first screen of the next start, and the app restarts in it, so text built
 * outside React follows too.
 */
export function SettingsNote({ restart = () => location.reload() }: { restart?: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const me = useMe();
  const id = useId();
  const note = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [saved, setSaved] = useState<Choice>(me.languageChoice);
  const [status, setStatus] = useState<Status>({ step: "idle" });
  const reveal = usePeek(note, title);

  const choose = async (choice: Choice) => {
    if (status.step === "saving") return;
    setStatus({ step: "saving", choice });
    try {
      await api.setLanguageChoice(choice);
    } catch (error) {
      const failure = apiError(error);
      console.error("The language choice wasn't saved", failure);
      const problem = t(($) => $.stickerBoard.settings.language.notSaved, {
        reason: errorReason(failure),
      });
      setStatus({ step: "failed", problem });
      return;
    }
    setSaved(choice);
    try {
      keepChosenLanguage(choice);
    } catch (error) {
      console.error("The saved language choice couldn't be kept on this phone", error);
      const problem = t(($) => $.stickerBoard.settings.language.notKept, { reason: reason(error) });
      setStatus({ step: "failed", problem });
      return;
    }
    restart();
  };

  const named = (language: Language) => t(($) => $.stickerBoard.settings.language.names[language]);
  const label = (choice: Choice) =>
    choice === null
      ? t(($) => $.stickerBoard.settings.language.sameAsLine, { language: named(lineLanguage()) })
      : named(choice);
  const checked = status.step === "saving" ? status.choice : saved;

  return (
    <section
      ref={note}
      className="stat-board__note settings-note"
      aria-labelledby={`${id}-title`}
      onClick={reveal}
      onFocus={reveal}
    >
      <div className="stat-board__paper">
        <h3 ref={title} className="settings-note__title" id={`${id}-title`}>
          {t(($) => $.stickerBoard.settings.title)}
        </h3>
        <fieldset className="settings-note__setting" aria-busy={status.step === "saving"}>
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
          <p className="fine settings-note__status" role="status">
            {status.step === "saving" ? t(($) => $.stickerBoard.settings.language.saving) : ""}
          </p>
          {status.step === "failed" && (
            <p className="settings-note__problem" role="alert">
              {status.problem}
            </p>
          )}
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
