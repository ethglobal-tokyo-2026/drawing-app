import type { PersonView, StickerView } from "../api/views";
import { formatHandle, formatNo } from "../stickers/format";
import "./pending-gifts-badge.css";

export interface PendingGift {
  giftId: string;
  sticker: StickerView;
  /** Who it went to, for a gift given to someone in the app. LINE's picker never says. */
  to?: PersonView;
}

interface Props {
  /** Sent gifts, newest first. */
  gifts: readonly PendingGift[];
  /** Opens a sticker's detail: the newest gift's. */
  onOpen: (stickerId: string) => void;
}

const nameOf = (p: PersonView) => (p.handle ? formatHandle(p.handle) : p.name);

/** Your gifts on their way, in a clear-film pocket. With none on their way, nothing shows. */
export function PendingGiftsNotificationBadge({ gifts, onOpen }: Props) {
  const [newest, next] = gifts;
  if (!newest) return null;
  const no = formatNo(newest.sticker.no);
  const several = gifts.length > 1;
  const to = newest.to && nameOf(newest.to);
  const line = several ? `${no} and ${gifts.length - 1} more` : to ? `to ${to}` : no;
  const label = several
    ? `${gifts.length} gifts on their way`
    : `Gifts on their way: ${no}${to ? ` to ${to}` : ""}`;
  // The back sleeve comes first, so the newest's lies on top.
  const sleeves = next ? [next, newest] : [newest];

  return (
    <button
      type="button"
      className="pending-gifts-badge"
      data-press
      aria-label={label}
      onClick={() => onOpen(newest.sticker.id)}
    >
      <span className="pending-gifts-badge__sleeves" aria-hidden="true">
        {sleeves.map((g) => (
          <i
            key={g.giftId}
            className={`pending-gifts-badge__sleeve ${g === newest ? "is-front" : ""}`}
          >
            <img src={g.sticker.urls.png} alt="" draggable={false} />
          </i>
        ))}
      </span>
      <span className="pending-gifts-badge__text" aria-hidden="true">
        <span className="fine pending-gifts-badge__fine">
          {several ? "On their way" : "On its way"}
        </span>
        <span className="pending-gifts-badge__line">{line}</span>
      </span>
    </button>
  );
}
