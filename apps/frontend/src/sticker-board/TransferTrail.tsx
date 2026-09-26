import { CaretDown, CaretRight, GratitudeIcon, Play, Stop } from "../icons";
import { useEffect, useRef, useState } from "react";
import type { PersonView } from "../api/views";
import type { mountGratitudeReplay } from "../gratitude/replay/mountGratitudeReplay";
import { EASE_OUT, ReplayStage } from "../gratitude/replay/ReplayStage";
import { useGratitudeReplay } from "../gratitude/replay/useGratitudeReplay";
import { errorReason } from "../i18n/errorMessage";
import { formatCount } from "../i18n/format";
import { Trans, useTranslation } from "../i18n/react";
import { formatMonthDay } from "../stickers/format";
import { QuietLink } from "../ui/QuietLink";
import { useReducedMotion } from "../ui/useReducedMotion";
import { handleOf } from "./boardSticker";
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
  /** Builds a gratitude replay's engine; tests pass a fake. */
  mountReplay?: typeof mountGratitudeReplay;
}

/**
 * Where a sticker has been: one row per hand-off, newest first. One row is open at a time, the
 * most recent gratitude by default, with its amount and Replay, which plays the combo inside the
 * card; any row with gratitude opens with a tap. Past the newest gift, the rest fold into "N
 * earlier gifts".
 */
export function TransferTrail({ rows, viewerId, artist, mountReplay }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [openId, setOpenId] = useState(() => defaultOpenRow(rows, viewerId));
  const openAt = rows.findIndex((r) => r.giftId === openId);
  const [unfolded, setUnfolded] = useState(openAt >= TRAIL_SHOWN);
  const shown = unfolded ? rows : rows.slice(0, TRAIL_SHOWN);
  const earlier = rows.length - shown.length;
  const isYou = (p: PersonView) => p.id === viewerId;

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
    mount: mountReplay,
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
    <section className="transfer-trail" aria-label={t(($) => $.stickerBoard.transferTrail.label)}>
      <ol className="transfer-trail__list">
        {shown.map((r) => {
          const g = r.gratitude;
          if (!g)
            return (
              <li key={r.giftId} className="transfer-trail__row">
                <p className="transfer-trail__head">{sentence(r)}</p>
              </li>
            );
          if (r.giftId !== openId)
            return (
              <li key={r.giftId} className="transfer-trail__row">
                <button
                  type="button"
                  className="transfer-trail__head"
                  aria-expanded="false"
                  onClick={() => setOpenId(r.giftId)}
                >
                  {sentence(r)}
                  <span className="transfer-trail__amount">
                    <GratitudeIcon size={13} />
                    <Trans
                      i18nKey={($) => $.stickerBoard.transferTrail.amount}
                      values={{ amount: formatCount(g.total) }}
                      components={{ hidden: <span className="visually-hidden" /> }}
                    />
                  </span>
                  <CaretRight size={14} aria-hidden className="transfer-trail__caret" />
                </button>
              </li>
            );
          const split = artistShareLine(r, artist, viewerId);
          // The receiver sends the Gratitude, so it's from them.
          const fromYou = isYou(r.receiver);
          const from = handleOf(r.receiver);
          const amount = formatCount(g.total);
          return (
            <li key={r.giftId} className="transfer-trail__row is-open">
              <p className="transfer-trail__head">{sentence(r)}</p>
              <div className="transfer-trail__figure">
                <span ref={dot} className="transfer-trail__heart" aria-hidden>
                  <GratitudeIcon size={20} />
                </span>
                <span className="transfer-trail__sum">
                  <span
                    ref={total}
                    className={`transfer-trail__total ${amount.length > 5 ? "is-long" : ""}`}
                  >
                    {amount}
                  </span>
                  <span className="fine transfer-trail__from">
                    {fromYou
                      ? t(($) => $.stickerBoard.transferTrail.fromYou)
                      : t(($) => $.stickerBoard.transferTrail.from, { name: from })}
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
              {replay.failure && (
                <p className="fine transfer-trail__replay-note" role="alert">
                  {replay.failure.kind === "load" ? (
                    <>
                      {t(($) => $.stickerBoard.transferTrail.replaying.didntLoad, {
                        reason: errorReason(replay.failure.error),
                      })}{" "}
                      <QuietLink
                        onClick={() => {
                          // It goes as the replay starts, so focus moves to the pill, not the page.
                          pill.current?.focus();
                          replay.play();
                        }}
                      >
                        {t(($) => $.stickerBoard.tryAgain)}
                      </QuietLink>
                    </>
                  ) : (
                    t(($) => $.stickerBoard.transferTrail.replaying.stopped, {
                      reason: replay.failure.reason,
                    })
                  )}
                </p>
              )}
              {replay.seenFailure && (
                <p className="fine transfer-trail__replay-note">
                  {t(($) => $.stickerBoard.transferTrail.replaying.notMarkedSeen, {
                    reason: errorReason(replay.seenFailure),
                  })}
                </p>
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
              onClick={() => setUnfolded(true)}
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
