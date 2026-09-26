import { ArrowRight } from "@phosphor-icons/react";
import { Fragment, useLayoutEffect, useRef } from "react";
import { giftTag, sealDate } from "./giftTag";
import "./GiftBag.css";

interface Props {
  stickerUrl: string;
  /** The giver's handle, printed on the tag when the recipient isn't known. */
  fromHandle: string;
  /** The recipient chosen in the app, printed on the tag in place of the giver. */
  toHandle?: string;
  /** Open: the sticker peeks out of the mouth. Sealed: sent, pressed shut, with the seal on. */
  state: "open" | "sealed";
  /** Drop: the sticker falls into the open bag. Take out: it lifts back out. */
  motion?: "drop" | "takeOut";
  /** When it was sealed, printed on the tear tape. */
  sealedAt?: number;
}

/** The frosted gift bag. It has no zipper: it seals with a tear tape, only once the send succeeds. */
export function GiftBag({ stickerUrl, fromHandle, toHandle, state, motion, sealedAt }: Props) {
  const tag = giftTag(fromHandle, toHandle);
  const name = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = name.current;
    if (el) return fitName(el);
  }, [tag.name]);
  const classes = [
    "gift-bag",
    motion === "drop" && "is-dropping",
    motion === "takeOut" && "is-taking-out",
  ];
  return (
    <div
      className={classes.filter(Boolean).join(" ")}
      data-state={state}
      role="img"
      aria-label={
        state === "sealed"
          ? `The gift bag, sealed, tagged ${tag.label} ${tag.name}`
          : `The sticker in an open gift bag, tagged ${tag.label} ${tag.name}`
      }
    >
      <i className="gift-bag__part gift-bag__back" />
      <img className="gift-bag__sticker" src={stickerUrl} alt="" draggable={false} />
      <i className="gift-bag__part gift-bag__front" />
      <i className="gift-bag__part gift-bag__streak" />
      <i className="gift-bag__part gift-bag__mouth" />
      <SealStrip date={sealedAt === undefined ? "" : sealDate(sealedAt)} />
      <span className="gift-bag__part gift-bag__tag">
        <span className="gift-tag">
          <TagShape />
          <span className="gift-tag__label">{tag.label}</span>
          <span className="gift-tag__name" ref={name}>
            {tag.name}
          </span>
        </span>
      </span>
    </div>
  );
}

/** The printed name shrinks to fit the tag's face, down to a size that stays legible at its scale. */
const NAME_PX = { max: 32, min: 16 };

function fitName(el: HTMLElement): () => void {
  let live = true;
  const fit = () => {
    if (!live) return;
    for (let px = NAME_PX.max; px >= NAME_PX.min; px--) {
      el.style.fontSize = `${px}px`;
      if (el.scrollWidth <= el.clientWidth) return;
    }
  };
  fit();
  // Mona Sans may still be loading; its widths differ from the fallback's.
  void document.fonts.ready.then(fit);
  return () => {
    live = false;
  };
}

const PRINT_REPEATS = [0, 1, 2, 3, 4];

/** A clear film band across the mouth, with the aqua tear tape through it and its pull tab. */
function SealStrip({ date }: { date: string }) {
  return (
    <span className="gift-bag__part gift-seal">
      <span className="gift-seal__clip">
        <i className="gift-seal__film" />
        <span className="gift-seal__tape">
          <span className="gift-seal__print">
            {PRINT_REPEATS.map((i) => (
              <Fragment key={i}>
                <ArrowRight size={11} />
                <span>
                  <b>Sealed</b> {date}
                </span>
              </Fragment>
            ))}
          </span>
        </span>
      </span>
      <span className="gift-seal__tab">
        <i className="gift-seal__neck" />
        <span className="gift-seal__lobe">
          <svg className="gift-seal__ribs" viewBox="0 0 11 13" fill="currentColor">
            <rect width="2" height="13" rx="1" />
            <rect x="4" width="2" height="13" rx="1" />
            <rect x="8" width="2" height="13" rx="1" />
          </svg>
          <span>Pull</span>
        </span>
      </span>
    </span>
  );
}

const TAG_EDGE = "M44 14H172a8 8 0 0 1 8 8V92a8 8 0 0 1-8 8H44L18 76V38Z";

/** A luggage tag on a short string; the string's loose end is the shape's top-left corner. */
function TagShape() {
  return (
    <svg className="gift-tag__shape" viewBox="0 0 184 104">
      <path className="gift-tag__string" d="M9 3C6 16 14 32 30 45" />
      <path className="gift-tag__shadow" d={TAG_EDGE} transform="translate(1.2 2.6)" />
      <path className="gift-tag__card" d={TAG_EDGE} />
      <circle className="gift-tag__ring" cx="33" cy="57" r="8.4" />
      <circle className="gift-tag__hole" cx="33" cy="57" r="4.6" />
      <path className="gift-tag__string" d="M33 52.4C31 48 30 46 30 45" />
      <path className="gift-tag__rule" d="M58 84H168" />
    </svg>
  );
}
