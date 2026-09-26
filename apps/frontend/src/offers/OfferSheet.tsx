import { ArrowsLeftRight, ChatCircleDots, Heart, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PersonView } from "../api/views";
import { formatCount } from "../i18n/format";
import { useTranslation } from "../i18n/react";
import { handleOf, type BoardStickerView } from "../sticker-board/boardSticker";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
// Giving.css goes first, even ahead of the give-sheet.css StickerPicker brings, so the sheet's
// resets come after its margins wherever this loads.
import "../giving/Giving.css";
import { StickerPicker } from "../giving/StickerPicker";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { Sheet } from "../ui/Sheet";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { Duration } from "../stickers/Duration";
import { formatDay, formatNo } from "../stickers/format";
import { useKeptStickers } from "../stickers/useKeptStickers";
import "../giving/give-sheet.css";
import "./offers.css";

type OfferKind = "ask" | "swap" | "gratitude";

const KINDS: { id: OfferKind; icon: ReactNode }[] = [
  { id: "ask", icon: <ChatCircleDots size={18} weight="fill" /> },
  { id: "swap", icon: <ArrowsLeftRight size={18} /> },
  { id: "gratitude", icon: <Heart size={18} /> },
];

const GRATITUDE_AMOUNTS = [100, 250, 500];

interface Props {
  sticker: BoardStickerView;
  /** Whose board it's on: they hold it and answer the offer. */
  holder: PersonView;
  onClose: () => void;
}

/** Offer for a sticker on someone else's board: ask, swap one of yours, or offer gratitude. */
export function OfferSheet({ sticker, holder, onClose }: Props) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<OfferKind>("ask");
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [amount, setAmount] = useState(GRATITUDE_AMOUNTS[0]);
  const [sent, setSent] = useState(false);
  const { stickers, error } = useKeptStickers();
  const printedHolder = handleOf(holder);
  const title = t(($) => $.offers.title, { no: formatNo(sticker.no) });
  const root = useRef<HTMLDivElement>(null);
  useBackToClose(true, onClose);
  useFocusTrap(root, { onEscape: onClose });
  // The confirmation replaces the key that had focus, so focus moves to its way back.
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (sent) back.current?.focus();
  }, [sent]);
  const ready = kind !== "swap" || swapFor !== null;

  return (
    <div className="board-sheet-layer" ref={root} tabIndex={-1}>
      <div className="giving__scrim" onClick={onClose} />
      <Sheet label={title} onClose={onClose} className="giving__sheet">
        <div className="board-sheet-body">
          {sent ? (
            <div className="giving__sent" role="status">
              <span className="offer-sent-art">
                <img src={sticker.urls.png} alt="" className="sticker-image" />
              </span>
              <h2 className="giving__title">
                {t(($) => $.offers.sent.title, { holder: printedHolder })}
              </h2>
              <p className="giving__sub">
                {t(($) => $.offers.sent.lead, { holder: printedHolder })}
              </p>
              <p className="fine sheet-fine">{t(($) => $.offers.sent.demo)}</p>
              <LabelButton ref={back} icon={<StickerBoardIcon size={18} />} onClick={onClose}>
                {t(($) => $.offers.sent.back, { holder: printedHolder })}
              </LabelButton>
            </div>
          ) : (
            <>
              <header className="giving__head">
                <h2 className="giving__title">{title}</h2>
                <button
                  type="button"
                  className="giving__icon-btn"
                  onClick={onClose}
                  aria-label={t(($) => $.offers.close)}
                >
                  <X size={20} />
                </button>
              </header>

              <div className="offer-subject">
                <img src={sticker.urls.png} alt="" className="sticker-image offer-art" />
                <p className="fine sheet-fine">
                  {formatNo(sticker.no)}
                  {" · "}
                  <Duration seconds={sticker.timeUsed} />
                  {" · "}
                  {formatDay(sticker.createdAt)}
                  <br />
                  {t(($) => $.offers.credit, {
                    artist: handleOf(sticker.artist),
                    holder: printedHolder,
                  })}
                </p>
              </div>

              <div
                className="offer-kinds"
                role="radiogroup"
                aria-label={t(($) => $.offers.kinds.label)}
              >
                {KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={kind === k.id}
                    className={`offer-kind ${kind === k.id ? "chosen" : ""}`}
                    onClick={() => setKind(k.id)}
                  >
                    <span className="offer-icon">{k.icon}</span>
                    <span className="offer-text">
                      <b>{t(($) => $.offers.kinds[k.id].title)}</b>
                      <span>{t(($) => $.offers.kinds[k.id].note, { holder: printedHolder })}</span>
                    </span>
                    <span className="radio" aria-hidden />
                  </button>
                ))}
              </div>

              {kind === "swap" &&
                (error ? (
                  <p className="giving__problem" role="alert">
                    {error}
                  </p>
                ) : stickers?.length === 0 ? (
                  <p className="sheet-empty">{t(($) => $.offers.swap.none)}</p>
                ) : (
                  stickers && (
                    <StickerPicker
                      stickers={stickers}
                      picked={swapFor}
                      onPick={setSwapFor}
                      label={t(($) => $.offers.swap.picker)}
                      compact
                    />
                  )
                ))}

              {kind === "gratitude" && (
                <div
                  className="gratitude-amounts"
                  role="radiogroup"
                  aria-label={t(($) => $.offers.gratitudeAmounts)}
                >
                  {GRATITUDE_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={amount === a}
                      className={amount === a ? "chosen" : ""}
                      onClick={() => setAmount(a)}
                    >
                      {formatCount(a)}
                    </button>
                  ))}
                </div>
              )}

              <div className="giving__acts">
                <Key
                  size="md"
                  tone="grape"
                  icon={<PaperPlaneTilt size={22} />}
                  onClick={() => setSent(true)}
                  disabled={!ready}
                >
                  {t(($) => $.offers.send)}
                </Key>
                <p className="giving__leaves">
                  {t(($) => $.offers.waitsForYes, { holder: printedHolder })}
                </p>
              </div>
            </>
          )}
        </div>
      </Sheet>
    </div>
  );
}
