import {
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
  KYOTO_SEIKA_TIME_USED_S,
  type Me,
} from "@drawing-app/api/client";
import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { apiError } from "../../api/apiClient";
import { useMe, useSetMe } from "../../api/meContext";
import { useApi } from "../../api/useApi";
import { problemOf } from "../../i18n/errorMessage";
import { currentLanguage } from "../../i18n/i18n";
import { keepChosenLanguage, type Language } from "../../i18n/language";
import { followLanguageChoice, lineLanguage } from "../../i18n/pageLanguage";
import { Trans, useTranslation } from "../../i18n/react";
import { CaretDown, Question } from "../../icons";
import { CensorBar } from "../../kyoto-seika/CensorBar";
import { openLinkInLine } from "../../line/openLink";
import { useTickets } from "../../tickets/useTickets";
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

/**
 * The settings on the note, each saved to your account and applied in place. One saves at a time, in
 * the order they were changed, so each answer is the account as it then is.
 */
type Setting = "language" | "nsfw" | "kyotoSeika" | "kyotoSeikaDark";
/** The account's settings as the note shows them: a saving one shows its new value. */
type Shown = Pick<
  Me,
  "languageChoice" | "nsfwOptIn" | "kyotoSeikaPractice" | "kyotoSeikaDarkSubjects"
