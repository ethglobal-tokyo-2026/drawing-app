import { GiveIcon } from "../icons";
import { Suspense, useRef, useState } from "react";
import { useMe } from "../api/meContext";
import { Trans, useTranslation } from "../i18n/react";
import { LIFF_ID } from "../line/liff";
import { formatHandle, formatNo } from "../stickers/format";
import { Handle } from "../stickers/Handle";
import { canGiveTo } from "../stickers/nsfw";
import { useKeptStickers, type KeptSticker } from "../stickers/useKeptStickers";
import { ErrorLine } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import { lazyWithPreload } from "../ui/lazyWithPreload";
import { keepNameWhole } from "../ui/keepNameWhole";
import { useLargeScreen } from "../ui/largeScreen";
import { Sheet } from "../ui/Sheet";
import { PhonePortal } from "../ui/PhonePortal";
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
  /** Whether the board's owner has the NSFW opt-in: an NSFW sticker goes only to someone who does. */
  toNsfwOptIn: boolean;
  onClose: () => void;
  /**
   * Where focus goes once the flow ends: the key that opened it. This sheet and Giving each mount as
   * the other goes, so neither one's focus trap ever sees that key focused.
   */
  returnFocus: () => HTMLElement | null;
}

/**
 * Giving from someone else's board: pick one of yours, then it goes into a gift bag and out through
 * a LINE chat, as every gift does.
 */
export function GiveSheet({ to, toId, toNsfwOptIn, onClose, returnFocus }: Props) {
  const { t } = useTranslation();
  const { stickers, error: loadError } = useKeptStickers();
  const [picked, setPicked] = useState<string | null>(null);
  const [giving, setGiving] = useState<KeptSticker | null>(null);
  const pickedSticker = stickers?.find((s) => s.id === picked);
  const me = useMe();
  const sender = useGiftSender();
  const layer = useRef<HTMLDivElement>(null);
  const large = useLargeScreen();

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
          returnFocus={returnFocus}
        />
      </Suspense>
    );
  }

  const name = formatHandle(to);
  const title = t(($) => $.giving.giveSheet.title, { name });
  const sheet = (
    <div className="board-sheet-layer" ref={layer}>
      <div className="giving__scrim" onClick={onClose} />
      <Sheet
        label={title}
        layer={layer}
        onClose={onClose}
        returnFocus={returnFocus}
        className="giving__sheet giving__sheet--give"
        card
        head={
          <header className="giving__head">
            <h2 className="giving__title">{keepNameWhole(title, name)}</h2>
          </header>
        }
      >
        <div className="board-sheet-body giving__pinned">
          {loadError && (
            <ErrorLine className="giving__problem" detail={loadError.detail}>
              {loadError.message}
            </ErrorLine>
          )}
          {stickers?.length === 0 && (
            <p className="sheet-empty keep-phrases">{t(($) => $.giving.giveSheet.none)}</p>
          )}
          {!!stickers?.length && (
            <StickerPicker
              stickers={stickers}
              picked={picked}
              onPick={setPicked}
              label={t(($) => $.giving.giveSheet.yourStickers)}
              blocked={(s) => !canGiveTo(s, toNsfwOptIn)}
            />
          )}
          {stickers?.some((s) => !canGiveTo(s, toNsfwOptIn)) && (
            <p className="fine giving__nsfw-note keep-phrases">
              <Trans
                i18nKey={($) => $.giving.nsfw.notOptedIn}
                components={{ name: <Handle name={name} /> }}
              />
            </p>
          )}
          {!sender && (
            <ErrorLine className="giving__problem">
              {t(($) => $.giving.giveSheet.noPicker)}
            </ErrorLine>
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
  // On a large screen its scrim dims the tab row too, where Give stands.
  return large ? <PhonePortal eachRender>{sheet}</PhonePortal> : sheet;
}
