import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { currentLanguage, i18next } from "../src/i18n/i18n";
import { languageOf, type Language } from "../src/i18n/language";
import { useTranslation } from "../src/i18n/react";
import { isStylus } from "../src/sticker-creation/canvas/gestures";
import "../src/styles/fonts.css";
import "../src/styles/tokens.css";
import "../src/styles/base.css";
import "../src/styles/keys.css";
import { ErrorLine } from "../src/ui/ErrorLine";
import { PointerIndicators } from "../src/ui/PointerIndicators";
import { keepPointerIndicators, usePointerIndicators } from "../src/ui/pointerIndicatorsSetting";
import { installPress } from "../src/ui/press";
import { Switch } from "../src/ui/Switch";

interface PointerSample {
  event: string;
  pointer: string;
  id: number;
  x: number;
  y: number;
  buttons: number | null;
  pressure: number | null;
}

interface InputRecord extends PointerSample {
  elapsedMs: number;
  trusted: boolean;
  indicatorsEnabled: boolean;
}

const inputReviewStartedAt = performance.now();

const queryLanguage = new URLSearchParams(location.search).get("lang");
const initialLanguage = languageOf(queryLanguage ?? navigator.language);
let initialLanguageFailure: string | null = null;
try {
  await i18next.changeLanguage(initialLanguage);
} catch (error) {
  console.error("The pointer review page could not start in the browser's language", error);
  initialLanguageFailure = error instanceof Error ? error.message : String(error);
}
const initiallyKept = keepPointerIndicators(true);
installPress();

