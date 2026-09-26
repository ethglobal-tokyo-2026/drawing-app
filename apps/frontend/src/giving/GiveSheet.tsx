import { Gift, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { Sheet } from "../ui/Sheet";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { formatNo } from "../stickers/format";
import { useIdentity } from "../identity/useIdentity";
import { deviceGiftStore } from "./giftStore";
import { useKeptStickers, type KeptSticker } from "../stickers/useKeptStickers";
import { GiftBag } from "./GiftBag";
// Giving.css goes first, even ahead of the give-sheet.css StickerPicker brings, so the sheet's
// resets come after its margins wherever this loads.
import "./Giving.css";
import { StickerPicker } from "./StickerPicker";
import "./give-sheet.css";

/**
 * Records the sticker as given to the artist in this device's gift store, which takes it off your
 * board, and returns when. Nothing reaches them until giving in the app goes through the gift backend.
 */
function recordGiven(stickerId: string, to: string): number {
  const now = Date.now();
  deviceGiftStore().put({
    id: now.toString(36) + Math.random().toString(36).slice(2, 8),
    stickerId,
    packedAt: now,
    to,
    state: "sent",
    sentAt: now,
  });
  return now;
}

interface Props {
  /** The recipient's handle. */
  to: string;
  onClose: () => void;
}

/**
 * Giving from someone else's board: pick one of yours and it comes off your board into a
 * sealed gift bag for them. Kept in this device's gift store until the gift backend takes it.
 */
export function GiveSheet({ to, onClose }: Props) {
  const { stickers, error: loadError } = useKeptStickers();
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [given, setGiven] = useState<{ sticker: KeptSticker; at: number } | null>(null);
  const pickedSticker = stickers?.find((s) => s.id === picked);
  const me = useIdentity();
  const root = useRef<HTMLDivElement>(null);
  useBackToClose(true, onClose);
  useFocusTrap(root, { onEscape: onClose });
  // The confirmation replaces the key that had focus, so focus moves to its way back.
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (given) back.current?.focus();
  }, [given]);

  const give = () => {
    if (!pickedSticker) return;
    setError(null);
    try {
      const now = recordGiven(pickedSticker.id, to);
      setGiven({ sticker: pickedSticker, at: now });
    } catch (e) {
      console.error(`Giving ${formatNo(pickedSticker.no)} to @${to} failed`, e);
      setError(
        `Couldn’t give ${formatNo(pickedSticker.no)} to @${to}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  return (
    <div className="board-sheet-layer" ref={root} tabIndex={-1}>
      <div className="giving__scrim" onClick={onClose} />
      <Sheet label={`Give @${to} a sticker`} onClose={onClose} className="giving__sheet">
        <div className="board-sheet-body">
          {given ? (
            <div className="giving__sent" role="status">
              <GiftBag
                stickerUrl={given.sticker.url}
                fromHandle={me.handle}
                toHandle={to}
                state="sealed"
                sealedAt={given.at}
              />
              <h2 className="giving__title">On its way to @{to}</h2>
              <p className="giving__sub">
                It waits in its sealed bag until @{to} opens it in the app. You’ll hear about it in
                LINE.
              </p>
              <LabelButton ref={back} icon={<StickerBoardIcon size={18} />} onClick={onClose}>
                Back to @{to}’s board
              </LabelButton>
            </div>
          ) : (
            <>
              <header className="giving__head">
                <h2 className="giving__title">Give @{to} a sticker</h2>
                <button
                  type="button"
                  className="giving__icon-btn"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </header>
              <p className="giving__sub">
                Pick one of yours. It goes straight to @{to}’s board, and only they can receive it.
              </p>

              {loadError && (
                <p className="giving__problem" role="alert">
                  {loadError}
                </p>
              )}
              {stickers?.length === 0 && (
                <p className="sheet-empty">
                  You don’t have a sticker to give yet. Draw one on your board first.
                </p>
              )}
              {!!stickers?.length && (
                <StickerPicker
                  stickers={stickers}
                  picked={picked}
                  onPick={setPicked}
                  label="Your stickers"
                />
              )}

              {error && (
                <p className="giving__problem" role="alert">
                  {error}
                </p>
              )}
              <div className="giving__acts">
                <Key
                  size="md"
                  tone="aqua"
                  icon={<Gift size={22} />}
                  onClick={give}
                  disabled={!pickedSticker}
                >
                  {pickedSticker ? `Give ${formatNo(pickedSticker.no)}` : "Pick a sticker"}
                </Key>
                <p className="giving__leaves">
                  <StickerBoardIcon size={16} /> It comes off your board and into a gift bag for @
                  {to}.
                </p>
              </div>
            </>
          )}
        </div>
      </Sheet>
    </div>
  );
}
