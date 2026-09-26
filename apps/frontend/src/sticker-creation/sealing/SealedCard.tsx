import { Storefront } from "@phosphor-icons/react";
import { useEffect, useId, useRef, type RefObject } from "react";
import { DrawIcon } from "../../icons/DrawIcon";
import { StickerBoardIcon } from "../../icons/StickerBoardIcon";
import { Duration } from "../../stickers/Duration";
import { formatDay, formatHandle, formatNo } from "../../stickers/format";
import type { Sticker } from "@drawing-app/api/client";
import { formatRefillTime } from "../../tickets/refill";
import { TicketCount } from "../../tickets/TicketCount";
import { TicketStubs } from "../../tickets/TicketStubs";
import { dailyTickets, nextRefill, ticketsLeft } from "../../tickets/tickets";
import { useTickets } from "../../tickets/useTickets";
import { Key } from "../../ui/Key";
import { LabelButton } from "../../ui/LabelButton";
import { TearLine } from "../../ui/TearLine";
import { useFocusTrap } from "../../ui/useFocusTrap";
import "./SealedCard.css";

/** A press shows before the screen changes. */
const ACT_AFTER_MS = 160;

interface Props {
  sealed: Sticker;
  handle: string;
  /** The ceremony has ended: until then, nothing on the card can be pressed. */
  done: boolean;
  cardRef: RefObject<HTMLElement | null>;
  slotRef: RefObject<HTMLDivElement | null>;
  onKeepDrawing: () => void;
  onBoard: () => void;
  /** The last ticket's way to more: the ticket shop. */
  onShop: () => void;
}

/**
 * The backing card the sticker lands on: its slot, "Sealed", the fine print, then the way on. With
 * tickets left, the key keeps drawing; on the last one, the key goes to the sticker board and the
 * ticket shop waits on label stock under it. Every line carries `data-card-line`, which the ceremony fades up.
 */
export function SealedCard({
  sealed,
  handle,
  done,
  cardRef,
  slotRef,
  onKeepDrawing,
  onBoard,
  onShop,
}: Props) {
  const titleId = useId();
  const { tickets } = useTickets();
  const dailyStubs = tickets ? dailyTickets(tickets) : [];
  const daily = tickets?.dailyLeft ?? 0;
  const last = tickets !== null && ticketsLeft(tickets) === 0;
  const refillTime = formatRefillTime(nextRefill(new Date()));
  // Fresh tickets first, then the used ones in the order they were used.
  const stubs = [...dailyStubs.filter((s) => !s.used), ...dailyStubs.filter((s) => s.used)];

  const chosen = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const act = (action: () => void) => () => {
    if (!done || chosen.current) return;
    chosen.current = true;
    timer.current = setTimeout(action, ACT_AFTER_MS);
  };
  // Escape takes the way that spends and buys nothing.
  useFocusTrap(cardRef, { active: done, onEscape: act(onBoard) });

  return (
    <section
      ref={cardRef}
      className="sealed-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      inert={!done}
    >
      <div ref={slotRef} className="sealed-card__slot" aria-hidden="true" />
      {/* "Sealed on-chain" and the sticker's name wait until the sticker has a chain record. */}
      <h2 id={titleId} className="sealed-card__title" data-card-line>
        Sealed
      </h2>
      <p className="fine sealed-card__fine" data-card-line>
        {formatNo(sealed.number)} · <Duration seconds={sealed.timeUsed} /> ·{" "}
        {formatDay(Date.parse(sealed.sealedAt))} · {formatHandle(handle)}
      </p>
      <div data-card-line>
        <TearLine />
      </div>
      {last ? (
        <Key
          className="sealed-card__key"
          icon={<StickerBoardIcon />}
          data-card-line
          onClick={act(onBoard)}
        >
          Go to sticker board
        </Key>
      ) : (
        <Key
          className="sealed-card__key"
          icon={<DrawIcon />}
          data-card-line
          onClick={act(onKeepDrawing)}
        >
          Keep drawing
        </Key>
      )}
      {tickets && (
        <div className="sealed-card__tickets" data-card-line>
          <div className="sealed-card__ticket-row">
            <TicketStubs
              size="small"
              stubs={stubs}
              label={`${daily} daily ${daily === 1 ? "ticket" : "tickets"} left today`}
            />
            <span className="visually-hidden">
              {tickets.reserveLeft} reserve {tickets.reserveLeft === 1 ? "ticket" : "tickets"}
            </span>
            <TicketCount kind="reserve" count={tickets.reserveLeft} />
          </div>
          {last ? (
            <p>That was today’s last ticket · new ones at {refillTime}</p>
          ) : (
            daily === 0 && <p>That was today’s last daily ticket · new ones at {refillTime}</p>
          )}
        </div>
      )}
      {last ? (
        <LabelButton block icon={<Storefront />} data-card-line onClick={act(onShop)}>
          Shop for tickets with Sui
        </LabelButton>
      ) : (
        <LabelButton block icon={<StickerBoardIcon />} data-card-line onClick={act(onBoard)}>
          Go to sticker board
        </LabelButton>
      )}
    </section>
  );
}
