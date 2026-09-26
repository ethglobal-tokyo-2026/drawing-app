import { ArrowUUpLeft } from "@phosphor-icons/react";
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
import { formatCount } from "../../i18n/format";
import { useTranslation } from "../../i18n/react";
import { GratitudeIcon, StreakIcon } from "../../icons";
import { EnsNameLink } from "../../identity/EnsNameLink";
import { formatDay, formatHandle } from "../../stickers/format";
import { HitCounter } from "../../ui/HitCounter";
import { LabelButton } from "../../ui/LabelButton";
import { useReducedMotion } from "../../ui/useReducedMotion";
import "./stat-board.css";

export interface StatCorkHandle {
  /** The papers swing and settle, as the board lands after its turn. */
  settle: () => void;
}

/** A figure that can't be known, as null. */
export interface CorkFigures {
  name: string;
  handle: string;
  /** <label>.croquis.eth, on label-maker tape. */
  ensName: string | null;
  /** Your own board, which the notes address as "you". */
  own: boolean;
  /** Why the figures didn't load, printed on the receipt; null while they load and once they have. */
  failure: string | null;
  /** Null when it didn't load; zeros read as "No gratitude yet". */
  gratitude: { direct: number; residual: number; total: number } | null;
  streak: { current: number; best: number } | null;
  stamps: { made: number | null; received: number | null; given: number | null };
  bestCombo: number | null;
  mostGratitudeInADay: number | null;
  /** When they joined, as epoch ms; null until it's known. */
  since: number | null;
}

interface Props {
  figures: CorkFigures;
  onFlipBack: () => void;
  flipBackRef: Ref<HTMLButtonElement>;
  /** Escape closes this first when it returns true, before flipping back. */
  onEscape?: () => boolean;
  /** Labels under Flip back, such as logging out of LINE on your own board. */
  afterFlipBack?: ReactNode;
  /** Paper pinned below the stats, such as your addresses and Settings. */
  children?: ReactNode;
  ref?: Ref<StatCorkHandle>;
}

/** A figure that can't be known, because what it's drawn from didn't load. */
function Unknown() {
  const { t } = useTranslation();
  return (
    <>
      <span aria-hidden>{t(($) => $.stickerBoard.statBoard.notKnown.mark)}</span>
      <span className="visually-hidden">{t(($) => $.stickerBoard.statBoard.notKnown.spoken)}</span>
    </>
  );
}

const figure = (n: number | null) => (n === null ? <Unknown /> : formatCount(n));

// A kind at 0 is left off the receipt, so a friend-first artist sees Direct alone.
const GRATITUDE_KINDS = ["direct", "residual"] as const;

const STAMPS = [
  { kind: "made", hue: "var(--seal)" },
  { kind: "received", hue: "var(--grape)" },
  { kind: "given", hue: "var(--aqua)" },
] as const;

