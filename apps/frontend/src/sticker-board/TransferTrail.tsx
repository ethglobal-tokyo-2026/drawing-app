import { CaretDown, CaretRight, Heart, Play } from "@phosphor-icons/react";
import { useState } from "react";
import type { PersonView } from "../api/views";
import { formatCount } from "../i18n/format";
import { Trans, useTranslation } from "../i18n/react";
import { formatMonthDay } from "../stickers/format";
import { handleOf } from "./boardSticker";
import { artistShareLine, defaultOpenRow, TRAIL_SHOWN, type TrailRow } from "./trailRows";
import "./transfer-trail.css";

interface Props {
  rows: readonly TrailRow[];
  /** Who's looking, who reads as "you". */
  viewerId: string;
  /** The Original Artist, for the artist's share. */
  artist: PersonView;
  /** Plays a gratitude replay; without it there's no Replay button. */
  onReplay?: (giftId: string) => void;
}

/**
 * Where a sticker has been: one row per hand-off, newest first. One row is open at a time, the
 * most recent gratitude by default, with its amount and Replay; any row with gratitude opens with
 * a tap. Past the newest gift, the rest fold into "N earlier gifts".
 */
export function TransferTrail({ rows, viewerId, artist, onReplay }: Props) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState(() => defaultOpenRow(rows, viewerId));
  const openAt = rows.findIndex((r) => r.giftId === openId);
  const [unfolded, setUnfolded] = useState(openAt >= TRAIL_SHOWN);
  const shown = unfolded ? rows : rows.slice(0, TRAIL_SHOWN);
  const earlier = rows.length - shown.length;
  const isYou = (p: PersonView) => p.id === viewerId;

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
                    <Heart size={13} weight="fill" aria-hidden />
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
                <span className="transfer-trail__heart" aria-hidden>
                  <Heart size={20} weight="fill" />
                </span>
                <span className="transfer-trail__sum">
                  <span className={`transfer-trail__total ${amount.length > 5 ? "is-long" : ""}`}>
                    {amount}
                  </span>
                  <span className="fine transfer-trail__from">
                    {fromYou
                      ? t(($) => $.stickerBoard.transferTrail.fromYou)
                      : t(($) => $.stickerBoard.transferTrail.from, { name: from })}
                  </span>
                </span>
                {onReplay && (
                  <button
                    type="button"
                    className="transfer-trail__replay"
                    aria-label={
                      fromYou
                        ? t(($) => $.stickerBoard.transferTrail.replayYours, { amount })
                        : t(($) => $.stickerBoard.transferTrail.replayTheirs, {
                            name: from,
                            amount,
                          })
                    }
                    onClick={() => onReplay(r.giftId)}
                  >
                    <Play size={16} aria-hidden />
                    <span>{t(($) => $.stickerBoard.transferTrail.replay)}</span>
                  </button>
                )}
              </div>
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
