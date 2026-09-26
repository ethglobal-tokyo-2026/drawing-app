import liff from "@line/liff";
import { ArrowSquareOut, Copy, X } from "@phosphor-icons/react";
import {
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { etherscanAddressUrl, suiscanAccountUrl } from "../../identity/explorers";
import { LabelButton } from "../../ui/LabelButton";
import { QrCode } from "../../ui/QrCode";
import { useBackToClose } from "../../ui/useBackToClose";
import { useFocusTrap } from "../../ui/useFocusTrap";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { useToast } from "../../ui/useToast";
import { splitEasing } from "../detailLift";
import { addressGroups, type Chain } from "./addresses";
import "./address-dialog.css";

interface Props {
  chain: Chain;
  address: string;
  /** The paper on the cork that the dialog lifts off and puts back. */
  from: RefObject<HTMLElement | null>;
  /** Called once the paper is back on the cork. */
  onClose: () => void;
}

/** Each chain's words, its explorer, and how many fours of its address fit a line. */
const CHAINS = {
  ethereum: {
    name: "board address",
    title: "Your board address",
    copied: "Board address copied",
    note: "Your stickers are kept at this address on Ethereum Sepolia.",
    explorer: { href: etherscanAddressUrl, name: "Etherscan" },
    foursPerLine: 5,
  },
  sui: {
    name: "Sui address",
    title: "Your Sui address",
    copied: "Sui address copied",
    note: "Your address on Sui Testnet.",
    explorer: { href: suiscanAccountUrl, name: "Suiscan" },
    foursPerLine: 4,
  },
} as const;

// Motion tokens spelled out: Web Animations can't read CSS variables.
/** The flight off the cork, on --ease-out. */
const OPEN_MS = 480;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** The flight back: it eases off its spot, then settles onto the cork. */
const CLOSE_MS = 360;
const EASE_BACK = [0.4, 0, 0.2, 1] as const;
const SCRIM_MS = 280;
/** The text and actions rise in from this share of the flight, one after another. */
const RISE = { at: 0.55, ms: 220, stagger: 50, px: 8 };
/** They fade as the paper starts back. */
const FADE_OUT_MS = 120;
/** The X pops on with the first of them: --t-pop on --ease-peel, the curve for peel, stick and pop. */
const POP_MS = 200;
const EASE_PEEL = "cubic-bezier(0.2, 0.7, 0.2, 1)";
/** Reduced motion, or no paper to lift: the dialog fades. */
const FADE_MS = 150;
/**
 * The peel: at `open` of the way through the opening the paper rides higher and a touch larger than
 * its straight path, as if held up to you, then settles. The flight back rises the same way at `close`.
 */
const LIFT = { open: 0.3, close: 0.2, rise: -6, grow: 0.04 };

const bezier = (points: readonly number[]) => `cubic-bezier(${points.join(", ")})`;
const OPEN_EASING = splitEasing(EASE_OUT, LIFT.open);
const CLOSE_EASING = splitEasing(EASE_BACK, LIFT.close);

/** The cork paper relative to the card at rest: its top center's offset, its turn and its size. */
interface Pose {
  dx: number;
  dy: number;
  /** In degrees. */
  turn: number;
  scale: number;
}

/**
 * The card `share` of the way from the cork paper to its own place, with `lift` of the peel's rise.
 * Every frame lists the same functions, so each one tweens on its own.
 */
function transformAt({ dx, dy, turn, scale }: Pose, share: number, lift: number) {
  const left = 1 - share;
  const f = (n: number) => n.toFixed(2);
  const size = (1 + (scale - 1) * left) * (1 + LIFT.grow * lift);
  return `translate(${f(dx * left)}px, ${f(dy * left + LIFT.rise * lift)}px) rotate(${f(turn * left)}deg) scale(${size.toFixed(4)})`;
}

/**
 * Where the paper sits on the cork, for the card resting unmoved. Both hang from their top centers,
 * so the card's QR code lands on the paper's. Null when either has no size to measure.
 */
function poseOf(paper: HTMLElement, card: HTMLElement): Pose | null {
  if (!paper.offsetWidth || !card.offsetWidth) return null;
  const box = paper.getBoundingClientRect();
  const rest = card.getBoundingClientRect();
  const transform = getComputedStyle(paper).transform;
  const matrix = transform && transform !== "none" ? new DOMMatrix(transform) : null;
  const turn = matrix ? Math.atan2(matrix.b, matrix.a) : 0;
  const size = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
  // Its box is centered on the paper whatever it turns about; the top center is half its height up.
  const half = (paper.offsetHeight * size) / 2;
  const top = {
    x: box.left + box.width / 2 + Math.sin(turn) * half,
    y: box.top + box.height / 2 - Math.cos(turn) * half,
  };
  return {
    dx: top.x - (rest.left + rest.width / 2),
    dy: top.y - rest.top,
    turn: (turn * 180) / Math.PI,
    scale: (paper.offsetWidth * size) / card.offsetWidth,
  };
}

interface Parts {
  dialog: HTMLElement;
  scrim: HTMLElement;
  card: HTMLElement;
  shadow: HTMLElement;
  x: HTMLElement;
  /** The text on the card, then the actions, in the order they rise in. */
  rising: HTMLElement[];
}

function partsOf(dialog: HTMLElement): Parts | null {
  const find = (name: string) => dialog.querySelector<HTMLElement>(`.address-dialog__${name}`);
  const scrim = find("scrim");
  const card = find("card");
  const shadow = find("shadow");
  const x = find("x");
  if (!scrim || !card || !shadow || !x) return null;
  const rising = [...dialog.querySelectorAll<HTMLElement>(".address-dialog__rise")];
  return { dialog, scrim, card, shadow, x, rising };
}

/**
 * The paper lifts off the cork and becomes the card: it peels up, turning level and growing as the
 * scrim comes up and its shadow deepens, then its text and the actions rise in.
 */
function liftOff(parts: Parts, paper: HTMLElement | null, reduced: boolean): Animation[] {
  const fill: FillMode = "both";
  const pose = !reduced && paper ? poseOf(paper, parts.card) : null;
  if (!pose)
    return [parts.dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, fill })];

  const riseAt = OPEN_MS * RISE.at;
  return [
    parts.scrim.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: SCRIM_MS,
      easing: bezier(EASE_OUT),
      fill,
    }),
    parts.card.animate(
      [
        { transform: transformAt(pose, 0, 0), easing: OPEN_EASING.before },
        {
          transform: transformAt(pose, OPEN_EASING.progress, 1),
          offset: LIFT.open,
          easing: OPEN_EASING.after,
        },
        { transform: transformAt(pose, 1, 0) },
      ],
      { duration: OPEN_MS, fill },
    ),
    parts.shadow.animate(
      [
        { opacity: 0, easing: OPEN_EASING.before },
        { opacity: 1, offset: LIFT.open },
        { opacity: 1 },
      ],
      { duration: OPEN_MS, fill },
    ),
    ...parts.rising.map((part, i) =>
      part.animate(
        [
          { opacity: 0, transform: `translateY(${RISE.px}px)` },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: RISE.ms,
          delay: riseAt + i * RISE.stagger,
          easing: bezier(EASE_OUT),
          fill,
        },
      ),
    ),
    parts.x.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: riseAt, fill }),
    parts.x.animate([{ transform: "scale(0.6)" }, { transform: "none" }], {
      duration: POP_MS,
      delay: riseAt,
      easing: EASE_PEEL,
      fill,
    }),
  ];
}

