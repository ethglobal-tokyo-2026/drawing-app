import type { GiftsForYou } from "@drawing-app/api/client";
import { Gift } from "@phosphor-icons/react";
import { toPerson } from "../api/views";
import { useTranslation } from "../i18n/react";
import { formatHandle } from "../stickers/format";
import "./gifts-for-you-badge.css";

export type GiftForYou = GiftsForYou["gifts"][number];

interface Props {
  /** Gifts waiting for you, newest first. */
  gifts: readonly GiftForYou[];
  /** Opens the newest gift, to unpackage and accept. */
  onOpen: (gift: GiftForYou) => void;
}

/**
 * Gifts waiting for you: a sealed gift, never the sticker, so the pull tab still reveals it. It asks
 * to be opened, where the badge for gifts on their way only reports. With none waiting, nothing shows.
 */
export function GiftsForYouBadge({ gifts, onOpen }: Props) {
  const { t } = useTranslation();
  const [newest] = gifts;
  if (!newest) return null;
  const giver = toPerson(newest.giver);
  const name = giver.handle ? formatHandle(giver.handle) : giver.name;
  const count = gifts.length;
  return (
    <button
      type="button"
      className="gifts-for-you-badge"
      data-press
      aria-label={t(($) => $.receiving.giftsForYou.label, { count, name })}
      onClick={() => onOpen(newest)}
    >
      <span className="gifts-for-you-badge__bag" aria-hidden="true">
        <Gift weight="fill" size={24} />
        {count > 1 && <span className="gifts-for-you-badge__count">{count}</span>}
      </span>
      <span className="gifts-for-you-badge__text" aria-hidden="true">
        <span className="gifts-for-you-badge__title">
          {t(($) => $.receiving.giftsForYou.title, { count })}
        </span>
        <span className="fine gifts-for-you-badge__from">
          {count > 1
            ? t(($) => $.receiving.giftsForYou.fromAndMore, { name, count: count - 1 })
            : t(($) => $.receiving.giftsForYou.from, { name })}
        </span>
      </span>
    </button>
  );
}
