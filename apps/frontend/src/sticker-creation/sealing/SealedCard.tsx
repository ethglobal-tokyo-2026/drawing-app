import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Trans, useTranslation } from "../../i18n/react";
import { DrawIcon, ShopIcon, StickerBoardIcon } from "../../icons";
import { Duration } from "../../stickers/Duration";
import { formatDay, formatHandle, formatNo } from "../../stickers/format";
import type { Sticker } from "@drawing-app/api/client";
import { toSticker } from "../../api/views";
import { formatRefillTime } from "../../tickets/refill";
import { TicketStubs } from "../../tickets/TicketStubs";
import {
  describeTickets,
  nextRefill,
  spentIndex,
  ticketView,
  type Tickets,
} from "../../tickets/tickets";
import { useTickets } from "../../tickets/useTickets";
import { Key } from "../../ui/Key";
import { LabelButton } from "../../ui/LabelButton";
import { TearLine } from "../../ui/TearLine";
import { useFocusTrap } from "../../ui/useFocusTrap";
import "./SealedCard.css";

/** A press shows before the screen changes to the sticker board. */
const ACT_AFTER_MS = 160;

interface Props {
  sealed: Sticker;
  handle: string;
  /** The ceremony has ended: until then, nothing on the card can be pressed. */
  done: boolean;
  /** It's on its way out, over the fresh sheet: it takes no presses and keeps what it showed. */
  leaving: boolean;
  cardRef: RefObject<HTMLElement | null>;
  slotRef: RefObject<HTMLDivElement | null>;
  onKeepDrawing: () => void;
  onBoard: () => void;
  /** The last ticket's way to more: the reserve ticket checkout. */
  onShop: () => void;
}

/**
 * The tickets the next drawing can use (ticketView), small, under the key: the day's stubs with any reserve tickets
 * as one reserve ticket and its count, or that reserve ticket alone once the daily ones are used. Under them, a line
 * when this sticker used the day's last daily ticket, or the last ticket of all.
 */
function TicketRow({ tickets, peel }: { tickets: Tickets; peel: boolean }) {
  const { t } = useTranslation();
  const view = ticketView(tickets);
  const refillTime = formatRefillTime(nextRefill(new Date()));
  // The ticket this sticker was drawn on is the day's latest.
  const usedLastDaily = view.show === "reserve" && tickets.usedToday.at(-1)?.kind === "daily";
  return (
    <div className="sealed-card__tickets" data-card-line>
      <div className="sealed-card__ticket-row" role="img" aria-label={describeTickets(tickets)}>
        {view.show !== "reserve" && (
          <TicketStubs
            size="small"
            stubs={view.stubs}
            spending={peel ? { index: spentIndex(view.stubs), state: "peel" } : null}
          />
        )}
        {view.reserve > 0 && (
          <span className="sealed-card__reserve">
            <TicketStubs size="small" stubs={[{ used: false, kind: "reserve" }]} />
            {t(($) => $.tickets.count, { count: view.reserve })}
          </span>
        )}
      </div>
      {view.show === "none" && (
        <p>{t(($) => $.stickerCreation.sealedCard.lastTicket, { time: refillTime })}</p>
      )}
      {usedLastDaily && (
        <p>{t(($) => $.stickerCreation.sealedCard.lastDailyTicket, { time: refillTime })}</p>
      )}
    </div>
  );
}

/**
 * The backing card the sticker lands on: its slot, "Sealed", the fine print, then the way on. With
 * tickets left, the key keeps drawing; on the last one, the key goes to the sticker board and buying
 * reserve tickets waits on label stock under it. Every line carries `data-card-line`, which the ceremony fades up.
 */
export function SealedCard({
  sealed,
  handle,
  done,
  leaving,
  cardRef,
  slotRef,
  onKeepDrawing,
  onBoard,
  onShop,
}: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const { tickets: live } = useTickets();
  // The spend Keep drawing hands over to can land while the card leaves; it leaves as it was.
  const [shown, setShown] = useState(live);
  if (!leaving && shown !== live) setShown(live);
  const tickets = leaving ? shown : live;
  const last = tickets !== null && ticketView(tickets).show === "none";

  const chosen = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  // Keep drawing and the shop act at once: the card's own exit carries the change, and the key's
  // pop rides out on it. The sticker board is another screen, so the press shows first.
  const act =
    (action: () => void, { now = false } = {}) =>
    () => {
      if (!done || chosen.current) return;
      chosen.current = true;
      if (now) action();
      else timer.current = setTimeout(action, ACT_AFTER_MS);
    };
  // Escape takes the way that spends and buys nothing.
  useFocusTrap(cardRef, { active: done && !leaving, onEscape: act(onBoard) });

  return (
    <section
      ref={cardRef}
      className="sealed-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      inert={!done || leaving}
    >
      <div ref={slotRef} className="sealed-card__slot" aria-hidden="true" />
      {/* "Sealed on-chain" and the sticker's name wait until the sticker has a chain record. */}
      <h2 id={titleId} className="sealed-card__title" data-card-line>
        {t(($) => $.stickerCreation.sealedCard.title)}
        {toSticker(sealed).nsfw && (
          <span className="sealed-card__nsfw">{t(($) => $.stickerCreation.nsfw.mark)}</span>
        )}
      </h2>
      <p className="fine sealed-card__fine" data-card-line>
        <Trans
          i18nKey={($) => $.stickerCreation.sealedCard.finePrint}
          values={{ no: formatNo(sealed.number), day: formatDay(Date.parse(sealed.sealedAt)) }}
          components={{
            duration: <Duration seconds={sealed.timeUsed} />,
            // A handle is a component's text, not a value: Trans would read markup in a value.
            handle: <>{formatHandle(handle)}</>,
          }}
        />
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
          {t(($) => $.stickerCreation.sealedCard.goToStickerBoard)}
        </Key>
      ) : (
        <Key
          className="sealed-card__key"
          icon={<DrawIcon />}
          data-card-line
          onClick={act(onKeepDrawing, { now: true })}
        >
          {t(($) => $.stickerCreation.sealedCard.keepDrawing)}
        </Key>
      )}
      {/* Keep drawing spends the next daily ticket: it peels off as the card leaves. */}
      {tickets && <TicketRow tickets={tickets} peel={leaving && !last} />}
      {last ? (
        <LabelButton block icon={<ShopIcon />} data-card-line onClick={act(onShop, { now: true })}>
          {t(($) => $.stickerCreation.sealedCard.buyReserveTickets)}
        </LabelButton>
      ) : (
        <LabelButton block icon={<StickerBoardIcon />} data-card-line onClick={act(onBoard)}>
          {t(($) => $.stickerCreation.sealedCard.goToStickerBoard)}
        </LabelButton>
      )}
    </section>
  );
}
