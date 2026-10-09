import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ErrorDetail } from "../ui/ErrorLine";
import { useVisibleArea } from "../ui/visibleArea";
import "./LineGate.css";

/** A wait this long gets a second line, so a stall doesn't read as a frozen app. */
export const STILL_OPENING_MS = 6_000;

/**
 * The bare paper every gate stands on. What it holds centers while it fits; taller than the window, it
 * starts at the top and scrolls. It keeps it where the on-screen keyboard leaves it visible.
 */
export function GatePaper({ className, children, ...rest }: ComponentPropsWithoutRef<"main">) {
  const paper = useRef<HTMLElement>(null);
  useVisibleArea(paper);
  return (
    <main ref={paper} className={className ? `line-gate ${className}` : "line-gate"} {...rest}>
      <div className="line-gate__stack">{children}</div>
    </main>
  );
}

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
      {still && stillLabel && <p className="line-gate__still keep-phrases">{stillLabel}</p>}
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
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <>
      <h1 ref={heading} tabIndex={-1} className="title-label">
        {title}
      </h1>
      <p className="line-gate__lead keep-phrases">{lead}</p>
      {children}
      {detail && (
        <div className="line-gate__details">
          <ErrorDetail text={detail} />
        </div>
      )}
    </>
  );
}
