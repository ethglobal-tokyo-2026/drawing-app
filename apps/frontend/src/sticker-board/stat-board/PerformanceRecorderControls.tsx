import { useEffect, useId, useRef, useState } from "react";
import {
  clearPerformanceRecording,
  describeDevice,
  isPerformanceRecorderOn,
  readPerformanceRecording,
  readPerformanceSummary,
  setPerformanceRecorder,
} from "../../performance/performanceRecorder";
import { readBootMilestones } from "../../performance/bootMilestones";
import { formatPerformanceReport, formatSummaryLine } from "../../performance/performanceReport";
import { useTranslation } from "../../i18n/react";
import { Copy } from "../../icons";
import { ErrorLine } from "../../ui/ErrorLine";
import { LabelButton } from "../../ui/LabelButton";
import { QuietLink } from "../../ui/QuietLink";
import "./performance-recorder-controls.css";

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The performance recorder's switch, live summary and report, on the stat board's developer slip. */
export function PerformanceRecorderControls() {
  const { t } = useTranslation();
  const id = useId();
  const slip = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(isPerformanceRecorderOn);
  const [summary, setSummary] = useState(readPerformanceSummary);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** The report, to copy by hand after the clipboard refused it. */
  const [uncopied, setUncopied] = useState<string | null>(null);

  // Each second while the slip shows. The stat board stays mounted behind the board, so the timer
  // runs only while the page is visible and the slip isn't inert, as the board facing out, or a game
  // over it, makes it.
  useEffect(() => {
    const el = slip.current;
    if (!on || !el) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const follow = () => {
      const showing = document.visibilityState === "visible" && !el.closest("[inert]");
      if (showing && timer === undefined) {
        setSummary(readPerformanceSummary());
        timer = setInterval(() => setSummary(readPerformanceSummary()), 1000);
      } else if (!showing && timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };
    const inert = new MutationObserver(follow);
    for (let up = el.parentElement; up; up = up.parentElement) {
      inert.observe(up, { attributes: true, attributeFilter: ["inert"] });
    }
    document.addEventListener("visibilitychange", follow);
    follow();
    return () => {
      inert.disconnect();
      document.removeEventListener("visibilitychange", follow);
      clearInterval(timer);
    };
  }, [on]);

  const toggle = (next: boolean) => {
    setProblem(null);
    try {
      setPerformanceRecorder(next);
    } catch (error) {
      console.error("The performance recorder's switch failed", error);
      // Either it switched and only its setting wasn't kept, or it couldn't switch at all.
      const why = { reason: reason(error) };
      setProblem(
        isPerformanceRecorderOn() === next
          ? next
            ? t(($) => $.stickerBoard.developer.performance.onUntilRestart, why)
            : t(($) => $.stickerBoard.developer.performance.offUntilRestart, why)
          : next
            ? t(($) => $.stickerBoard.developer.performance.couldntStart, why)
            : t(($) => $.stickerBoard.developer.performance.couldntStop, why),
      );
    }
    setOn(isPerformanceRecorderOn());
    setSummary(readPerformanceSummary());
  };

  const copy = async () => {
    const recording = readPerformanceRecording();
    if (!recording) return;
    const report = formatPerformanceReport({
      ...recording,
      takenAt: new Date(),
      device: describeDevice(),
      start: readBootMilestones(),
    });
    setCopied(false);
    setProblem(null);
    setUncopied(null);
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch (error) {
      console.error("The performance report couldn't be copied", error);
      setProblem(
        t(($) => $.stickerBoard.developer.performance.notCopied, { reason: reason(error) }),
      );
      setUncopied(report);
    }
  };

  const clear = () => {
    clearPerformanceRecording();
    setSummary(readPerformanceSummary());
    setCopied(false);
    setUncopied(null);
  };

  return (
    <div className="performance-recorder" ref={slip}>
      <h3 className="fine performance-recorder__h">
        {t(($) => $.stickerBoard.developer.performance.title)}
      </h3>
      <label className="performance-recorder__switch">
        <input
          type="checkbox"
          checked={on}
          aria-describedby={`${id}-what`}
          onChange={(e) => toggle(e.target.checked)}
        />
        {t(($) => $.stickerBoard.developer.performance.record)}
      </label>
      <p id={`${id}-what`} className="fine performance-recorder__note">
        {t(($) => $.stickerBoard.developer.performance.what)}
      </p>
      <p className="performance-recorder__summary">
        {summary
          ? formatSummaryLine(summary)
          : t(($) => $.stickerBoard.developer.performance.nothingYet)}
      </p>
      <div className="performance-recorder__actions">
        {/* The clipboard wants the tap's own click, which the press would fire late. */}
        <LabelButton
          size="sm"
          icon={<Copy />}
          data-press="off"
          disabled={!summary}
          onClick={() => void copy()}
        >
          {t(($) => $.stickerBoard.developer.performance.copy)}
        </LabelButton>
        <QuietLink disabled={!summary} onClick={clear}>
          {t(($) => $.stickerBoard.developer.performance.clear)}
        </QuietLink>
      </div>
      <p className="fine performance-recorder__note" role="status">
        {copied ? t(($) => $.stickerBoard.developer.performance.copied) : ""}
      </p>
      {problem && <ErrorLine className="performance-recorder__problem">{problem}</ErrorLine>}
      {uncopied && (
        <textarea
          className="performance-recorder__report"
          aria-label={t(($) => $.stickerBoard.developer.performance.report)}
          readOnly
          value={uncopied}
        />
      )}
    </div>
  );
}
