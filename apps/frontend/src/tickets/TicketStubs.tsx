import { useEffect, useState } from "react";
import { listStickers } from "../stickers/stickerStorage";
import { FREE_TICKETS_PER_DAY } from "./config";
import { ticketDay } from "./tickets";

interface Outline {
  d: string;
  width: number;
  height: number;
}

const TILTS = [-4, 1, 3];
const STUB_PATH =
  "M6 4h92a2 2 0 0 1 2 2v18a8 8 0 0 0 0 16v18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V40a8 8 0 0 0 0-16V6a2 2 0 0 1 2-2Z";

/** Cut lines of the stickers made on today's tickets, oldest first; null where none was kept. */
function useTodaysOutlines() {
  const [outlines, setOutlines] = useState<(Outline | null)[]>([]);
  useEffect(() => {
    let cancelled = false;
    const today = ticketDay(new Date());
    listStickers().then(
      (records) => {
        if (cancelled) return;
        setOutlines(
          records
            .filter((r) => ticketDay(new Date(r.createdAt)) === today)
            .reverse()
            .map((r) => (r.outline ? { d: r.outline, width: r.width, height: r.height } : null)),
        );
      },
      (error: unknown) => console.error("Ticket stubs couldn't load today's stickers", error),
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return outlines;
}

interface Props {
  /** Free tickets used today. */
  used: number;
  /** Fresh stubs after a purchase: all filled, no outlines. */
  filled?: boolean;
  large?: boolean;
}

/**
 * Today's drawing tickets. A used ticket is an empty stub that keeps a faint kiss-cut
 * outline of the sticker it became: the cut line a sticker leaves on its backing.
 */
export function TicketStubs({ used, filled = false, large = false }: Props) {
  const outlines = useTodaysOutlines();
  const left = Math.max(0, FREE_TICKETS_PER_DAY - used);
  return (
    <div
      className={`ticket-row ${large ? "large" : "small"}`}
      role="img"
      aria-label={
        filled ? "Fresh tickets" : `${left} of ${FREE_TICKETS_PER_DAY} free tickets left today`
      }
    >
      {TILTS.slice(0, FREE_TICKETS_PER_DAY).map((tilt, i) => {
        const isUsed = !filled && i < used;
        const outline = isUsed ? outlines[i] : null;
        return (
          <svg
            key={i}
            className={`ticket ${isUsed ? "used" : "filled"}`}
            viewBox="0 0 104 64"
            style={{ rotate: `${tilt}deg` }}
            aria-hidden
          >
            <path d={STUB_PATH} />
            <line x1="34" y1="10" x2="34" y2="54" />
            {outline && (
              <svg
                className="ticket-ghost"
                x="42"
                y="8"
                width="52"
                height="48"
                viewBox={`0 0 ${outline.width} ${outline.height}`}
              >
                <path d={outline.d} />
              </svg>
            )}
          </svg>
        );
      })}
    </div>
  );
}
