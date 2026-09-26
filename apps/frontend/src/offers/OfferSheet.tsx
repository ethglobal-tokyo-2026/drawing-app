import { useState, type ReactNode } from "react";
import { ArtistArt } from "../artists/ArtistArt";
import type { Artist, ArtistBoardSticker } from "../artists/demoArtists";
import { Key, Label } from "../controls/controls";
import { StickerPicker } from "../giving/StickerPicker";
import { ChatDotsIcon } from "../icons/ChatDotsIcon";
import { CloseIcon } from "../icons/CloseIcon";
import { HeartIcon } from "../icons/HeartIcon";
import { PaperPlaneIcon } from "../icons/PaperPlaneIcon";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { SwapIcon } from "../icons/SwapIcon";
import { Sheet } from "../sticker-creation/tools/Sheet";
import { formatClock, formatDay, formatNo } from "../stickers/format";
import { useKeptStickers } from "../stickers/useKeptStickers";
import "../giving/giving.css";
import "./offers.css";

type OfferKind = "ask" | "swap" | "gratitude";

const KINDS: { id: OfferKind; title: string; note: (holder: string) => string; icon: ReactNode }[] =
  [
    {
      id: "ask",
      title: "Ask for it",
      note: (holder) => `A plain request. @${holder} can say yes or no.`,
      icon: <ChatDotsIcon size={18} />,
    },
    {
      id: "swap",
      title: "Swap one of yours",
      note: () => "Pick one of your stickers to trade for it.",
      icon: <SwapIcon size={18} />,
    },
    {
      id: "gratitude",
      title: "Offer gratitude",
      note: () => "Give some of your gratitude for it.",
      icon: <HeartIcon size={18} />,
    },
  ];

const GRATITUDE_AMOUNTS = [100, 250, 500];

interface Props {
  sticker: ArtistBoardSticker;
  /** Whose board it's on: they hold it and answer the offer. */
  holder: Artist;
  onClose: () => void;
}

/** Offer for a sticker on someone else's board: ask, swap one of yours, or offer gratitude. */
export function OfferSheet({ sticker, holder, onClose }: Props) {
  const [kind, setKind] = useState<OfferKind>("ask");
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [amount, setAmount] = useState(GRATITUDE_AMOUNTS[0]);
  const [sent, setSent] = useState(false);
  const { stickers, error } = useKeptStickers();
  const handle = holder.handle;
  const ready = kind !== "swap" || swapFor !== null;

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <Sheet onClose={onClose}>
          {sent ? (
            <div className="gift-sent" role="status">
              <span className="offer-sent-art">
                <ArtistArt art={sticker.art} />
              </span>
              <h2>Offer sent to @{handle}</h2>
              <p className="sheet-note">
                Nothing moves until @{handle} says yes. You’ll hear about it in LINE.
              </p>
              <p className="fine muted">Demo material · offers aren’t sent anywhere yet</p>
              <Label icon={<StickerBoardIcon size={18} />} onPress={onClose}>
                Back to @{handle}’s board
              </Label>
            </div>
          ) : (
            <>
              <div className="sheet-head">
                <h2>Offer for {formatNo(sticker.no)}</h2>
                <button className="round-close" onClick={onClose} aria-label="Close">
                  <CloseIcon />
                </button>
              </div>

              <div className="offer-subject">
                <ArtistArt art={sticker.art} className="offer-art" />
                <p className="fine muted">
                  {formatNo(sticker.no)} · {formatClock(sticker.timeUsed)} ·{" "}
                  {formatDay(sticker.sealedAt)}
                  <br />
                  By @{sticker.by ?? handle} · @{handle} holds it
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
                  <p className="sheet-error" role="alert">
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

              <div className="sheet-foot">
                <Key
                  size="md"
                  hue="grape"
                  icon={<PaperPlaneIcon size={22} />}
                  onPress={() => setSent(true)}
                  disabled={!ready}
                >
                  Send offer
                </Key>
                <p className="sheet-hint">Nothing moves until @{handle} says yes.</p>
              </div>
            </>
          )}
        </Sheet>
      </div>
    </div>
  );
}
