import { useState } from "react";
import { Key, Label } from "../controls/controls";
import { GiftIcon } from "../icons/GiftIcon";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { Sheet } from "../sticker-creation/tools/Sheet";
import { formatNo } from "../stickers/format";
import { giveSticker } from "../stickers/stickerStorage";
import { useKeptStickers, type KeptSticker } from "../stickers/useKeptStickers";
import { CloseIcon } from "../icons/CloseIcon";
import { GiftBag } from "./GiftBag";
import { StickerPicker } from "./StickerPicker";
import "./giving.css";

interface Props {
  /** The recipient's handle. */
  to: string;
  onClose: () => void;
}

/**
 * Giving from someone else's board: pick one of yours and it comes off your board into a
 * sealed gift bag for them. Kept on this device until the escrow backend is connected.
 */
export function GiveSheet({ to, onClose }: Props) {
  const { stickers, error: loadError } = useKeptStickers();
  const [picked, setPicked] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [given, setGiven] = useState<{ sticker: KeptSticker; at: number } | null>(null);
  const pickedSticker = stickers?.find((s) => s.id === picked);

  const give = async () => {
    if (!pickedSticker) return;
    setSending(true);
    setError(null);
    try {
      const gift = await giveSticker(pickedSticker.id, to);
      setGiven({ sticker: pickedSticker, at: gift.givenAt });
    } catch (e) {
      console.error(`Giving ${formatNo(pickedSticker.no)} to @${to} failed`, e);
      setError(
        `Couldn’t give ${formatNo(pickedSticker.no)} to @${to}: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <Sheet onClose={onClose}>
          {given ? (
            <div className="gift-sent" role="status">
              <GiftBag url={given.sticker.url} to={to} sealedAt={given.at} />
              <h2>On its way to @{to}</h2>
              <p className="sheet-note">
                It waits in its sealed bag until @{to} opens it in the app. You’ll hear about it in
                LINE.
              </p>
              <Label icon={<StickerBoardIcon size={18} />} onPress={onClose}>
                Back to @{to}’s board
              </Label>
            </div>
          ) : (
            <>
              <div className="sheet-head">
                <h2>Give @{to} a sticker</h2>
                <button className="round-close" onClick={onClose} aria-label="Close">
                  <CloseIcon />
                </button>
              </div>
              <p className="sheet-note">
                Pick one of yours. It goes straight to @{to}’s board, and only they can accept it.
              </p>

              {loadError && (
                <p className="sheet-error" role="alert">
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
                <p className="sheet-error" role="alert">
                  {error}
                </p>
              )}
              <div className="sheet-foot">
                <Key
                  size="md"
                  hue="aqua"
                  icon={<GiftIcon size={22} />}
                  onPress={() => void give()}
                  disabled={!pickedSticker || sending}
                >
                  {pickedSticker ? `Give ${formatNo(pickedSticker.no)}` : "Pick a sticker"}
                </Key>
                <p className="sheet-hint">
                  <StickerBoardIcon size={14} /> It comes off your board and into a gift bag for @
                  {to}.
                </p>
              </div>
            </>
          )}
        </Sheet>
      </div>
    </div>
  );
}
