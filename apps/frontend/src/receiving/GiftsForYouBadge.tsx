import type { GiftsForYou } from "@drawing-app/api/client";
import { toPerson, toSticker } from "../api/views";
import { Trans, useTranslation } from "../i18n/react";
import { GiveIcon } from "../icons";
import { formatHandle } from "../stickers/format";
import "./gifts-for-you-badge.css";

export type GiftForYou = GiftsForYou["gifts"][number];

interface Props {
  /** Gifts waiting for you, newest first. */
  gifts: readonly GiftForYou[];
  /** Opens the newest gift, to unpackage and accept. */
  onOpen: (gift: GiftForYou) => void;
  /** The board has settled: the badge lifts a few times to be noticed, then stays put. */
  nudging?: boolean;
}

/**
 * Gifts waiting for you: a sealed gift, never the sticker, so the pull tab still reveals it; an NSFW
 * sticker's gift says 18+. It asks to be opened, where the badge for gifts on their way only reports.
 * With none waiting, nothing shows.
 */
export function GiftsForYouBadge({ gifts, onOpen, nudging = false }: Props) {
  const { t } = useTranslation();
  const [newest] = gifts;
  if (!newest) return null;
  const giver = toPerson(newest.giver);
  const name = giver.handle ? formatHandle(giver.handle) : giver.name;
  const count = gifts.length;
  const nsfw = toSticker(newest.sticker).nsfw;
  return (
    <button
      type="button"
      className={nudging ? "gifts-for-you-badge is-nudging" : "gifts-for-you-badge"}
      data-press
      aria-label={t(($) => $.receiving.giftsForYou.label, { count, name })}
      onClick={() => onOpen(newest)}
    >
      <span className="gifts-for-you-badge__bag" aria-hidden="true">
        <GiveIcon weight="fill" size={24} />
        {count > 1 && <span className="gifts-for-you-badge__count">{count}</span>}
        {nsfw && (
          <span className="gifts-for-you-badge__nsfw">{t(($) => $.stickers.nsfw.mark)}</span>
        )}
      </span>
      <span className="gifts-for-you-badge__text" aria-hidden="true">
        <span className="gifts-for-you-badge__title">
          {t(($) => $.receiving.giftsForYou.title, { count })}
        </span>
        <span className="fine gifts-for-you-badge__from">
          {/* The handle keeps its own case in the fine print's capitals. */}
          {count > 1 ? (
            <Trans
              i18nKey={($) => $.receiving.giftsForYou.fromAndMore}
              values={{ count: count - 1 }}
              components={{ name: <span className="handle">{name}</span> }}
            />
          ) : (
            <Trans
              i18nKey={($) => $.receiving.giftsForYou.from}
              components={{ name: <span className="handle">{name}</span> }}
            />
          )}
        </span>
      </span>
    </button>
  );
}
