import { useEffect, useId, useRef, useState } from "react";
import type { PersonView, StickerView } from "../api/views";
import { useTranslation } from "../i18n/react";
import { ArrowRight, GratitudeIcon, StickerBoardIcon } from "../icons";
import { formatMonthDay, handleOf } from "../stickers/format";
import { EASE_OUT } from "../ui/easing";
import { LabelButton } from "../ui/LabelButton";
import { useLargeScreen } from "../ui/largeScreen";
import { PhotoSticker } from "../ui/PhotoSticker";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import { useSheetDrag } from "../ui/useSheetDrag";
import { PhonePortal } from "../ui/PhonePortal";
import "./gift-received-notice.css";

interface Props {
  sticker: StickerView;
  receiver: PersonView;
  /** Milliseconds. */
  receivedAt: number;
  onClose: () => void;
}

const ARC_MS = 820;
/** The flying sticker's size. */
const FLYER_PX = 56;

/**
 * "@bob received your sticker", and a heart: the giver's moment once a gift is received, over the whole phone.
 * The sticker's silhouette holds its place, and the receiver's picture sticks on beside it. On a large
 * screen it's a card over the board, closed by its scrim or a swipe down its head too.
 */
export function GiftReceivedNotice({ sticker, receiver, receivedAt, onClose }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const large = useLargeScreen();
  const drag = useSheetDrag(onClose);
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const prop = useRef<HTMLDivElement>(null);
  const flyer = useRef<HTMLImageElement>(null);
  const face = useRef<HTMLSpanElement>(null);
  useFocusTrap(root, { onEscape: onClose });
  useBackToClose(true, onClose);

  // The sticker arcs in from the top right, where it left the board, into their picture.
  const [arriving] = useState(() => !reduced);
  useEffect(() => {
    const [box, from, to] = [prop.current, flyer.current, face.current];
    if (!arriving || !box || !from || !to) return;
    const b = box.getBoundingClientRect();
    const f = to.getBoundingClientRect();
    const tx = f.left - b.left + f.width / 2 - FLYER_PX / 2;
    const ty = f.top - b.top + f.height / 2 - FLYER_PX / 2;
    const arc = from.animate(
      [
        { transform: "translate(300px, -80px) scale(1.4) rotate(12deg)", opacity: 0 },
        { transform: "translate(260px, -90px) scale(1.3) rotate(8deg)", opacity: 1, offset: 0.15 },
        {
          transform: `translate(${(tx + 260) / 2}px, ${ty - 150}px) scale(1) rotate(-6deg)`,
          opacity: 1,
          offset: 0.55,
        },
        { transform: `translate(${tx}px, ${ty}px) scale(0.35) rotate(-4deg)`, opacity: 0 },
      ],
      { duration: ARC_MS, easing: EASE_OUT, fill: "forwards" },
    );
    // Finished, not cancelled: the flyer ends unseen either way, and nothing waits on it.
    return () => arc.finish();
  }, [arriving]);

  const who = handleOf(receiver);

  const notice = (
    <div
      ref={root}
      className={`gift-received-notice ${arriving ? "is-arriving" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      {large && (
        <div className="gift-received-notice__scrim" aria-hidden="true" onClick={onClose} />
      )}
      <div className="gift-received-notice__card" style={large ? drag.style : undefined}>
        <header className="gift-received-notice__head" {...(large ? drag.handlers : {})}>
          <h1 id={titleId} className="gift-received-notice__title">
            {t(($) => $.giving.receivedNotice.title, { name: who })}
            {/* A no-break space, so the heart never wraps onto a line of its own. */}
            {"\u00a0"}
            <GratitudeIcon className="gift-received-notice__heart" />
          </h1>
          <p className="gift-received-notice__sub">
            {t(($) => $.giving.receivedNotice.lead, { name: who })}
          </p>
        </header>
        <div className="gift-received-notice__stage">
          <div ref={prop} className="gift-received-notice__prop">
            <span
              className="gift-received-notice__silhouette"
              style={{ "--m": `url("${sticker.urls.mask}")` }}
              aria-hidden="true"
            />
            <span className="gift-received-notice__caption">
              <ArrowRight size={12} aria-hidden="true" />
              {t(($) => $.giving.receivedNotice.caption, {
                name: who,
                date: formatMonthDay(receivedAt),
              })}
            </span>
            <span ref={face} className="gift-received-notice__face">
              <PhotoSticker src={receiver.pictureUrl} name={receiver.name} size={150} />
            </span>
            {arriving && (
              <img
                ref={flyer}
                className="gift-received-notice__flyer"
                src={sticker.urls.png}
                alt=""
                draggable={false}
              />
            )}
          </div>
        </div>
        <div className="gift-received-notice__act">
          <LabelButton block icon={<StickerBoardIcon size={18} />} onClick={onClose}>
            {t(($) => $.ui.backToBoard)}
          </LabelButton>
        </div>
      </div>
    </div>
  );
  // Over the whole phone, tabs included.
  return <PhonePortal eachRender>{notice}</PhonePortal>;
}