// Things stuck on the cork; a tap anywhere else is on bare cork.
const ON_CORK = ".stat-board__note, .stat-board__stamp, .stat-board__tape, a, button";

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
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const cork = useRef<HTMLDivElement>(null);
  const id = useId();
  // The receipt is printed when the cork first shows.
  const [printedAt] = useState(() => Date.now());
  const since = f.since === null ? null : formatDay(f.since);
  const gratitude = f.gratitude;

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
    const control = "button, a, label, input, textarea";
    if (reduced || !(target instanceof Element) || target.closest(control)) return;
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

  return (
    <div
      className="stat-board"
      role="dialog"
      aria-label={t(($) => $.stickerBoard.statBoard.label, { name: f.name })}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="stat-board__cork" ref={cork} onClick={onCorkClick} onPointerDown={nudge}>
        <div className="stat-board__stats">
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
                  <GratitudeIcon className="stat-board__receipt-heart" size={14} />
                  {t(($) => $.stickerBoard.statBoard.gratitude.title)}
                </h3>
                {gratitude && gratitude.total > 0 ? (
                  <dl className="stat-board__receipt-rows">
                    {GRATITUDE_KINDS.filter((kind) => gratitude[kind] > 0).map((kind) => (
                      <div key={kind}>
                        <dt>{t(($) => $.stickerBoard.statBoard.gratitude[kind])}</dt>
                        <dd>{formatCount(gratitude[kind])}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="stat-board__receipt-none">
                    {!gratitude
                      ? f.failure
                      : f.own
                        ? t(($) => $.stickerBoard.statBoard.gratitude.noneYetOwn)
                        : t(($) => $.stickerBoard.statBoard.gratitude.noneYet)}
                  </p>
                )}
                <p className="stat-board__receipt-total">
                  <span className="fine">{t(($) => $.stickerBoard.statBoard.gratitude.total)}</span>
                  <b>{gratitude ? formatCount(gratitude.total) : <Unknown />}</b>
                </p>
              </div>
            </section>

            <section className="stat-board__note stat-board__scrap" aria-labelledby={`${id}-bests`}>
              <div className="stat-board__paper">
                <h3 className="stat-board__scrap-h" id={`${id}-bests`}>
                  {t(($) => $.stickerBoard.statBoard.bests.title)}
                </h3>
                <dl className="stat-board__scrap-rows">
                  <div>
                    <dt>{t(($) => $.stickerBoard.statBoard.bests.longestStreak)}</dt>
                    <dd>
                      {!f.streak ? (
                        <Unknown />
                      ) : f.streak.best > 0 ? (
                        t(($) => $.stickerBoard.statBoard.bests.days, {
                          count: f.streak.best,
                          days: formatCount(f.streak.best),
                        })
                      ) : (
                        t(($) => $.stickerBoard.statBoard.bests.noneYet)
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t(($) => $.stickerBoard.statBoard.bests.bestCombo)}</dt>
                    <dd>
                      {f.bestCombo === null ? (
                        <Unknown />
                      ) : f.bestCombo > 0 ? (
                        <HitCounter hits={f.bestCombo} size={20} />
                      ) : (
                        t(($) => $.stickerBoard.statBoard.bests.noneYet)
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t(($) => $.stickerBoard.statBoard.bests.mostGratitudeInADay)}</dt>
                    <dd>
                      {f.mostGratitudeInADay === null ? (
                        <Unknown />
                      ) : f.mostGratitudeInADay > 0 ? (
                        formatCount(f.mostGratitudeInADay)
                      ) : (
                        t(($) => $.stickerBoard.statBoard.bests.noneYet)
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <i className="stat-board__washi" aria-hidden />
            </section>

            {since && (
              <p className="stat-board__tape">
                <span className="visually-hidden">
                  {t(($) => $.stickerBoard.statBoard.sinceSpoken, { day: since })}
                </span>
                <span className="stat-board__tape-text" aria-hidden>
                  {t(($) => $.stickerBoard.statBoard.since, { day: since })}
                </span>
              </p>
            )}
            {f.ensName && (
              <EnsNameLink className="stat-board__ens" name={f.ensName}>
                <span className="stat-board__tape stat-board__tape--ens">
                  <span className="stat-board__tape-text">{f.ensName}</span>
                </span>
              </EnsNameLink>
            )}
          </div>

          <div className="stat-board__col stat-board__col--b">
            <section className="stat-board__note stat-board__leaf" aria-labelledby={`${id}-streak`}>
              <i className="stat-board__pin" aria-hidden />
              <div className="stat-board__paper">
                <h3 className="fine stat-board__leaf-band" id={`${id}-streak`}>
                  <StreakIcon size={13} />
                  {t(($) => $.stickerBoard.statBoard.streak.title)}
                </h3>
                {!f.streak ? (
                  <p className="stat-board__leaf-n">
                    <b>
                      <Unknown />
                    </b>
                  </p>
                ) : f.streak.current > 0 ? (
                  <p className="stat-board__leaf-n">
                    <b>{formatCount(f.streak.current)}</b>
                    <span className="fine">
                      {t(($) => $.stickerBoard.statBoard.streak.days, { count: f.streak.current })}
                    </span>
                  </p>
                ) : (
                  <p className="stat-board__leaf-n stat-board__leaf-n--none">
                    <b>{t(($) => $.stickerBoard.statBoard.streak.notStarted)}</b>
                  </p>
                )}
              </div>
            </section>

            <div
              className="stat-board__stamps"
              role="group"
              aria-label={t(($) => $.stickerBoard.statBoard.stamps.label)}
            >
              {STAMPS.map(({ kind, hue }, i) => (
                <p key={kind} className={`stat-board__stamp stat-board__stamp--${i}`}>
                  <span className="stat-board__stamp-paper">
                    <span className="stat-board__stamp-print" style={{ "--c": hue }}>
                      <b>{figure(f.stamps[kind])}</b>
                      <span className="fine">
                        {t(($) => $.stickerBoard.statBoard.stamps[kind])}
                      </span>
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
              {t(($) => $.stickerBoard.statBoard.flipBack)}
            </LabelButton>
            {afterFlipBack}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