/**
 * The card goes back to the paper's place on the cork, measured now since the cork may have
 * scrolled: its text and actions fade, it rises off its spot and flies down, and the scrim clears.
 */
function putBack(parts: Parts, paper: HTMLElement | null, reduced: boolean): Animation[] {
  const fill: FillMode = "both";
  const pose = !reduced && paper ? poseOf(paper, parts.card) : null;
  if (!pose)
    return [parts.dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, fill })];

  return [
    ...[parts.x, ...parts.rising].map((part) =>
      part.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_OUT_MS, fill }),
    ),
    parts.card.animate(
      [
        { transform: transformAt(pose, 1, 0), easing: CLOSE_EASING.before },
        {
          transform: transformAt(pose, 1 - CLOSE_EASING.progress, 1),
          offset: LIFT.close,
          easing: CLOSE_EASING.after,
        },
        { transform: transformAt(pose, 0, 0) },
      ],
      { duration: CLOSE_MS, fill },
    ),
    parts.shadow.animate(
      [
        { opacity: 1 },
        { opacity: 1, offset: LIFT.close, easing: CLOSE_EASING.after },
        { opacity: 0 },
      ],
      { duration: CLOSE_MS, fill },
    ),
    parts.scrim.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: CLOSE_MS,
      easing: bezier(EASE_BACK),
      fill,
    }),
  ];
}

// Unmounting cancels the flights, which rejects `finished`; anything else is a real failure.
function reportUnlessCancelled(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return;
  console.error("The board address paper's flight failed", error);
}

