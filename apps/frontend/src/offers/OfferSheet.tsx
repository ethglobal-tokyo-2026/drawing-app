import { ArrowsLeftRight, ChatCircleDots, Heart, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PersonView } from "../api/views";
import type { BoardStickerView } from "../sticker-board/boardSticker";
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

const KINDS: { id: OfferKind; title: string; note: (holder: string) => string; icon: ReactNode }[] =
  [
    {
      id: "ask",
      title: "Ask for it",
      note: (holder) => `A plain request. @${holder} can say yes or no.`,
      icon: <ChatCircleDots size={18} weight="fill" />,
    },
    {
      id: "swap",
      title: "Swap one of yours",
      note: () => "Pick one of your stickers to trade for it.",
      icon: <ArrowsLeftRight size={18} />,
    },
    {
      id: "gratitude",
      title: "Offer gratitude",
      note: () => "Give some of your gratitude for it.",
      icon: <Heart size={18} />,
    },
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
  const [kind, setKind] = useState<OfferKind>("ask");
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [amount, setAmount] = useState(GRATITUDE_AMOUNTS[0]);
  const [sent, setSent] = useState(false);
  const { stickers, error } = useKeptStickers();
  const handle = holder.handle ?? holder.name;
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
      <Sheet
        label={`Offer for ${formatNo(sticker.no)}`}
        onClose={onClose}
        className="giving__sheet"
      >
        <div className="board-sheet-body">
          {sent ? (
            <div className="giving__sent" role="status">
              <span className="offer-sent-art">
                <img src={sticker.urls.png} alt="" className="sticker-image" />
              </span>
              <h2 className="giving__title">Offer sent to @{handle}</h2>
              <p className="giving__sub">
                Nothing moves until @{handle} says yes. You’ll hear about it in LINE.
              </p>
              <p className="fine sheet-fine">Demo material · offers aren’t sent anywhere yet</p>
              <LabelButton ref={back} icon={<StickerBoardIcon size={18} />} onClick={onClose}>
                Back to @{handle}’s board
              </LabelButton>
            </div>
          ) : (
            <>
              <header className="giving__head">
                <h2 className="giving__title">Offer for {formatNo(sticker.no)}</h2>
                <button
                  type="button"
                  className="giving__icon-btn"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="offer-subject">
                <img src={sticker.urls.png} alt="" className="sticker-image offer-art" />
                <p className="fine sheet-fine">
                  {formatNo(sticker.no)} · <Duration seconds={sticker.timeUsed} /> ·{" "}
                  {formatDay(sticker.createdAt)}
                  <br />
                  By @{sticker.artist.handle ?? sticker.artist.name} · @{handle} holds it
                </p>
              </div>

              <div className="offer-kinds" role="radiogroup" aria-label="What to offer">
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
                      <b>{k.title}</b>
                      <span>{k.note(handle)}</span>
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
                  <p className="sheet-empty">You don’t have a sticker to swap yet.</p>
                ) : (
                  stickers && (
                    <StickerPicker
                      stickers={stickers}
                      picked={swapFor}
                      onPick={setSwapFor}
                      label="Your sticker to swap"
                      compact
                    />
                  )
                ))}

              {kind === "gratitude" && (
                <div
                  className="gratitude-amounts"
                  role="radiogroup"
                  aria-label="How much gratitude"
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
                      {a.toLocaleString("en-US")}
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
                  Send offer
                </Key>
                <p className="giving__leaves">Nothing moves until @{handle} says yes.</p>
              </div>
            </>
          )}
        </div>
      </Sheet>
    </div>
  );
}
