import { CaretDown, CaretRight, GratitudeIcon, Play, Stop } from "../icons";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PersonView } from "../api/views";
import { ReplayStage } from "../gratitude/replay/ReplayStage";
import { useGratitudeReplay } from "../gratitude/replay/useGratitudeReplay";
import { errorDetail, errorMessage } from "../i18n/errorMessage";
import { formatCount } from "../i18n/format";
import { Trans, useTranslation } from "../i18n/react";
import { formatMonthDay } from "../stickers/format";
import { EASE_OUT } from "../ui/easing";
import { ErrorLine } from "../ui/ErrorLine";
import { REVEAL } from "../ui/reveal";
import { Skeleton } from "../ui/Skeleton";
import { useReducedMotion } from "../ui/useReducedMotion";
import { handleOf, type BoardStickerView } from "./boardSticker";
import { artistShareLine, defaultOpenRow, TRAIL_SHOWN, type TrailRow } from "./trailRows";
import "./transfer-trail.css";

/** The landed amount's one pulse: how long it takes, and how far it swells. */
const PULSE_MS = 360;
const PULSE_SCALE = 1.12;

interface Props {
  rows: readonly TrailRow[];
  /** Who's looking, who reads as "you". */
  viewerId: string;
  /** The Original Artist, for the artist's share. */
  artist: PersonView;
  /** Landing where its skeleton held its place: it rises into it. */
  rises?: boolean;
}

/**
 * Where a sticker has been: one row per hand-off, newest first. One row is open at a time, the
 * most recent gratitude by default, with its amount and Replay, which plays the combo inside the
 * card; any row with gratitude opens with a tap. Past the newest gift, the rest fold into "N
 * earlier gifts".
 */
