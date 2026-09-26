import { Copy } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import {
  clearPerformanceRecording,
  describeDevice,
  isPerformanceRecorderOn,
  readPerformanceRecording,
  readPerformanceSummary,
  setPerformanceRecorder,
} from "../../performance/performanceRecorder";
import { formatPerformanceReport, formatSummaryLine } from "../../performance/performanceReport";
import { LabelButton } from "../../ui/LabelButton";
import { QuietLink } from "../../ui/QuietLink";
import "./performance-recorder-controls.css";

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The performance recorder's switch, live summary and report, on the stat board's developer slip. */
export function PerformanceRecorderControls() {
  const id = useId();
  const slip = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(isPerformanceRecorderOn);
  const [summary, setSummary] = useState(readPerformanceSummary);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** The report, to copy by hand after the clipboard refused it. */
  const [uncopied, setUncopied] = useState<string | null>(null);

  // Each second while the slip shows: the board facing out, or a game over it, makes it inert.
  useEffect(() => {
    if (!on) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !slip.current?.closest("[inert]")) {
        setSummary(readPerformanceSummary());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [on]);

  const toggle = (next: boolean) => {
    setProblem(null);
    try {
      setPerformanceRecorder(next);
    } catch (error) {
      console.error("The performance recorder's switch failed", error);
      // Either it switched and only its setting wasn't kept, or it couldn't switch at all.
      setProblem(
        isPerformanceRecorderOn() === next
          ? `Recording is ${next ? "on" : "off"} until the app restarts: ${reason(error)}`
          : `Recording couldn't ${next ? "start" : "stop"}: ${reason(error)}`,
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
    });
    setCopied(false);
    setProblem(null);
    setUncopied(null);
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch (error) {
      console.error("The performance report couldn't be copied", error);
      setProblem(`The report couldn't be copied: ${reason(error)}. It's below to copy by hand.`);
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
      <h3 className="fine performance-recorder__h">Performance</h3>
      <label className="performance-recorder__switch">
        <input
          type="checkbox"
          checked={on}
          aria-describedby={`${id}-what`}
          onChange={(e) => toggle(e.target.checked)}
        />
        Record performance
      </label>
      <p id={`${id}-what`} className="fine performance-recorder__note">
        Slow frames and what happened around them. While it’s on, it records from the app’s start.
      </p>
      <p className="performance-recorder__summary">
        {summary ? formatSummaryLine(summary) : "Nothing recorded yet"}
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
          Copy report
        </LabelButton>
        <QuietLink disabled={!summary} onClick={clear}>
          Clear
        </QuietLink>
      </div>
      <p className="fine performance-recorder__note" role="status">
        {copied ? "Copied. Paste it into the chat." : ""}
      </p>
      {problem && (
        <p className="performance-recorder__problem" role="alert">
          {problem}
        </p>
      )}
      {uncopied && (
        <textarea
          className="performance-recorder__report"
          aria-label="Performance report"
          readOnly
          value={uncopied}
        />
      )}
    </div>
  );
}
