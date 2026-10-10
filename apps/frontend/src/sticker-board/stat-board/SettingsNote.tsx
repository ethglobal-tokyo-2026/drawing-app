import { Suspense, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useMe } from "../../api/meContext";
import { useApi } from "../../api/useApi";
import { problemOf } from "../../i18n/errorMessage";
import { keepChosenLanguage, type Language } from "../../i18n/language";
import { followLanguageChoice } from "../../i18n/pageLanguage";
import { Trans, useTranslation } from "../../i18n/react";
import { Question } from "../../icons";
import { CensorBar } from "../../kyoto-seika/CensorBar";
import { useTickets } from "../../tickets/useTickets";
import { ErrorLine } from "../../ui/ErrorLine";
import { lazyWithPreload } from "../../ui/lazyWithPreload";
import { Switch } from "../../ui/Switch";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { forgetKeptBoard } from "../lastBoard";
import { ChoiceRow } from "./ChoiceRow";
import { DrawingSettings } from "./DrawingSettings";
import { useSettingSaves, type Failure, type Setting, type Shown } from "./settingSaves";
import { statsClearPeek } from "./settingsPeek";
import "./settings-note.css";

const CHOICES: readonly Language[] = ["en", "ja"];

// Its own chunk, with the deal's balloons and the clock it shows, so the stat board doesn't carry them.
const KyotoSeikaHelp = lazyWithPreload("Kyoto Seika Practice Mode's help", () =>
  import("../../kyoto-seika/KyotoSeikaHelp").then((m) => m.KyotoSeikaHelp),
);

/** How much of the paper under its title peeks above the cork's foot, in px. */
const PEEK_UNDER_TITLE = 10;

/**
 * Tucks the note against the cork's foot so only its title shows, counting the cork's padding, which a
 * sticky box keeps clear of; below the stats instead where they'd run under it. `reveal` scrolls the
 * whole note into view, for a tap or focus, which the browser's own scrolling can't untuck.
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
 * also kept on this phone for the first screens of the next start. The Drawing group
 * (`DrawingSettings`) is this device's own.
 */
export function SettingsNote() {
  const { t } = useTranslation();
  const api = useApi();
  const me = useMe();
  const id = useId();
  const note = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const { statuses, save } = useSettingSaves();
  // Null until "?" is first tapped: only then does the help sheet's code load. It stays mounted after.
  const [helpOpen, setHelpOpen] = useState<boolean | null>(null);
  const { refresh: refreshTickets } = useTickets();
  const reveal = usePeek(note, title);

  const choose = (choice: Language) =>
    save(
      "language",
      { language: choice },
      () => api.setLanguageChoice(choice),
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

  const named = (language: Language) => t(($) => $.stickerBoard.settings.language.names[language]);
  const shown: Shown = Object.values(statuses).reduce<Shown>(
    (all, status) => (status?.step === "saving" ? { ...all, ...status.to } : all),
    me,
  );
  const saving = (setting: Setting) => statuses[setting]?.step === "saving";
  /** Why a setting didn't take, in the app's language now. */
  const problem = (setting: Setting) => {
    const status = statuses[setting];
    if (status?.step !== "failed") return null;
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
        <div
          className="settings-note__setting"
          data-setting="language"
          aria-busy={saving("language")}
        >
          <ChoiceRow
            label={t(($) => $.stickerBoard.settings.language.title)}
            choices={CHOICES}
            value={shown.language}
            nameOf={named}
            // A language's own name is in that language, for screen readers too.
            langOf={(choice) => choice}
            onChoose={choose}
            busy={saving("language")}
          />
          {problem("language")}
        </div>
        <div className="settings-note__setting" data-setting="nsfw" aria-busy={saving("nsfw")}>
          <label className="settings-note__option">
            <span>{t(($) => $.stickerBoard.settings.nsfw.show)}</span>
            <Switch
              checked={shown.nsfwOptIn}
              aria-disabled={saving("nsfw") || undefined}
              onChange={switchNsfw}
            />
          </label>
          {problem("nsfw")}
        </div>
        <div
          className="settings-note__setting"
          data-setting="kyoto-seika"
          aria-busy={saving("kyotoSeika")}
        >
          {/* "?" follows the name's last word; the name's label reaches across the row under it, so
              a tap anywhere else flips the switch. */}
          <div className="settings-note__option settings-note__option--help">
            <span className="settings-note__name">
              <label htmlFor={`${id}-kyoto-seika`}>
                <Trans
                  i18nKey={($) => $.stickerBoard.settings.kyotoSeika.name}
                  components={{
                    bar: <CensorBar hidden={t(($) => $.stickerBoard.settings.kyotoSeika.hidden)} />,
                  }}
                />
              </label>
              <button
                type="button"
                className="settings-note__help"
                aria-haspopup="dialog"
                aria-label={t(($) => $.stickerBoard.settings.kyotoSeika.help)}
                onPointerDown={() => void KyotoSeikaHelp.preload()}
                onClick={() => setHelpOpen(true)}
              >
                <Question weight={helpOpen ? "fill" : "bold"} aria-hidden focusable="false" />
              </button>
            </span>
            <Switch
              id={`${id}-kyoto-seika`}
              checked={shown.kyotoSeikaPractice}
              aria-label={t(($) => $.stickerBoard.settings.kyotoSeika.spokenName)}
              aria-disabled={saving("kyotoSeika") || undefined}
              onChange={switchKyotoSeika}
            />
          </div>
          {problem("kyotoSeika")}
          {helpOpen !== null && (
            <Suspense fallback={null}>
              <KyotoSeikaHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
            </Suspense>
          )}
        </div>
        <DrawingSettings />
      </div>
      <i
        className="stat-board__washi settings-note__washi settings-note__washi--start"
        aria-hidden
      />
      <i className="stat-board__washi settings-note__washi settings-note__washi--end" aria-hidden />
    </section>
  );
}