export function TransferTrail({ rows, viewerId, artist, rises = false }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [openId, setOpenId] = useState(() => defaultOpenRow(rows, viewerId));
  const openAt = rows.findIndex((r) => r.giftId === openId);
  const [unfolded, setUnfolded] = useState(openAt >= TRAIL_SHOWN);
  const shown = unfolded ? rows : rows.slice(0, TRAIL_SHOWN);
  const earlier = rows.length - shown.length;
  const isYou = (p: PersonView) => p.id === viewerId;

  // The fold's button goes as it opens, so focus moves to the first row it revealed.
  const list = useRef<HTMLOListElement>(null);
  const focusRevealed = useRef(false);
  useLayoutEffect(() => {
    if (!unfolded || !focusRevealed.current) return;
    focusRevealed.current = false;
    const first = rows[TRAIL_SHOWN];
    const row = [...(list.current?.children ?? [])].find(
      (li) => li instanceof HTMLElement && li.dataset.giftId === first?.giftId,
    );
    row?.querySelector<HTMLElement>(".transfer-trail__head")?.focus();
  }, [unfolded, rows]);

  // The open card's gratitude replays inside it, landing in its heart dot.
  const open = rows.find((r) => r.giftId === openId);
  const dot = useRef<HTMLSpanElement>(null);
  const total = useRef<HTMLSpanElement>(null);
  const pill = useRef<HTMLButtonElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const replay = useGratitudeReplay({
    giftId: open?.gratitude ? open.giftId : null,
    host,
    landOn: dot,
    marksSeen: open?.giver.id === viewerId && open.gratitude?.seenByGiverAt === null,
    reduced,
  });
  const idle = replay.phase === "idle";
  // As the heart shrinks into its dot, the amount takes it with one pulse.
  useEffect(() => {
    if (replay.phase !== "landed" || reduced) return;
    total.current?.animate(
      [{ transform: "none" }, { transform: `scale(${PULSE_SCALE})` }, { transform: "none" }],
      { duration: PULSE_MS, easing: EASE_OUT },
    );
  }, [replay.phase, reduced]);
  const replayLine = (fromYou: boolean, from: string, amount: string) => {
    if (replay.phase === "idle") return "";
    if (replay.phase === "landed") return t(($) => $.stickerBoard.transferTrail.replaying.ended);
    return fromYou
      ? t(($) => $.stickerBoard.transferTrail.replaying.yours, { amount })
      : t(($) => $.stickerBoard.transferTrail.replaying.theirs, { name: from, amount });
  };

  // "@mika gave it to you · 9.23". The artist is named once, in the detail's by-line, so the rows
  // carry no artist tag. Names are components' text, which Trans never reads as markup.
  const sentence = (r: TrailRow) => {
    const who = isYou(r.giver) ? "byYou" : isYou(r.receiver) ? "toYou" : "between";
    return (
      <span className="transfer-trail__say">
        <Trans
          i18nKey={($) => $.stickerBoard.transferTrail.handOff[who]}
          values={{ day: formatMonthDay(r.receivedAt) }}
          components={{
            b: <b />,
            giver: <b>{handleOf(r.giver)}</b>,
            receiver: <b>{handleOf(r.receiver)}</b>,
            at: <span className="transfer-trail__at" />,
          }}
        />
      </span>
    );
  };

  return (
    <section
      className={`transfer-trail ${rises ? REVEAL : ""}`}
      aria-label={t(($) => $.stickerBoard.transferTrail.label)}
    >
      <ol ref={list} className="transfer-trail__list">
        {shown.map((r) => {
          const g = r.gratitude;
          if (!g)
            return (
              <li key={r.giftId} data-gift-id={r.giftId} className="transfer-trail__row">
                {/* Not a control, but focusable by script: it takes focus when the fold opens onto it. */}
                <p className="transfer-trail__head" tabIndex={-1}>
                  {sentence(r)}
                </p>
              </li>
            );
          const isOpen = r.giftId === openId;
          // The same button open or closed, so pressing it never takes focus with it.
          const head = (
            <button
              type="button"
              className="transfer-trail__head"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : r.giftId)}
            >
              {sentence(r)}
              {isOpen ? (
                <CaretDown size={14} aria-hidden className="transfer-trail__caret" />
              ) : (
                <>
                  <span className="transfer-trail__amount">
                    <GratitudeIcon size={13} />
                    <Trans
                      i18nKey={($) => $.stickerBoard.transferTrail.amount}
                      values={{ amount: formatCount(g.total) }}
                      components={{ hidden: <span className="visually-hidden" /> }}
                    />
                  </span>
                  <CaretRight size={14} aria-hidden className="transfer-trail__caret" />
                </>
              )}
            </button>
          );
          if (!isOpen)
            return (
              <li key={r.giftId} data-gift-id={r.giftId} className="transfer-trail__row">
                {head}
              </li>
            );
          const split = artistShareLine(r, artist, viewerId);
          // The receiver sends the Gratitude, so it's from them.
          const fromYou = isYou(r.receiver);
          const from = handleOf(r.receiver);
          const amount = formatCount(g.total);
          return (
            <li key={r.giftId} data-gift-id={r.giftId} className="transfer-trail__row is-open">
              {head}
              <div className="transfer-trail__figure">
                <span ref={dot} className="transfer-trail__heart" aria-hidden>
                  <GratitudeIcon size={20} />
                </span>
                <span className="transfer-trail__sum">
                  {/* Five figures and up step down a size, so the total fits beside the heart and Replay. */}
                  <span
                    ref={total}
                    className={`transfer-trail__total ${amount.length > 5 ? "is-long" : ""}`}
                  >
                    {amount}
                  </span>
                  <span className="fine transfer-trail__from">
                    {/* The handle keeps its own case in the fine print's capitals. */}
                    {fromYou ? (
                      t(($) => $.stickerBoard.transferTrail.fromYou)
                    ) : (
                      <Trans
                        i18nKey={($) => $.stickerBoard.transferTrail.from}
                        components={{ name: <span className="handle">{from}</span> }}
                      />
                    )}
                  </span>
                </span>
                {/* One button throughout, Replay then Stop, so focus stays on it. */}
                <button
                  ref={pill}
                  type="button"
                  className="transfer-trail__replay"
                  aria-label={
                    !idle
                      ? t(($) => $.stickerBoard.transferTrail.replaying.stopLabel)
                      : fromYou
                        ? t(($) => $.stickerBoard.transferTrail.replayYours, { amount })
                        : t(($) => $.stickerBoard.transferTrail.replayTheirs, {
                            name: from,
                            amount,
                          })
                  }
                  onClick={idle ? replay.play : replay.stop}
                >
                  {idle ? <Play size={16} aria-hidden /> : <Stop size={16} aria-hidden />}
                  <span className="transfer-trail__replay-words">
                    <span className={idle ? undefined : "is-off"}>
                      {t(($) => $.stickerBoard.transferTrail.replay)}
                    </span>
                    <span className={idle ? "is-off" : undefined}>
                      {t(($) => $.stickerBoard.transferTrail.replaying.stop)}
                    </span>
                  </span>
                </button>
              </div>
              <ReplayStage
                open={!idle}
                reduced={reduced}
                host={host}
                returnFocus={() => pill.current}
              />
              {replay.failure?.kind === "load" && (
                <ErrorLine
                  className="transfer-trail__replay-note"
                  detail={errorDetail(replay.failure.error)}
                  // It goes as the replay starts, so focus moves to the pill, not the page.
                  onRetry={() => {
                    pill.current?.focus();
                    replay.play();
                  }}
                >
                  {t(($) => $.stickerBoard.transferTrail.replaying.didntLoad, {
                    reason: errorMessage(replay.failure.error),
                  })}
                </ErrorLine>
              )}
              {replay.failure?.kind === "loop" && (
                <ErrorLine className="transfer-trail__replay-note" detail={replay.failure.reason}>
                  {t(($) => $.stickerBoard.transferTrail.replaying.stopped)}
                </ErrorLine>
              )}
              {replay.seenFailure && (
                <ErrorLine
                  className="transfer-trail__replay-note"
                  detail={errorDetail(replay.seenFailure)}
                >
                  {t(($) => $.stickerBoard.transferTrail.replaying.notMarkedSeen, {
                    reason: errorMessage(replay.seenFailure),
                  })}
                </ErrorLine>
              )}
              <p className="visually-hidden" aria-live="polite">
                {replayLine(fromYou, from, amount)}
              </p>
              {split && <p className="transfer-trail__split">{split}</p>}
            </li>
          );
        })}
        {earlier > 0 && (
          <li className="transfer-trail__row transfer-trail__row--fold">
            <button
              type="button"
              className="transfer-trail__head"
              aria-expanded="false"
              onClick={() => {
                focusRevealed.current = true;
                setUnfolded(true);
              }}
            >
              <CaretDown size={14} aria-hidden className="transfer-trail__caret" />
              <span>{t(($) => $.stickerBoard.transferTrail.earlierGifts, { count: earlier })}</span>
            </button>
          </li>
        )}
      </ol>
    </section>
  );
}