/** A real browser event proves hover support; synthetic test input must not claim the device supports it. */
export function PointerIndicatorsReview() {
  const { t } = useTranslation();
  const enabled = usePointerIndicators();
  const [kept, setKept] = useState(initiallyKept);
  const [languageFailure, setLanguageFailure] = useState<string | null>(initialLanguageFailure);
  const [hoverCount, setHoverCount] = useState(0);
  const [contacts, setContacts] = useState(0);
  const [touchStarts, setTouchStarts] = useState(0);
  const [taps, setTaps] = useState(0);
  const [latest, setLatest] = useState<PointerSample | null>(null);
  const [history, setHistory] = useState<InputRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailure, setCopyFailure] = useState<string | null>(null);
  const enabledAtEvent = useRef(enabled);
  const target = useRef<HTMLElement>(null);
  const inputDetails = useRef({
    startedAt: inputReviewStartedAt,
    pointerDownEvents: 0,
    touchStartEvents: 0,
    penHoverMovements: 0,
    preventedPencilMovements: 0,
    history: [] as InputRecord[],
  });

  const copyInputDetails = async () => {
    setCopied(false);
    setCopyFailure(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const text = JSON.stringify(
        {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          maxTouchPoints: navigator.maxTouchPoints,
          indicatorsEnabled: enabled,
          pointerDownEvents: inputDetails.current.pointerDownEvents,
          touchStartEvents: inputDetails.current.touchStartEvents,
          penHoverMovements: inputDetails.current.penHoverMovements,
          preventedPencilMovements: inputDetails.current.preventedPencilMovements,
          buttonTaps: taps,
          history: inputDetails.current.history,
        },
        null,
        2,
      );
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(t(($) => $.pointerIndicators.copyTimedOut))),
            5_000,
          );
        }),
      ]);
      setCopied(true);
    } catch (error) {
      console.error("The pointer review page could not copy input details", error);
      setCopyFailure(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timer);
    }
  };

  const changeLanguage = (language: Language) => {
    setLanguageFailure(null);
    void i18next.changeLanguage(language).catch((error: unknown) => {
      console.error("The pointer review page could not change languages", error);
      setLanguageFailure(error instanceof Error ? error.message : String(error));
    });
  };

  useEffect(() => {
    document.documentElement.lang = currentLanguage();
    document.title = t(($) => $.pointerIndicators.title);
  }, [t]);

  useEffect(() => {
    enabledAtEvent.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const surface = target.current;
    if (!surface) return;
    const preventPencilMovement = (event: TouchEvent) => {
      if (!event.cancelable || !Array.from(event.changedTouches).some(isStylus)) return;
      // Scribble can consume rapid Pencil contacts; handle movement directly, as the sheet does.
      // Original reproduction: https://mikepk.com/2020/10/iOS-safari-scribble-bug/
      event.preventDefault();
      if (event.isTrusted && event.defaultPrevented)
        inputDetails.current.preventedPencilMovements++;
    };
    surface.addEventListener("touchmove", preventPencilMovement, { passive: false });
    return () => surface.removeEventListener("touchmove", preventPencilMovement);
  }, []);

  useEffect(() => {
    let frame: number | null = null;
    let pending: PointerSample | null = null;
    const penPhases = new Map<number, { buttons: boolean; pressure: boolean }>();
    const record = (event: Event, sample: PointerSample) => {
      inputDetails.current.history.push({
        ...sample,
        elapsedMs: performance.now() - inputDetails.current.startedAt,
        trusted: event.isTrusted,
        indicatorsEnabled: enabledAtEvent.current,
      });
    };
    const publish = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        setLatest(pending);
        setHoverCount(inputDetails.current.penHoverMovements);
        setContacts(inputDetails.current.pointerDownEvents);
        setTouchStarts(inputDetails.current.touchStartEvents);
        setHistory([...inputDetails.current.history]);
      });
    };
    const observe = (event: PointerEvent) => {
      if (event.isTrusted && event.type === "pointerdown") inputDetails.current.pointerDownEvents++;
      if (
        event.isTrusted &&
        event.type === "pointermove" &&
        event.pointerType === "pen" &&
        event.buttons === 0
      )
        inputDetails.current.penHoverMovements++;
      pending = {
        event: event.type,
        pointer: event.pointerType,
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        buttons: event.buttons,
        pressure: event.pressure,
      };
      let phaseChanged = false;
      if (event.pointerType === "pen") {
        const previous = penPhases.get(event.pointerId);
        const next = { buttons: event.buttons !== 0, pressure: event.pressure > 0 };
        phaseChanged = previous
          ? previous.buttons !== next.buttons || previous.pressure !== next.pressure
          : next.buttons || next.pressure;
        penPhases.set(event.pointerId, next);
      }
      if (event.type !== "pointermove" || phaseChanged) record(event, pending);
      publish();
    };
    const observeTouch = (event: TouchEvent) => {
      if (event.isTrusted && event.type === "touchstart") inputDetails.current.touchStartEvents++;
      for (const touch of Array.from(event.changedTouches)) {
        pending = {
          event: event.type,
          pointer:
            "touchType" in touch && typeof touch.touchType === "string" ? touch.touchType : "touch",
          id: touch.identifier,
          x: touch.clientX,
          y: touch.clientY,
          buttons: null,
          pressure: typeof touch.force === "number" ? touch.force : null,
        };
        if (event.type !== "touchmove") record(event, pending);
      }
      publish();
    };
    const events = ["pointerdown", "pointermove", "pointerup", "pointercancel"] as const;
    const touchEvents = ["touchstart", "touchmove", "touchend", "touchcancel"] as const;
    const options = { capture: true, passive: true };
    for (const event of events) document.addEventListener(event, observe, options);
    for (const event of touchEvents) document.addEventListener(event, observeTouch, options);
    return () => {
      for (const event of events) document.removeEventListener(event, observe, options);
      for (const event of touchEvents) document.removeEventListener(event, observeTouch, options);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <main className="pointer-review">
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 className="title-label">{t(($) => $.pointerIndicators.title)}</h1>
          <span className="fine">{t(($) => $.pointerIndicators.rapidTapCheck)}</span>
        </div>
        <p className="pointer-review__intro">{t(($) => $.pointerIndicators.introduction)}</p>
        <div className="pointer-review__controls">
          <label className="pointer-review__switch">
            <span>{t(($) => $.pointerIndicators.enabled)}</span>
            <Switch checked={enabled} onChange={(on) => setKept(keepPointerIndicators(on))} />
          </label>
          <label className="pointer-review__language">
            <span>{t(($) => $.pointerIndicators.language)}</span>
            <select
              value={currentLanguage()}
              onChange={(event) => changeLanguage(event.currentTarget.value === "ja" ? "ja" : "en")}
            >
              <option value="en">{t(($) => $.pointerIndicators.english)}</option>
              <option value="ja">{t(($) => $.pointerIndicators.japanese)}</option>
            </select>
          </label>
        </div>
        {!kept && (
          <ErrorLine className="pointer-review__problem">
            {t(($) => $.pointerIndicators.notKept)}
          </ErrorLine>
        )}
        {languageFailure !== null && (
          <ErrorLine className="pointer-review__problem" detail={languageFailure}>
            {t(($) => $.pointerIndicators.languageFailed)}
          </ErrorLine>
        )}
        <div
          className="pointer-review__status"
          data-detected={hoverCount > 0 ? "" : undefined}
          role="status"
        >
          {t(($) =>
            hoverCount > 0 ? $.pointerIndicators.hoverDetected : $.pointerIndicators.noHover,
          )}
        </div>
        <p className="pointer-review__explanation">
          {t(($) => $.pointerIndicators.hoverExplanation)}
        </p>
        <section
          ref={target}
          className="pointer-review__target"
          aria-labelledby="pointer-review-target"
        >
          <h2 id="pointer-review-target">{t(($) => $.pointerIndicators.target)}</h2>
          <p>{t(($) => $.pointerIndicators.targetHint)}</p>
        </section>
        <button type="button" className="key" onClick={() => setTaps((count) => count + 1)}>
          {t(($) => $.pointerIndicators.tap)}
        </button>
        <div className="pointer-review__counts">
          <span>{t(($) => $.pointerIndicators.taps, { count: taps })}</span>
          <span>{t(($) => $.pointerIndicators.hoverCount, { count: hoverCount })}</span>
          <span>{t(($) => $.pointerIndicators.contacts, { count: contacts })}</span>
          <span>{t(($) => $.pointerIndicators.touchStarts, { count: touchStarts })}</span>
        </div>
        <h2>{t(($) => $.pointerIndicators.latest)}</h2>
        <p className="pointer-review__event">
          {latest
            ? latest.buttons === null
              ? t(($) => $.pointerIndicators.touchEvent, {
                  ...latest,
                  pressure:
                    latest.pressure?.toFixed(2) ??
                    t(($) => $.pointerIndicators.pressureUnavailable),
                })
              : t(($) => $.pointerIndicators.event, {
                  ...latest,
                  buttons: latest.buttons,
                  pressure:
                    latest.pressure?.toFixed(2) ??
                    t(($) => $.pointerIndicators.pressureUnavailable),
                })
            : t(($) => $.pointerIndicators.waiting)}
        </p>
        <p className="fine">{t(($) => $.pointerIndicators.inputInstructions)}</p>
        <button type="button" className="key" onClick={() => void copyInputDetails()}>
          {t(($) => $.pointerIndicators.copyInputDetails)}
        </button>
        {copied && <p role="status">{t(($) => $.pointerIndicators.inputCopied)}</p>}
        {copyFailure !== null && (
          <ErrorLine className="pointer-review__problem" detail={copyFailure}>
            {t(($) => $.pointerIndicators.copyFailed)}
          </ErrorLine>
        )}
        <details onToggle={(event) => setHistoryOpen(event.currentTarget.open)}>
          <summary>{t(($) => $.pointerIndicators.inputHistory, { count: history.length })}</summary>
          {historyOpen && (
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {history
                .map((entry) =>
                  t(($) => $.pointerIndicators.inputRecord, {
                    ...entry,
                    elapsed: entry.elapsedMs.toFixed(1),
                    buttons: entry.buttons ?? t(($) => $.pointerIndicators.buttonsUnavailable),
                    pressure: entry.pressure ?? t(($) => $.pointerIndicators.pressureUnavailable),
                    enabled: t(($) =>
                      entry.indicatorsEnabled
                        ? $.pointerIndicators.indicatorsOn
                        : $.pointerIndicators.indicatorsOff,
                    ),
                    trusted: t(($) =>
                      entry.trusted
                        ? $.pointerIndicators.realInput
                        : $.pointerIndicators.syntheticInput,
                    ),
                  }),
                )
                .join("\n")}
            </pre>
          )}
        </details>
      </main>
      <PointerIndicators />
    </>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("The pointer review page has no root");
createRoot(root).render(<PointerIndicatorsReview />);
