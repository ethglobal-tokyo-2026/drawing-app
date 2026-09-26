import { useMemo } from "react";
import { DrawIcon } from "../icons/DrawIcon";
import { fitOutline, type Box } from "./stubOutline";
import { ticketPath } from "./ticketShape";
import type { TicketKind } from "./tickets";
import "./TicketStubs.css";

export interface TicketStub {
  /** A used ticket is the empty backing it left; a fresh one is ticket stock in its kind's color. */
  used: boolean;
  /** Daily when absent. */
  kind?: TicketKind;
  /** The cut outline of the sticker a used ticket became: an SVG path in any units, fitted to the stub. */
  outline?: string;
}

interface Props {
  stubs: readonly TicketStub[];
  /** "large": the out-of-tickets card's tossed stubs. "small": the strip under the sealed card's key. */
  size: "large" | "small";
  /** What the row says, such as "2 of 3 tickets left today". Without it the row is decorative and hidden from screen readers. */
  label?: string;
  className?: string;
}

interface Geometry {
  w: number;
  h: number;
  corner: number;
  notch: number;
  /** Where the perforation divides the stub from the body. */
  perf: number;
  /** Where a used ticket's sticker outline sits. */
  outline: Box;
  glyph: number;
}

const GEOMETRY: Record<Props["size"], Geometry> = {
  large: {
    w: 88,
    h: 56,
    corner: 6,
    notch: 8,
    perf: 26,
    outline: { x: 32, y: 7, w: 46, h: 42 },
    glyph: 22,
  },
  small: {
    w: 40,
    h: 25,
    corner: 3.5,
    notch: 3.5,
    perf: 12,
    outline: { x: 15, y: 3.5, w: 20, h: 18 },
    glyph: 12,
  },
};

function Stub({ stub, geometry }: { stub: TicketStub; geometry: Geometry }) {
  const { w, h, perf, glyph, notch } = geometry;
  const shape = useMemo(() => ticketPath(geometry), [geometry]);
  const outline = useMemo(
    () => (stub.used && stub.outline ? fitOutline(stub.outline, geometry.outline) : ""),
    [stub.used, stub.outline, geometry],
  );
  const bodyCenter = (perf + w - notch) / 2;

  return (
    <svg
      className={`ticket-stub ticket-stub--${stub.kind ?? "daily"} ${stub.used ? "is-used" : "is-fresh"}`}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden
      focusable="false"
    >
      <path className="ticket-stub__face" d={shape} />
      <line className="ticket-stub__perf" x1={perf} y1={h * 0.12} x2={perf} y2={h * 0.88} />
      <path className="ticket-stub__edge" d={shape} />
      {stub.used ? (
        outline && <path className="ticket-stub__outline" d={outline} />
      ) : (
        // A fresh ticket is printed with the Draw mark, the act it's spent on.
        <g
          className="ticket-stub__glyph"
          transform={`translate(${bodyCenter - glyph / 2} ${(h - glyph) / 2})`}
        >
          <DrawIcon size={glyph} />
        </g>
      )}
    </svg>
  );
}

/**
 * Drawing tickets as paper stubs: fresh ones are ticket stock (daily Seal Yellow, reserve Grape), used ones the empty backing
 * they left, carrying the kiss-cut outline of the sticker each became.
 */
export function TicketStubs({ stubs, size, label, className }: Props) {
  const geometry = GEOMETRY[size];
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <div
      className={["ticket-stubs", `ticket-stubs--${size}`, className].filter(Boolean).join(" ")}
      {...a11y}
    >
      {stubs.map((stub, i) => (
        <Stub key={i} stub={stub} geometry={geometry} />
      ))}
    </div>
  );
}
