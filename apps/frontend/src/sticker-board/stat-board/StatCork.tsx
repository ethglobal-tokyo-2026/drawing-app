import { ArrowUUpLeft, Copy } from "@phosphor-icons/react";
import {
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { formatDay, formatHandle } from "../../stickers/format";
import { LabelButton } from "../../ui/LabelButton";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { useToast } from "../../ui/useToast";
import "./stat-board.css";

export interface StatCorkHandle {
  /** The papers swing and settle, as the board lands after its turn. */
  settle: () => void;
}

/** A figure that can't be known, as null. */
export interface CorkFigures {
  name: string;
  handle: string;
  /** Their picture, stuck on beside the name card. */
  picture: ReactNode;
  /** Your own board: pink washi on the name card, and "you" in the notes. */
  own: boolean;
  /** Undefined until gratitude exists for them; zeros read as "No gratitude yet". */
  gratitude?: { daily: number; inspired: number; magic: number };
  streak: { current: number; best: number } | null;
  streakRule: string;
  stamps: { made: number | null; received: number | null; given: number | null };
  bestCombo: number | null;
  mostGratitudeInADay: number | null;
  /** When they joined, as epoch ms. */
  since: number;
  /** Their board address, on label-maker tape that copies it. */
  address?: string;
}

interface Props {
  figures: CorkFigures;
  onFlipBack: () => void;
  flipBackRef: Ref<HTMLButtonElement>;
  /** Escape closes this first when it returns true, before flipping back. */
  onEscape?: () => boolean;
  /** Labels under Flip back, such as logging out of LINE on your own board. */
  afterFlipBack?: ReactNode;
  /** Paper pinned below the stats, such as your LINE and Privy details. */
  children?: ReactNode;
  ref?: Ref<StatCorkHandle>;
}

const num = (n: number) => n.toLocaleString("en-US");
const days = (n: number) => `${num(n)} ${n === 1 ? "day" : "days"}`;

/** A figure that can't be known, because what it's drawn from didn't load. */
function Unknown() {
  return (
    <>
      <span aria-hidden>–</span>
      <span className="visually-hidden">not known</span>
    </>
  );
}

const figure = (n: number | null) => (n === null ? <Unknown /> : num(n));

const GRATITUDE_KINDS = [
  { key: "daily", label: "Daily", reason: "For drawing each day. A streak adds more." },
  { key: "inspired", label: "Inspired", reason: "Gratitude for stickers they gave." },
  { key: "magic", label: "Magic", reason: "Gratitude sent a special way." },
] as const;

// Things stuck on the cork; a tap anywhere else is on bare cork.
const ON_CORK =
  ".stat-board__note, .stat-board__stamp, .stat-board__tape, .stat-board__who, button";

/** A paper hanging from its pin or tape swings and settles; `k` scales the swing and turns it. */
function swing(paper: Element, k: number, delay = 0) {
  paper.animate(
    [
      { rotate: "0deg" },
      { rotate: `${(2.8 * k).toFixed(2)}deg`, offset: 0.2 },
      { rotate: `${(-1.5 * k).toFixed(2)}deg`, offset: 0.48 },
      { rotate: `${(0.6 * k).toFixed(2)}deg`, offset: 0.74 },
      { rotate: "0deg" },
    ],
    { duration: 950, delay, easing: "cubic-bezier(.3,.6,.4,1)" },
  );
}

/** A Sticker Board's back: cork with someone's User Stats pinned on as paper. */
export function StatCork({
  figures: f,
  onFlipBack,
  flipBackRef,
  onEscape,
  afterFlipBack,
  children,
  ref,
}: Props) {
  const reduced = useReducedMotion();
  const toast = useToast();
  const cork = useRef<HTMLDivElement>(null);
  const id = useId();
  // The receipt is printed when the cork first shows.
  const [printedAt] = useState(() => Date.now());
  const since = formatDay(f.since);
  const gratitudeTotal = f.gratitude
    ? f.gratitude.daily + f.gratitude.inspired + f.gratitude.magic
    : 0;

  useImperativeHandle(
    ref,
    () => ({
      settle: () => {
        if (reduced || !cork.current) return;
        cork.current
          .querySelectorAll(".stat-board__note > .stat-board__paper")
          .forEach((paper, i) => swing(paper, i % 2 ? -0.85 : 1, 20 + i * 70));
      },
    }),
    [reduced],
  );

  const onCorkClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof Element && !e.target.closest(ON_CORK)) onFlipBack();
  };

  // A tap on a note's paper nudges it. Its controls press, and its selectable text selects, without
  // moving it.
  const nudge = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target;
    if (reduced || !(target instanceof Element) || target.closest("button, a")) return;
    const style = getComputedStyle(target);
    if ((style.userSelect || style.getPropertyValue("-webkit-user-select")) === "text") return;
    const note = target.closest(".stat-board__note");
    const paper = note?.querySelector(":scope > .stat-board__paper");
    if (note && paper) swing(paper, note.classList.contains("stat-board__scrap") ? 0.45 : 0.6);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    if (!onEscape?.()) onFlipBack();
  };

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast("Address copied");
    } catch (error) {
      console.error("Copying the board address failed", error);
      toast("Couldn’t copy the address");
    }
  };

  return (
    <div
      className="stat-board"
      role="dialog"
      aria-label={`${f.name}’s stats`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="stat-board__cork" ref={cork} onClick={onCorkClick} onPointerDown={nudge}>
        <div className="stat-board__stats">
          <div className="stat-board__who">
            {f.picture}
            <div className="stat-board__namecard">
              <i
                className={`stat-board__washi ${f.own ? "stat-board__washi--pink" : ""}`}
                aria-hidden
              />
              <h2 className="stat-board__name">{f.name}</h2>
              <p className="fine stat-board__handle">
                {formatHandle(f.handle)} ·{" "}
                {f.own ? "name and picture from LINE" : "from their LINE profile"}
              </p>
            </div>
          </div>

          <div className="stat-board__col stat-board__col--a">
            <section
              className="stat-board__note stat-board__receipt"
              aria-labelledby={`${id}-gratitude`}
            >
              <i className="stat-board__pin stat-board__pin--pink" aria-hidden />
              <div className="stat-board__paper">
                <p className="fine stat-board__receipt-top" aria-hidden>
                  <span>{formatHandle(f.handle)}</span>
                  <span>{formatDay(printedAt)}</span>
                </p>
                <h3 className="fine stat-board__receipt-h" id={`${id}-gratitude`}>
                  Gratitude received
                </h3>
                {f.gratitude && gratitudeTotal > 0 ? (
                  <ul className="stat-board__receipt-rows">
                    {GRATITUDE_KINDS.map((k) => (
                      <li key={k.key}>
                        <i className={`stat-board__receipt-dot is-${k.key}`} aria-hidden />
                        <b>{k.label}</b>
                        <span className="stat-board__receipt-amount">
                          {num(f.gratitude?.[k.key] ?? 0)}
                        </span>
                        <small>{k.reason}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="stat-board__receipt-none">
                    {f.own
                      ? "No gratitude yet. It arrives when someone you give a sticker to sends you some for it."
                      : "No gratitude yet. It arrives when someone sends gratitude for a sticker they gave them."}
                  </p>
                )}
                <p className="stat-board__receipt-total">
                  <span className="fine">Total</span>
                  <b>{num(gratitudeTotal)}</b>
                </p>
              </div>
            </section>

            <section className="stat-board__note stat-board__scrap" aria-labelledby={`${id}-bests`}>
              <div className="stat-board__paper">
                <h3 className="stat-board__scrap-h" id={`${id}-bests`}>
                  Bests
                </h3>
                <dl className="stat-board__scrap-rows">
                  <div>
                    <dt>Longest streak</dt>
                    <dd>
                      {!f.streak ? (
                        <Unknown />
                      ) : f.streak.best > 0 ? (
                        days(f.streak.best)
                      ) : (
                        "None yet"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Best combo<small>Most hits in one gratitude combo</small>
                    </dt>
                    <dd>{f.bestCombo === null ? "None yet" : `×${num(f.bestCombo)}`}</dd>
                  </div>
                  <div>
                    <dt>Most gratitude in a day</dt>
                    <dd>
                      {f.mostGratitudeInADay === null ? "None yet" : num(f.mostGratitudeInADay)}
                    </dd>
                  </div>
                </dl>
              </div>
              <i className="stat-board__washi" aria-hidden />
            </section>

            {f.address && (
              <button
                type="button"
                className="stat-board__tape stat-board__tape--address"
                onClick={() => f.address && void copyAddress(f.address)}
                aria-label={`Copy ${f.address}`}
              >
                <span className="stat-board__tape-text">
                  {f.address}
                  <Copy size={13} />
                </span>
              </button>
            )}
            <p className="stat-board__tape">
              <span className="visually-hidden">On the app since {since}</span>
              <span className="stat-board__tape-text" aria-hidden>
                Since {since}
              </span>
            </p>
          </div>

          <div className="stat-board__col stat-board__col--b">
            <section className="stat-board__note stat-board__leaf" aria-labelledby={`${id}-streak`}>
              <i className="stat-board__pin" aria-hidden />
              <div className="stat-board__paper">
                <h3 className="fine stat-board__leaf-band" id={`${id}-streak`}>
                  Streak
                </h3>
                {!f.streak ? (
                  <p className="stat-board__leaf-n">
                    <b>
                      <Unknown />
                    </b>
                  </p>
                ) : f.streak.current > 0 ? (
                  <p className="stat-board__leaf-n">
                    <b>{num(f.streak.current)}</b>
                    <span className="fine">{f.streak.current === 1 ? "day" : "days"}</span>
                  </p>
                ) : (
                  <p className="stat-board__leaf-n stat-board__leaf-n--none">
                    <b>Not started</b>
                  </p>
                )}
                <p className="stat-board__leaf-rule">{f.streakRule}</p>
              </div>
            </section>

            <div className="stat-board__stamps" role="group" aria-label="Stickers">
              {(
                [
                  { label: "made", count: f.stamps.made, hue: "var(--seal)" },
                  { label: "received", count: f.stamps.received, hue: "var(--grape)" },
                  { label: "given", count: f.stamps.given, hue: "var(--aqua)" },
                ] as const
              ).map(({ label, count, hue }, i) => (
                <p key={label} className={`stat-board__stamp stat-board__stamp--${i}`}>
                  <span className="stat-board__stamp-paper">
                    <span className="stat-board__stamp-print" style={{ "--c": hue }}>
                      <b>{figure(count)}</b>
                      <span className="fine">{label}</span>
                    </span>
                  </span>
                </p>
              ))}
            </div>

            <LabelButton
              ref={flipBackRef}
              size="sm"
              icon={<ArrowUUpLeft />}
              className="stat-board__flip-back"
              onClick={onFlipBack}
            >
              Flip back
            </LabelButton>
            {afterFlipBack}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
