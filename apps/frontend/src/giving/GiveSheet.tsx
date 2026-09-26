import { Gift, X } from "@phosphor-icons/react";
import { Suspense, useRef, useState } from "react";
import { useMe } from "../api/meContext";
import { LIFF_ID } from "../line/liff";
import { formatNo } from "../stickers/format";
import { useKeptStickers, type KeptSticker } from "../stickers/useKeptStickers";
import { Key } from "../ui/Key";
import { lazyWithPreload } from "../ui/lazyWithPreload";
import { Sheet } from "../ui/Sheet";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
// Giving.css goes first, even ahead of the give-sheet.css StickerPicker brings, so the sheet's
// resets come after its margins wherever this loads.
import "./Giving.css";
import { StickerPicker } from "./StickerPicker";
import { useGiftSender } from "./useGiftSender";
import "./give-sheet.css";

const Giving = lazyWithPreload("Giving", () => import("./Giving").then((m) => m.Giving));

interface Props {
  /** The board's owner's handle. */
  to: string;
  onClose: () => void;
}

/**
 * Giving from someone else's board: pick one of yours, then it goes into a gift bag and out through
 * a LINE chat, as every gift does.
 */
export function GiveSheet({ to, onClose }: Props) {
  const { stickers, error: loadError } = useKeptStickers();
  const [picked, setPicked] = useState<string | null>(null);
  const [giving, setGiving] = useState<KeptSticker | null>(null);
  const pickedSticker = stickers?.find((s) => s.id === picked);
  const me = useMe();
  const sender = useGiftSender();
  const root = useRef<HTMLDivElement>(null);
  useBackToClose(!giving, onClose);
  useFocusTrap(root, { active: !giving, onEscape: onClose });

  if (giving && sender) {
    return (
      <Suspense fallback={null}>
        <Giving
          sticker={giving}
          fromHandle={me.handle ?? ""}
          sender={sender}
          liffId={LIFF_ID}
          onClose={(sent) => (sent ? onClose() : setGiving(null))}
        />
      </Suspense>
    );
  }

  return (
    <div className="board-sheet-layer" ref={root} tabIndex={-1}>
      <div className="giving__scrim" onClick={onClose} />
      <Sheet label={`Give @${to} a sticker`} onClose={onClose} className="giving__sheet">
        <div className="board-sheet-body">
          <header className="giving__head">
            <h2 className="giving__title">Give @{to} a sticker</h2>
            <button type="button" className="giving__icon-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </header>
          <p className="giving__sub">Pick one of yours, then send it to @{to} in a LINE chat.</p>

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
          {!sender && (
            <p className="giving__problem" role="alert">
              LINE’s friend picker isn’t available here, so gifts can’t be sent from this screen.
            </p>
          )}

          <div className="giving__acts">
            <Key
              size="md"
              tone="aqua"
              icon={<Gift size={22} />}
              onClick={() => pickedSticker && setGiving(pickedSticker)}
              disabled={!pickedSticker || !sender}
            >
              {pickedSticker ? `Give ${formatNo(pickedSticker.no)}` : "Pick a sticker"}
            </Key>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
