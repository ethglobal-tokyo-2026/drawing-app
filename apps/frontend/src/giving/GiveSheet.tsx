import { GiveIcon, X } from "../icons";
import { Suspense, useRef, useState } from "react";
import { useMe } from "../api/meContext";
import type { AgeStatus } from "@drawing-app/api/client";
import { Trans, useTranslation } from "../i18n/react";
import { LIFF_ID } from "../line/liff";
import { formatHandle, formatNo } from "../stickers/format";
import { Handle } from "../stickers/Handle";
import { canGiveTo } from "../stickers/nsfw";
import { useKeptStickers, type KeptSticker } from "../stickers/useKeptStickers";
import { Key } from "../ui/Key";
import { lazyWithPreload } from "../ui/lazyWithPreload";
import { keepNameWhole } from "../ui/keepNameWhole";
import { Sheet } from "../ui/Sheet";
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
  /** The board's owner: the gift waits on their board as well as in the LINE chat. */
  toId: string;
  /** The board's owner's age status: an NSFW sticker goes only to an adult. */
  toAgeStatus: AgeStatus;
  onClose: () => void;
}

/**
 * Giving from someone else's board: pick one of yours, then it goes into a gift bag and out through
 * a LINE chat, as every gift does.
 */
export function GiveSheet({ to, toId, toAgeStatus, onClose }: Props) {
  const { t } = useTranslation();
  const { stickers, error: loadError } = useKeptStickers();
  const [picked, setPicked] = useState<string | null>(null);
  const [giving, setGiving] = useState<KeptSticker | null>(null);
  const pickedSticker = stickers?.find((s) => s.id === picked);
  const me = useMe();
  const sender = useGiftSender();
  const layer = useRef<HTMLDivElement>(null);

  if (giving && sender) {
    return (
      <Suspense fallback={null}>
        <Giving
          sticker={giving}
          fromHandle={me.handle ?? ""}
          sender={sender}
          liffId={LIFF_ID}
          forUserId={toId}
          toHandle={to}
          onClose={(sent) => (sent ? onClose() : setGiving(null))}
        />
      </Suspense>
    );
  }

  const name = formatHandle(to);
  const title = t(($) => $.giving.giveSheet.title, { name });
  return (
    <div className="board-sheet-layer" ref={layer}>
      <div className="giving__scrim" onClick={onClose} />
      <Sheet
        label={title}
        layer={layer}
        onClose={onClose}
        className="giving__sheet giving__sheet--give"
      >
        <div className="board-sheet-body giving__pinned">
          <header className="giving__head">
            <h2 className="giving__title">{keepNameWhole(title, name)}</h2>
            <button
              type="button"
              className="giving__icon-btn"
              onClick={onClose}
              aria-label={t(($) => $.giving.close)}
            >
              <X size={20} />
            </button>
          </header>
          <p className="giving__sub">{t(($) => $.giving.giveSheet.lead, { name })}</p>

          {loadError && (
            <p className="giving__problem" role="alert">
              {loadError}
            </p>
          )}
          {stickers?.length === 0 && (
            <p className="sheet-empty">{t(($) => $.giving.giveSheet.none)}</p>
          )}
          {!!stickers?.length && (
            <StickerPicker
              stickers={stickers}
              picked={picked}
              onPick={setPicked}
              label={t(($) => $.giving.giveSheet.yourStickers)}
              blocked={(s) => !canGiveTo(s, toAgeStatus)}
            />
          )}
          {stickers?.some((s) => !canGiveTo(s, toAgeStatus)) && (
            <p className="fine giving__nsfw-note">
              <Trans
                i18nKey={($) => $.giving.nsfw.adultsOnly}
                components={{ name: <Handle name={name} /> }}
              />
            </p>
          )}
          {!sender && (
            <p className="giving__problem" role="alert">
              {t(($) => $.giving.giveSheet.noPicker)}
            </p>
          )}

          <div className="giving__acts">
            <Key
              size="md"
              tone="aqua"
              icon={<GiveIcon size={22} />}
              onClick={() => pickedSticker && setGiving(pickedSticker)}
              disabled={!pickedSticker || !sender}
            >
              {pickedSticker
                ? t(($) => $.giving.give, { no: formatNo(pickedSticker.no) })
                : t(($) => $.giving.giveSheet.pick)}
            </Key>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
