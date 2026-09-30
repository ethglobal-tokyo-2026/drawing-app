import { Clock, GratitudeIcon } from "../icons";
import type { PersonView, StickerView } from "../api/views";
import { Trans, useTranslation } from "../i18n/react";
import { Duration } from "../stickers/Duration";
import { formatHandle } from "../stickers/format";
import { Key } from "../ui/Key";
import { PhotoSticker } from "../ui/PhotoSticker";
import { keepNameWhole } from "../ui/keepNameWhole";
import { QuietLink } from "../ui/QuietLink";
import { Sheet } from "../ui/Sheet";
import "./send-gratitude-sheet.css";

interface Props {
  /** The gift just received. */
  gift: { id: string };
  sticker: StickerView;
  /** Who gave it: the person Send gratitude goes to. */
  giver: PersonView;
  onSend: () => void;
  onLater: () => void;
}

/**
 * Asks, once a received sticker has stuck to the board, whether to send its giver gratitude now. It
 * floats over the board, which stays in view around it; Later, Back and the perforation all leave it
 * for the sticker's detail.
 */
export function SendGratitudeSheet({ sticker, giver, onSend, onLater }: Props) {
  const { t } = useTranslation();
  const who = giver.handle === null ? giver.name : formatHandle(giver.handle);
  const title = t(($) => $.receiving.sendGratitude.title, { name: who });
  return (
    <Sheet label={title} onClose={onLater} className="send-gratitude-sheet">
      <div className="send-gratitude-sheet__from">
        <PhotoSticker src={giver.pictureUrl} name={giver.name} size={60} />
        <div className="send-gratitude-sheet__text">
          <h2 className="title-label send-gratitude-sheet__title">{keepNameWhole(title, who)}</h2>
          <p className="send-gratitude-sheet__line">
            {giver.id === sticker.artist.id ? (
              <Trans
                i18nKey={($) => $.receiving.sendGratitude.lineFromOriginalArtist}
                components={{
                  // A name is a component's text, not a value: Trans would read markup in a value.
                  name: <>{who}</>,
                  duration: <Duration seconds={sticker.timeUsed} />,
                }}
              />
            ) : (
              t(($) => $.receiving.sendGratitude.line, { name: who })
            )}
          </p>
        </div>
      </div>
      <div className="send-gratitude-sheet__acts">
        <Key tone="pink" size="lg" icon={<GratitudeIcon />} onClick={onSend} data-autofocus>
          {t(($) => $.receiving.sendGratitude.send)}
        </Key>
        <QuietLink onClick={onLater}>
          <Clock /> {t(($) => $.receiving.sendGratitude.later)}
        </QuietLink>
      </div>
    </Sheet>
  );
}