/**
 * An address held up off the cork: its paper lifts off the pin and grows into this card, with the QR
 * code big, the address in full, Copy and its explorer. Closing flies it back under its pin.
 */
export function AddressDialog({ chain, address, from, onClose }: Props) {
  const words = CHAINS[chain];
  const reduced = useReducedMotion();
  const toast = useToast();
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  /** The opening while it plays: a close then turns it around. */
  const opening = useRef<Animation[]>([]);
  /** The way back, once it starts. */
  const closing = useRef<Animation[] | null>(null);

  const lift = useEffectEvent((parts: Parts) => liftOff(parts, from.current, reduced));

  // Before the first paint, so the first frame shows the card where the paper was on the cork.
  useLayoutEffect(() => {
    const parts = root.current && partsOf(root.current);
    if (!parts) return;
    const played = lift(parts);
    opening.current = played;
    Promise.all(played.map((a) => a.finished)).then(() => {
      if (opening.current !== played) return;
      // Landed: the card's own styles hold it from here.
      for (const a of played) a.cancel();
      opening.current = [];
    }, reportUnlessCancelled);
    return () => {
      for (const a of [...opening.current, ...(closing.current ?? [])]) a.cancel();
      opening.current = [];
    };
  }, []);

  const close = () => {
    const parts = root.current && partsOf(root.current);
    if (closing.current || !parts) return;
    const turning = opening.current;
    opening.current = [];
    let back: Animation[];
    if (turning.some((a) => a.playState !== "finished")) {
      // Mid-flight it turns around from wherever it is, a little quicker than it came.
      for (const a of turning) {
        a.updatePlaybackRate(OPEN_MS / CLOSE_MS);
        a.reverse();
      }
      back = turning;
    } else {
      for (const a of turning) a.cancel();
      back = putBack(parts, from.current, reduced);
    }
    closing.current = back;
    Promise.all(back.map((a) => a.finished)).then(() => onClose(), reportUnlessCancelled);
  };

  useFocusTrap(root, { onEscape: close, returnFocus: () => from.current });
  useBackToClose(true, close);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast(words.copied);
    } catch (error) {
      // The address stays selectable, so it can still be copied by hand.
      console.error(`Couldn't copy the ${words.name}`, error);
      toast(`Couldn’t copy the ${words.name}`);
    }
  };

  // Inside LINE's app, the explorer opens in LINE's own browser rather than leaving LINE.
  const openInLine = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!liff.isInClient()) return;
    e.preventDefault();
    liff.openWindow({ url: e.currentTarget.href, external: false });
  };

  // Resolved once, so the dialog never moves between the page and the phone, which would remount it.
  const [phone] = useState(() => document.querySelector<HTMLElement>(".phone"));
  const fours = addressGroups(address);
  const dialog = (
    <div
      ref={root}
      className="address-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div className="address-dialog__scrim" aria-hidden="true" onClick={close} />
      <div className="address-dialog__stage">
        <div className="address-dialog__held">
          <div className="address-dialog__card">
            <i className="address-dialog__shadow" aria-hidden />
            <button type="button" className="address-dialog__x" aria-label="Close" onClick={close}>
              <X />
            </button>
            <i className="address-dialog__hole" aria-hidden />
            <QrCode
              value={address}
              size={232}
              label={`QR code of your ${words.name}`}
              className="address-dialog__qr"
            />
            <h2 className="address-dialog__title address-dialog__rise" id={titleId}>
              {words.title}
            </h2>
            <p className="address-dialog__address address-dialog__rise">
              <span className="address-dialog__prefix">0x</span>
              {fours.map((four, i) => (
                <span
                  key={i}
                  className={[
                    "address-dialog__four",
                    (i === 0 || i === fours.length - 1) && "is-compared",
                    i > 0 && i % words.foursPerLine === 0 && "is-line-start",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {four}
                </span>
              ))}
            </p>
            <p className="address-dialog__note address-dialog__rise">{words.note}</p>
          </div>
          <div className="address-dialog__acts">
            <LabelButton
              tone="ink"
              block
              icon={<Copy />}
              className="address-dialog__rise"
              onClick={copy}
            >
              Copy address
            </LabelButton>
            <a
              className="label-btn label-btn--block address-dialog__rise address-dialog__etherscan"
              href={words.explorer.href(address)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View your ${words.name} on ${words.explorer.name}`}
              onClick={openInLine}
            >
              <ArrowSquareOut />
              View on {words.explorer.name}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
  return phone ? createPortal(dialog, phone) : dialog;
}