>;
/** Why a setting didn't take: kept as it failed, so its words follow the app's language. */
type Failure = { kind: "notSaved" | "notKept"; error: unknown };
/** A setting's last change, until it's changed again: saving, waiting its turn included, then in place or why not. */
type Status =
  | { step: "saving"; to: Partial<Shown> }
  | { step: "applied" }
  | { step: "failed"; failure: Failure };

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
 * Your Settings, the first paper under the stats on your stat board. Each setting saves to your account
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
  const [statuses, setStatuses] = useState<Partial<Record<Setting, Status>>>({});
  /** The saves, each run once the ones changed before it have. */
  const saves = useRef(Promise.resolve());
  /** Each setting's latest change: only its outcome is that setting's status. */
  const latestChanges = useRef(new Map<Setting, object>());
  const [aboutOpen, setAboutOpen] = useState(false);
  const { refresh: refreshTickets } = useTickets();
  const reveal = usePeek(note, title);

  /**
   * Saves a setting after the changes before it, then applies it: `me` takes the answer, and `apply`
   * does what it changes on this phone, returning what it couldn't do rather than throwing.
   */
  const save = (
    setting: Setting,
    to: Partial<Shown>,
    request: () => Promise<Me>,
    apply: () => Promise<Failure | null> | Failure | null,
  ) => {
    const change = {};
    latestChanges.current.set(setting, change);
    const settle = (status: Status) => {
      if (latestChanges.current.get(setting) === change)
        setStatuses((all) => ({ ...all, [setting]: status }));
    };
    settle({ step: "saving", to });
    saves.current = saves.current.then(async () => {
      let saved: Me;
      try {
        saved = await request();
      } catch (error) {
        const failure = apiError(error);
        console.error(`The ${setting} setting wasn't saved`, failure);
        settle({ step: "failed", failure: { kind: "notSaved", error: failure } });
        return;
      }
      setMe(saved);
      const failure = await apply();
      settle(failure ? { step: "failed", failure } : { step: "applied" });
    });
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

  const switchKyotoSeika = (kyotoSeikaPractice: boolean) =>
    save(
      "kyotoSeika",
      { kyotoSeikaPractice },
      () => api.setKyotoSeikaPractice({ kyotoSeikaPractice }),
      () => {
        // The day's allowance follows the mode at the next spend, so the Draw key's ticket shows it now.
        refreshTickets();
        return null;
      },
    );

  const switchDark = (kyotoSeikaDarkSubjects: boolean) =>
    save(
      "kyotoSeikaDark",
      { kyotoSeikaDarkSubjects },
      () => api.setKyotoSeikaPractice({ kyotoSeikaDarkSubjects }),
      () => null,
    );

  const named = (language: Language) => t(($) => $.stickerBoard.settings.language.names[language]);
  const label = (choice: Choice) =>
    choice === null
      ? t(($) => $.stickerBoard.settings.language.sameAsLine, { language: named(lineLanguage()) })
      : named(choice);
  const shown: Shown = Object.values(statuses).reduce<Shown>(
    (all, status) => (status?.step === "saving" ? { ...all, ...status.to } : all),
    me,
  );
  const saving = (setting: Setting) => statuses[setting]?.step === "saving";
  /** A setting's status line: saving, then what took, in the app's language now. */
  const statusLine = (setting: Setting) => {
    if (saving(setting)) return t(($) => $.stickerBoard.settings.saving);
    if (statuses[setting]?.step !== "applied") return "";
    if (setting === "language")
      return t(($) => $.stickerBoard.settings.language.applied, {
        language: named(currentLanguage()),
      });
    if (setting === "kyotoSeika")
      return me.kyotoSeikaPractice
        ? t(($) => $.stickerBoard.settings.kyotoSeika.on)
        : t(($) => $.stickerBoard.settings.kyotoSeika.off);
    if (setting === "kyotoSeikaDark") return "";
    return me.nsfwOptIn
      ? t(($) => $.stickerBoard.settings.nsfw.shown)
      : t(($) => $.stickerBoard.settings.nsfw.blurred);
  };
  /** Why a setting didn't take, in the app's language now. */
  const problem = (setting: Setting) => {
    const status = statuses[setting];
    if (status?.step !== "failed") return null;
    const { message, detail } = problemOf(status.failure.error);
    // Both Kyoto Seika Practice Mode switches say it in the mode's words.
    const strings = setting === "kyotoSeikaDark" ? "kyotoSeika" : setting;
    const words =
      status.failure.kind === "notKept"
        ? t(($) => $.stickerBoard.settings.language.notKept)
        : t(($) => $.stickerBoard.settings[strings].notSaved, { reason: message });
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
        <div className="settings-note__setting" aria-busy={saving("language")}>
          {/* One row with its choice at the end. The select lies unseen over the whole row, so a tap
              anywhere on it opens the phone's own list of choices. */}
          <div className="settings-note__option settings-note__choice">
            <span id={`${id}-language`}>{t(($) => $.stickerBoard.settings.language.title)}</span>
            <span className="settings-note__picked" aria-hidden>
              <span lang={shown.languageChoice ?? undefined}>{label(shown.languageChoice)}</span>
              <CaretDown size={16} weight="bold" />
            </span>
            <select
              className="settings-note__select"
              aria-labelledby={`${id}-language`}
              value={shown.languageChoice ?? ""}
              onChange={(event) =>
                choose(CHOICES.find((choice) => (choice ?? "") === event.target.value) ?? null)
              }
            >
              {CHOICES.map((choice) => (
                // A language's own name is in that language, for screen readers too.
                <option key={choice ?? "line"} value={choice ?? ""} lang={choice ?? undefined}>
                  {label(choice)}
                </option>
              ))}
            </select>
          </div>
          <p className="fine settings-note__status" role="status">
            {statusLine("language")}
          </p>
          {problem("language")}
        </div>
        <div className="settings-note__setting" aria-busy={saving("nsfw")}>
          <label className="settings-note__option settings-note__switch">
            <span>{t(($) => $.stickerBoard.settings.nsfw.show)}</span>
            <input
              type="checkbox"
              role="switch"
              checked={shown.nsfwOptIn}
              onChange={() => switchNsfw(!shown.nsfwOptIn)}
            />
          </label>
          <p className="fine settings-note__status" role="status">
            {statusLine("nsfw")}
          </p>
          {problem("nsfw")}
        </div>
        <fieldset
          className="settings-note__setting"
          data-setting="kyoto-seika"
          aria-labelledby={`${id}-kyoto-seika-title`}
          aria-busy={saving("kyotoSeika")}
        >
          {/* The group is named by the legend's words alone, not its help button too. */}
          <legend className="fine settings-note__legend settings-note__legend--help">
            <span id={`${id}-kyoto-seika-title`}>
              {t(($) => $.stickerBoard.settings.kyotoSeika.title)}
            </span>
            <button
              type="button"
              className="settings-note__help"
              aria-expanded={aboutOpen}
              aria-controls={`${id}-kyoto-seika-note`}
              aria-label={t(($) => $.stickerBoard.settings.kyotoSeika.help)}
              onClick={() => setAboutOpen((open) => !open)}
            >
              <Question weight={aboutOpen ? "fill" : "bold"} aria-hidden focusable="false" />
            </button>
          </legend>
          <div className="settings-note__note" id={`${id}-kyoto-seika-note`} hidden={!aboutOpen}>
            <p>
              {t(($) => $.stickerBoard.settings.kyotoSeika.how, {
                minutes: KYOTO_SEIKA_TIME_USED_S / 60,
              })}
            </p>
            <p>{t(($) => $.stickerBoard.settings.kyotoSeika.maker)}</p>
          </div>
          <label className="settings-note__option settings-note__switch">
            <span>
              <Trans
                i18nKey={($) => $.stickerBoard.settings.kyotoSeika.name}
                components={{
                  bar: <CensorBar hidden={t(($) => $.stickerBoard.settings.kyotoSeika.hidden)} />,
                }}
              />
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={shown.kyotoSeikaPractice}
              aria-label={t(($) => $.stickerBoard.settings.kyotoSeika.spokenName)}
              aria-describedby={`${id}-kyoto-seika-about`}
              onChange={() => switchKyotoSeika(!shown.kyotoSeikaPractice)}
            />
          </label>
          <p className="settings-note__about" id={`${id}-kyoto-seika-about`}>
            {t(($) => $.stickerBoard.settings.kyotoSeika.about, {
              minutes: KYOTO_SEIKA_TIME_USED_S / 60,
              tickets: KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
            })}
          </p>
          <p className="fine settings-note__status" role="status">
            {statusLine("kyotoSeika")}
          </p>
          {problem("kyotoSeika")}
          {shown.kyotoSeikaPractice && (
            <div
              className="settings-note__nested"
              data-setting="kyoto-seika-dark"
              aria-busy={saving("kyotoSeikaDark")}
            >
              <label className="settings-note__option settings-note__switch">
                <span>{t(($) => $.stickerBoard.settings.kyotoSeika.dark.label)}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={shown.kyotoSeikaDarkSubjects}
                  aria-describedby={`${id}-kyoto-seika-dark-about`}
                  onChange={() => switchDark(!shown.kyotoSeikaDarkSubjects)}
                />
              </label>
              <p className="settings-note__about" id={`${id}-kyoto-seika-dark-about`}>
                {t(($) => $.stickerBoard.settings.kyotoSeika.dark.about)}
              </p>
              {problem("kyotoSeikaDark")}
            </div>
          )}
          <p className="fine settings-note__credit">
            <Trans
              i18nKey={($) => $.stickerBoard.settings.kyotoSeika.credit}
              components={{
                sources: (
                  <a
                    href={t(($) => $.pages.sources)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={openLinkInLine}
                  />
                ),
              }}
            />
          </p>
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
