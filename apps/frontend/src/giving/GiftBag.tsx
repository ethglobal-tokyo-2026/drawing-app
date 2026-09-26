import { ArrowRight, HandPointing } from "@phosphor-icons/react";
import { Fragment, useLayoutEffect, useRef, type DOMAttributes } from "react";
import { i18next } from "../i18n/i18n";
import { useTranslation } from "../i18n/react";
import { giftTag, sealDate, type GiftTag } from "./giftTag";
import "./GiftBag.css";

/** A rubber stamp inked on the tag. */
export type GiftStamp = "one-to-one" | "opened" | "taken-back" | "returned";

/** The pull tab as the receiver works it. */
export interface PullTab {
  handlers: Pick<
    DOMAttributes<HTMLButtonElement>,
    "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onKeyDown"
  >;
  /** Pulling the tab, or pressing and holding the bag. */
  grip: "pull" | "hold" | null;
  /** A finger takes the tab and pulls a little, on a loop, until the first grab. */
  hinting: boolean;
  /** Counts the ticks the tear front passed while pulling; each one shivers the strip. */
  shivers: number;
}

interface Props {
  /** The sticker in the bag: packed, it peeks out of the mouth; sealed, the frost blurs it. */
  stickerUrl?: string;
  /** The giver's handle, printed on the tag when the recipient isn't known. Neither: no tag. */
  fromHandle?: string;
  /** The recipient chosen in the app, printed on the tag in place of the giver. */
  toHandle?: string;
  /**
   * Open: the sticker peeks out of the mouth. Sealed: sent, pressed shut, with the seal on. Torn:
   * pulled open, the tab and the film leaving, the mouth open. Opened: open and empty.
   */
  state: "open" | "sealed" | "torn" | "opened";
  /** Drop: the sticker falls into the open bag. Take out: it lifts back out. */
  motion?: "drop" | "takeOut";
  /** When it was sealed, printed on the tear tape. */
  sealedAt?: number;
  /** Receive: the larger bag a gift is opened from, across its stage. */
  size?: "give" | "receive";
  /** How far the tear tape has torn out, from 0 (sealed) to 1. */
  tear?: number;
  stamp?: GiftStamp;
  /** Makes the tab a slider the receiver pulls, outside the bag's picture. */
  pullTab?: PullTab;
}

const STAMPS: Record<GiftStamp, { small?: string; big: string; tone: "ink" | "grape" | "plain" }> =
  {
    "one-to-one": { small: "Opens only in", big: "1:1 chat", tone: "ink" },
    opened: { big: "Opened", tone: "grape" },
    "taken-back": { big: "Taken back", tone: "plain" },
    returned: { big: "Returned", tone: "plain" },
  };

const PICTURED: Record<Props["state"], string> = {
  open: "The sticker in an open gift bag",
  sealed: "The gift bag, sealed",
  torn: "The gift bag, torn open",
  opened: "The gift bag, open and empty",
};

function describeBag(state: Props["state"], tag: GiftTag | null, stamp?: GiftStamp) {
  const stamped = stamp && [STAMPS[stamp].small, STAMPS[stamp].big].filter(Boolean).join(" ");
  return [
    PICTURED[state],
    tag && `tagged ${i18next.t(($) => $.giving.tag[tag.label])} ${tag.name}`,
    stamped && `stamped ${stamped}`,
  ]
    .filter(Boolean)
    .join(", ");
}

