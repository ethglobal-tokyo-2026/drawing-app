import { Storefront } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Trans, useTranslation } from "../../i18n/react";
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
  const dailyStubs = tickets ? dailyTickets(tickets) : [];
  const daily = tickets?.dailyLeft ?? 0;
  const last = tickets !== null && ticketsLeft(tickets) === 0;
  const refillTime = formatRefillTime(nextRefill(new Date()));
  // Fresh tickets first, then the used ones in the order they were used.
  const stubs = [...dailyStubs.filter((s) => !s.used), ...dailyStubs.filter((s) => s.used)];

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
      {tickets && (
        <div className="sealed-card__tickets" data-card-line>
          <div className="sealed-card__ticket-row">
            <TicketStubs
              size="small"
              stubs={stubs}
              label={t(($) => $.stickerCreation.sealedCard.dailyTicketsLeft, { count: daily })}
            />
            <span className="visually-hidden">
              {t(($) => $.stickerCreation.sealedCard.reserveTickets, {
                count: tickets.reserveLeft,
              })}
            </span>
            <TicketCount kind="reserve" count={tickets.reserveLeft} />
          </div>
          {last ? (
            <p>{t(($) => $.stickerCreation.sealedCard.lastTicket, { time: refillTime })}</p>
          ) : (
            daily === 0 && (
              <p>{t(($) => $.stickerCreation.sealedCard.lastDailyTicket, { time: refillTime })}</p>
            )
          )}
        </div>
      )}
      {last ? (
        <LabelButton
          block
          icon={<Storefront />}
          data-card-line
          onClick={act(onShop, { now: true })}
        >
          {t(($) => $.stickerCreation.sealedCard.shopForTickets)}
        </LabelButton>
      ) : (
        <LabelButton block icon={<StickerBoardIcon />} data-card-line onClick={act(onBoard)}>
          {t(($) => $.stickerCreation.sealedCard.goToStickerBoard)}
        </LabelButton>
      )}
    </section>
  );
}