/** A skeleton line as tall as a line of the text it stands for. */
const Line = ({ width }: { width: string }) => <Skeleton width={width} height="1.3em" />;

/**
 * The Transfer Trail's place while its sticker's detail is read: the rows it first shows, in outline
 * and in the same row boxes, so nothing under it moves as it lands. The newest gift is an open card
 * when it has gratitude, as the trail opens the most recent gratitude; past it, the fold.
 */
export function TransferTrailSkeleton({
  trail: { timesGiven, newestHasGratitude },
}: {
  trail: BoardStickerView["trail"];
}) {
  const { t } = useTranslation();
  const shown = Math.min(timesGiven, TRAIL_SHOWN);
  return (
    <section
      className="transfer-trail transfer-trail--loading"
      aria-label={t(($) => $.stickerBoard.transferTrail.label)}
    >
      <p className="visually-hidden" role="status">
        {t(($) => $.stickerBoard.transferTrail.loading)}
      </p>
      <ol className="transfer-trail__list" aria-hidden="true">
        {Array.from({ length: shown }, (_, i) =>
          i === 0 && newestHasGratitude ? (
            <li key={i} className="transfer-trail__row is-open">
              <p className="transfer-trail__head">
                <Line width="78%" />
              </p>
              <div className="transfer-trail__figure">
                <Skeleton width={40} height={40} round />
                <span className="transfer-trail__sum">
                  <span className="transfer-trail__total">
                    <Skeleton width="3em" height="1em" />
                  </span>
                  <span className="fine transfer-trail__from">
                    <Line width="9em" />
                  </span>
                </span>
                <Skeleton width={92} height={40} className="transfer-trail__replay-skeleton" />
              </div>
            </li>
          ) : (
            <li key={i} className="transfer-trail__row">
              <p className="transfer-trail__head">
                <Line width="78%" />
              </p>
            </li>
          ),
        )}
        {timesGiven > shown && (
          // A div, not a row's shorter p, so it holds the fold button's height.
          <li className="transfer-trail__row transfer-trail__row--fold">
            <div className="transfer-trail__head">
              <Line width="9em" />
            </div>
          </li>
        )}
      </ol>
    </section>
  );
}