/** The frosted gift bag. It has no zipper: it seals with a tear tape, only once the send succeeds. */
export function GiftBag({
  stickerUrl,
  fromHandle,
  toHandle,
  state,
  motion,
  sealedAt,
  size = "give",
  tear,
  stamp,
  pullTab,
}: Props) {
  const { t } = useTranslation();
  const tag = fromHandle || toHandle ? giftTag(fromHandle ?? "", toHandle) : null;
  const name = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = name.current;
    if (el) return fitName(el);
  }, [tag?.name]);
  const classes = [
    "gift-bag",
    size === "receive" && "gift-bag--receive",
    motion === "drop" && "is-dropping",
    motion === "takeOut" && "is-taking-out",
    pullTab?.hinting && "is-hinting",
  ];
  // Alternating names restart the shiver's animation on each tick.
  const shiver = pullTab?.shivers ? (pullTab.shivers % 2 ? "a" : "b") : undefined;
  // With the slider, the picture is hidden part by part, so the slider isn't inside an image.
  const picture = pullTab
    ? {}
    : ({ role: "img", "aria-label": describeBag(state, tag, stamp) } as const);
  return (
    <div
      className={classes.filter(Boolean).join(" ")}
      data-state={state}
      data-grip={pullTab?.grip ?? undefined}
      data-shiver={shiver}
      style={tear === undefined ? undefined : { "--gift-tear": tear }}
      {...picture}
    >
      <i className="gift-bag__part gift-bag__back" />
      {stickerUrl && (
        <img className="gift-bag__sticker" src={stickerUrl} alt="" draggable={false} />
      )}
      <i className="gift-bag__part gift-bag__front" />
      <i className="gift-bag__part gift-bag__streak" />
      <i className="gift-bag__part gift-bag__mouth" />
      {state !== "opened" && (
        <SealStrip
          date={sealedAt === undefined ? "" : sealDate(sealedAt)}
          insideUrl={stickerUrl}
          tear={tear ?? 0}
          pullTab={state === "torn" ? undefined : pullTab}
          hidden={Boolean(pullTab)}
        />
      )}
      {tag && (
        <span className="gift-bag__part gift-bag__tag" aria-hidden={pullTab ? true : undefined}>
          <span className="gift-tag">
            <TagShape />
            <span className="gift-tag__label">{t(($) => $.giving.tag[tag.label])}</span>
            <span className="gift-tag__name" ref={name}>
              {tag.name}
            </span>
            {stamp && <Stamp stamp={stamp} />}
          </span>
        </span>
      )}
      {pullTab?.hinting && (
        <HandPointing className="gift-bag__finger" weight="fill" size={44} aria-hidden="true" />
      )}
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

/** The torn-out tape, hanging from the tab in a loop. */
const LOOP = "M68 3C52 5 34 14 22 26C12 36 12 45 22 45C31 45 36 36 33 29";

interface SealStripProps {
  date: string;
  /** The sticker inside, which tints the bag's inside where the film splits. */
  insideUrl?: string;
  tear: number;
  pullTab?: PullTab;
  /** Out of the accessibility tree, beside a slider tab. */
  hidden: boolean;
}

/**
 * A clear film band across the mouth, with the aqua tear tape through it and its pull tab. As the
 * tape tears out, the film splits behind it onto the bag's inside.
 */
function SealStrip({ date, insideUrl, tear, pullTab, hidden }: SealStripProps) {
  return (
    <span className="gift-bag__part gift-seal">
      <span className="gift-seal__clip" aria-hidden={hidden || undefined}>
        <i className="gift-seal__film" />
        <i className="gift-seal__gap">
          <i
            className="gift-seal__sleeve"
            style={insideUrl ? { "--inside": `url("${insideUrl}")` } : undefined}
          />
        </i>
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
        {pullTab && (
          <button
            type="button"
            className="gift-seal__grip"
            role="slider"
            aria-label="Pull the tab to open the gift"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(tear * 100)}
            {...pullTab.handlers}
          />
        )}
        <svg className="gift-seal__loop" viewBox="0 0 72 48" aria-hidden="true">
          <path className="gift-seal__loop-edge" d={LOOP} pathLength={100} />
          <path className="gift-seal__loop-body" d={LOOP} pathLength={100} />
        </svg>
        <i className="gift-seal__neck" />
        <span className="gift-seal__lobe" aria-hidden={hidden || undefined}>
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

/** A rubber stamp inked onto the tag, worn at the edges. */
function Stamp({ stamp }: { stamp: GiftStamp }) {
  const { small, big, tone } = STAMPS[stamp];
  return (
    <span className={`gift-stamp gift-stamp--${tone}`}>
      {small && <span>{small}</span>}
      <b>{big}</b>
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
