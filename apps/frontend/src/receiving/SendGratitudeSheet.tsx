import { Clock, Heart } from "@phosphor-icons/react";
import { useRef } from "react";
import type { PersonView, StickerView } from "../api/views";
import { Duration } from "../stickers/Duration";
import { formatHandle } from "../stickers/format";
import { Key } from "../ui/Key";
import { PhotoSticker } from "../ui/PhotoSticker";
import { QuietLink } from "../ui/QuietLink";
import { Sheet } from "../ui/Sheet";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import "./send-gratitude-sheet.css";

interface Props {
  /** The gift just received. */
  gift: { id: string };
  sticker: StickerView;
  /** Who gave it: the person Send gratitude thanks. */
  giver: PersonView;
  onSend: () => void;
  onLater: () => void;
}

/**
 * Asks, once a received sticker has stuck to the board, whether to thank its giver now. It floats
 * over the board, which stays in view around it; Later, Back and the perforation all leave it for
 * the sticker's detail.
 */
export function SendGratitudeSheet({ sticker, giver, onSend, onLater }: Props) {
  const body = useRef<HTMLDivElement>(null);
  useFocusTrap(body, { onEscape: onLater });
  useBackToClose(true, onLater);

  const who = giver.handle === null ? giver.name : formatHandle(giver.handle);
  const title = `Send ${who} gratitude?`;
  return (
    <Sheet label={title} onClose={onLater} className="send-gratitude-sheet">
      <div ref={body}>
        <div className="send-gratitude-sheet__from">
          <PhotoSticker src={giver.pictureUrl} name={giver.name} size={60} />
          <div className="send-gratitude-sheet__text">
            <h2 className="title-label send-gratitude-sheet__title">{title}</h2>
            <p className="send-gratitude-sheet__line">
              {giver.id === sticker.artist.id ? (
                <>
                  It’s on your board. {who} drew it in <Duration seconds={sticker.timeUsed} />, and
                  thanks never expires.
                </>
              ) : (
                `It’s on your board, from ${who}. Thanks never expires.`
              )}
            </p>
          </div>
        </div>
        <div className="send-gratitude-sheet__acts">
          <Key tone="pink" size="lg" icon={<Heart weight="fill" />} onClick={onSend}>
            Send gratitude
          </Key>
          <QuietLink onClick={onLater}>
            <Clock /> Later
          </QuietLink>
        </div>
      </div>
    </Sheet>
  );
}
