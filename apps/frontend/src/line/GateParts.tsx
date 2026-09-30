import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "../i18n/react";
import "./LineGate.css";

/** A wait this long gets a second line, so a stall doesn't read as a frozen app. */
export const STILL_OPENING_MS = 6_000;

/**
 * The gates' status line while they wait. Once the wait has run long, `stillLabel` joins it inside
 * the same live region, so a stall is announced and shown as one.
 */
export function GateOpening({ label, stillLabel }: { label: string; stillLabel?: string }) {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setStill(true), STILL_OPENING_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="line-gate__opening" role="status">
      <p className="fine">{label}</p>
      {still && stillLabel && <p className="line-gate__still">{stillLabel}</p>}
    </div>
  );
}

/**
 * What a gate says when it can't open the app for now, with `children` (the key) under the lead. The
 * heading takes focus so screen readers announce the change from the status line, and `detail` sits
 * apart for a report, in its own case.
 */
export function GateNotice({
  title,
  lead,
  detail,
  children,
}: {
  title: string;
  lead: string;
  detail?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <>
      <h1 ref={heading} tabIndex={-1} className="title-label">
        {title}
      </h1>
      <p className="line-gate__lead">{lead}</p>
      {children}
      {detail && (
        <div className="line-gate__details">
          <p className="fine">{t(($) => $.line.gate.details)}</p>
          <p className="line-gate__detail">{detail}</p>
        </div>
      )}
    </>
  );
}
