import { useMemo } from "react";
import { useTranslation } from "../i18n/react";
import { DrawIcon } from "../icons/DrawIcon";
import { ReserveStar, ResinCoat } from "./ReserveResin";
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
  /** How many tickets this one stands for, on a dot badge stuck over its corner. */
  count?: number;
}

type Size = "hero" | "large" | "small";

interface Props {
  stubs: readonly TicketStub[];
  /**
   * "hero": the one reserve ticket a card is about. "large": the out-of-tickets card's tossed stubs. "small": the
   * strip under the sealed card's key, and the reserve ticket beside a count.
   */
  size: Size;
  /** What the row says, such as "2 daily tickets left". Without it the row is decorative and hidden from screen readers. */
  label?: string;
  /** A reserve ticket's star pops in, once: the ticket was just bought, or has just come to the front. */
  pop?: boolean;
  /** The ticket being spent, by its place in `stubs`, and how far the spend has got. */
  spending?: { index: number; state: Spend } | null;
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
  /** A reserve ticket's Ink outline, and its star. */
  edge: number;
  star: number;
}

const GEOMETRY: Record<Size, Geometry> = {
  hero: {
    w: 148,
    h: 90,
    corner: 9,
    notch: 12,
    perf: 42,
    outline: { x: 52, y: 12, w: 78, h: 66 },
    glyph: 34,
    edge: 2,
    star: 24,
  },
  large: {
    w: 88,
    h: 56,
    corner: 6,
    notch: 8,
    perf: 26,
    outline: { x: 32, y: 7, w: 46, h: 42 },
    glyph: 22,
    edge: 2,
    star: 20,
  },
  small: {
    w: 40,
    h: 25,
    corner: 3.5,
    notch: 3.5,
    perf: 12,
    outline: { x: 15, y: 3.5, w: 20, h: 18 },
    glyph: 12,
    edge: 1.5,
    star: 11,
  },
};

/** How far a spend has got: the face lifts while it's on its way, and peels off its backing once it's done. */
export type Spend = "lift" | "peel";

function Stub({
  stub,
  geometry,
  pop,
  spend,
}: {
  stub: TicketStub;
  geometry: Geometry;
  pop: boolean;
  spend: Spend | null;
}) {
  const { t } = useTranslation();
  const { w, h, perf, glyph, notch, edge, star } = geometry;
  const shape = useMemo(() => ticketPath(geometry), [geometry]);
  const outline = useMemo(
    () => (stub.used && stub.outline ? fitOutline(stub.outline, geometry.outline) : ""),
    [stub.used, stub.outline, geometry],
  );
  const kind = stub.kind ?? "daily";
  const reserve = kind === "reserve";
  const bodyCenter = (perf + w - notch) / 2;
  // The star sits over the top-right corner; a count's badge takes the corner, so the star sits just short of it.
  const starX = stub.count === undefined ? w - star * 0.22 : w - star * 1.3;
  const layer = { viewBox: `0 0 ${w} ${h}`, width: w, height: h, "aria-hidden": true } as const;
  const perforation = (
    <line className="ticket-stub__perf" x1={perf} y1={h * 0.12} x2={perf} y2={h * 0.88} />
  );

  // The peeled ticket leaves the pack one smaller; a zero never shows.
  const count = stub.count !== undefined && spend === "peel" ? stub.count - 1 : stub.count;
  const classes = [
    "ticket-stub",
    `ticket-stub--${kind}`,
    stub.used ? "is-used" : "is-fresh",
    spend === "lift" && "is-lifted",
    spend === "peel" && "is-peeling",
  ];

  return (
    <span
      className={classes.filter(Boolean).join(" ")}
      style={reserve ? { "--edge": `${edge}px` } : undefined}
    >
      {/* The backing: what a ticket leaves once it's used, with the kiss-cut outline of the sticker it became. */}
      <svg className="ticket-stub__backing" {...layer} focusable="false">
        <path className="ticket-stub__paper" d={shape} />
        {perforation}
        <path className="ticket-stub__edge" d={shape} />
        {outline && <path className="ticket-stub__outline" d={outline} />}
      </svg>
      {!stub.used && (
        // A fresh ticket's face, printed with the Draw mark, the act it's spent on. Spending peels it off the backing.
        // A reserve ticket's wears the stickers' resin, a full Ink outline and a star.
        <svg className="ticket-stub__face" {...layer} focusable="false">
          <path className="ticket-stub__paper" d={shape} />
          {perforation}
          {reserve && <ResinCoat shape={shape} w={w} h={h} edge={edge} />}
          <path className="ticket-stub__edge" d={shape} />
          <g
            className="ticket-stub__glyph"
            transform={`translate(${bodyCenter - glyph / 2} ${(h - glyph) / 2})`}
          >
            <DrawIcon size={glyph} />
          </g>
          {reserve && <ReserveStar x={starX} y={star * 0.1} size={star} pop={pop} />}
        </svg>
      )}
      {count !== undefined && count > 0 && (
        <span
          key={count}
          className={`ticket-stub__badge ticket-stub__badge--${kind} ${spend === "peel" ? "is-ticked" : ""}`}
        >
          {t(($) => $.tickets.count, { count })}
        </span>
      )}
    </span>
  );
}

/**
 * Drawing tickets as paper stubs: fresh ones are ticket stock over a backing, used ones the empty backing they left,
 * carrying the kiss-cut outline of the sticker each became. Daily tickets are matte Seal Yellow stock; reserve
 * tickets are Blue, in the stickers' resin with an Ink outline and a star.
 */
export function TicketStubs({ stubs, size, label, pop = false, spending, className }: Props) {
  const geometry = GEOMETRY[size];
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <div
      className={["ticket-stubs", `ticket-stubs--${size}`, className].filter(Boolean).join(" ")}
      {...a11y}
    >
      {stubs.map((stub, i) => (
        <Stub
          key={i}
          stub={stub}
          geometry={geometry}
          pop={pop}
          spend={spending?.index === i ? spending.state : null}
        />
      ))}
    </div>
  );
}
