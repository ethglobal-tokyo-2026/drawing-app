import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "../i18n/react";
import { formatRefillTime } from "./refill";
import { ReserveStar, ResinCoat } from "./ReserveResin";
import { ticketPath } from "./ticketShape";
import { ticketView, type Tickets } from "./tickets";
import "./DrawKeyTickets.css";

/** A ticket's height, and its corner and notch, at this size. */
const H = 30;
const SHAPE = { h: H, corner: 4, notch: 4 };
/** Tickets at this size carry an Ink outline, both kinds. */
const EDGE = 1.5;
const STAR = 13;

type Place = "behind" | "front" | null;

/**
 * Where the reserve ticket last showed on the key in this app session. Its star pops when that changes: on the first
 * open, once one is bought, and when it comes to the front. A return to the board doesn't replay it.
 */
let reserveShown: Place | undefined;

/** An element's width, kept current as its print or font changes. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(element.offsetWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

interface TicketProps {
  kind: "daily" | "reserve" | "backing";
  print: string;
  /** The reserve ticket behind the daily one: fanned out past the daily one's end, its own end tucked under it. */
  behind?: boolean;
  pop?: boolean;
  style?: CSSProperties;
}

/** One ticket, sized to its print: the silhouette is drawn round the label once its width is known. */
function KeyTicket({ kind, print, behind = false, pop = false, style }: TicketProps) {
  const [ref, w] = useWidth<HTMLSpanElement>();
  const shape = w > 0 ? ticketPath({ ...SHAPE, w }) : "";
  return (
    <span
      ref={ref}
      className={`draw-key-ticket draw-key-ticket--${kind}${behind ? " is-behind" : ""}`}
      style={style}
    >
      {shape && (
        <svg className="draw-key-ticket__paper" viewBox={`0 0 ${w} ${H}`} width={w} height={H}>
          <path className="draw-key-ticket__fill" d={shape} />
          {kind === "reserve" && <ResinCoat shape={shape} w={w} h={H} edge={EDGE} />}
          <path className="draw-key-ticket__edge" d={shape} />
          {kind === "reserve" && <ReserveStar x={w - 3} y={2.5} size={STAR} pop={pop} />}
        </svg>
      )}
      <span className="draw-key-ticket__print">{print}</span>
    </span>
  );
}

/**
 * The tickets tucked behind the Draw key's right end, like tickets slid behind a keycap: what the next drawing can use
 * (ticketView). One Seal Yellow ticket ×daily, with the reserve ticket behind it when there are any; the reserve
 * ticket alone once the daily ones are used; with neither, the empty backing printed "New at 12:00 AM". They're
 * paper under the key, not part of it: they take no taps, the key sinks over them, and the key's own name says
 * what's left. When Draw spends a ticket, the front one peels off as the canvas opens.
 */
export function DrawKeyTickets({ tickets, peel = false }: { tickets: Tickets; peel?: boolean }) {
  const { t } = useTranslation();
  const view = ticketView(tickets);
  const [front, frontWidth] = useWidth<HTMLSpanElement>();
  const place: Place = view.show === "reserve" ? "front" : view.reserve > 0 ? "behind" : null;
  // Which place the star pops in: where it first shows, then wherever it moves while the key is up.
  const [popIn, setPopIn] = useState<Place>(() => (place !== reserveShown ? place : null));
  const [lastPlace, setLastPlace] = useState(place);
  if (place !== lastPlace) {
    setLastPlace(place);
    setPopIn(place);
  }
  useEffect(() => {
    reserveShown = place;
  }, [place]);
  const pop = place !== null && popIn === place;
  const count = (n: number) => t(($) => $.tickets.count, { count: n });

  return (
    <span className="draw-key-tickets" aria-hidden>
      {view.show === "daily" && view.reserve > 0 && (
        <KeyTicket
          kind="reserve"
          print={count(view.reserve)}
          behind
          pop={pop}
          style={{ "--front-w": `${frontWidth}px` }}
        />
      )}
      <span ref={front} className={`draw-key-tickets__front${peel ? " is-peeling" : ""}`}>
        {view.show === "daily" && <KeyTicket kind="daily" print={count(view.daily)} />}
        {view.show === "reserve" && (
          <KeyTicket kind="reserve" print={count(view.reserve)} pop={pop} />
        )}
        {view.show === "none" && (
          <KeyTicket
            kind="backing"
            print={t(($) => $.tickets.newAt, { time: formatRefillTime(view.refillAt) })}
          />
        )}
      </span>
    </span>
  );
}
