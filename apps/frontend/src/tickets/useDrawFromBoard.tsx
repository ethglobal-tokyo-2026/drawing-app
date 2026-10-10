import { useEffect, useRef, useState } from "react";
import { useMe } from "../api/meContext";
import { keepsSession } from "../sticker-creation/session/keptSession";
import { T_STICK_MS } from "../ui/easing";
import { useReducedMotion } from "../ui/useReducedMotion";
import { OutOfTickets } from "./OutOfTickets";
import { ReserveTicketCheckout } from "./ReserveTicketCheckout";
import { nextKind, ticketsLeft, type Tickets } from "./tickets";
import { useTickets } from "./useTickets";

/**
 * Draw on the sticker board, with zero steps to the canvas. On a fresh sheet with a daily ticket left, Draw spends it
 * at once: the key's front ticket peels off, and the canvas opens as it goes, taking the spend the board started. A
 * reserve ticket is still asked for, on the canvas. With no tickets at all, the out-of-tickets card comes up over the
 * board, and the canvas doesn't load, unless a kept spend's key may have spent one (see hasKeptSpend). A drawing in
 * progress already has its ticket, so Draw just opens it, as it does whenever the drawing screen hasn't said what its
 * sheet needs.
 */
export function useDrawFromBoard(onDraw: () => void) {
  const tickets = useTickets();
  const me = useMe();
  const reduced = useReducedMotion();
  // A drawing in progress waits for Draw: the drawing screen holds its sheet or, until that screen has
  // said (after a reload its code loads after the board), this device keeps one.
  const [keptHere] = useState(() => keepsSession(me.id));
  const inProgress = tickets.sheet === "held" || (tickets.sheet === null && keptHere);
  // The tickets as Draw found them, shown while the front one peels, whatever the spend does meanwhile.
  const [peeling, setPeeling] = useState<Tickets | null>(null);
  const [card, setCard] = useState<"out" | "shop" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  /** `reserve`: Draw right after a purchase, which chose to spend a reserve ticket too. */
  const draw = ({ reserve = false } = {}) => {
    if (peeling) return;
    const now = tickets.tickets;
    // A failed load leaves them unknown: Draw asks again as it opens the canvas, which waits on the answer.
    if (!now && tickets.error) tickets.refresh();
    const kind = tickets.sheet === "fresh" && now ? nextKind(now) : undefined;
    // A spend whose answer never came may have spent the last ticket: the canvas sends its key again.
    if (kind === null && !tickets.hasKeptSpend()) {
      setCard("out");
      return;
    }
    if (now && (kind === "daily" || (kind === "reserve" && reserve))) {
      tickets.spendForSheet(kind);
      setPeeling(now);
      timer.current = setTimeout(
        () => {
          setPeeling(null);
          onDraw();
        },
        // The key's front ticket peels off in the small stubs' time, --t-stick.
        reduced ? 0 : T_STICK_MS,
      );
      return;
    }
    onDraw();
  };

  const loaded = tickets.tickets;
  const overBoard =
    card === "out" && loaded ? (
      <OutOfTickets
        tickets={loaded}
        overBoard
        onShop={() => setCard("shop")}
        onStartDrawing={() => {
          setCard(null);
          draw();
        }}
        onBoard={() => setCard(null)}
      />
    ) : card === "shop" ? (
      // Leaving the checkout with no tickets brings the out-of-tickets card back; with some, the board.
      <ReserveTicketCheckout
        onDraw={() => {
          setCard(null);
          draw({ reserve: true });
        }}
        onClose={() => setCard(loaded && ticketsLeft(loaded) === 0 ? "out" : null)}
      />
    ) : null;

  return {
    draw: () => draw(),
    shown: peeling ?? loaded,
    peeling: peeling !== null,
    overBoard,
    inProgress,
  };
}
