import { CaretDown, CaretRight, Heart, Play } from "@phosphor-icons/react";
import { useState } from "react";
import type { PersonView } from "../api/views";
import { formatMonthDay } from "../stickers/format";
import {
  artistShareLine,
  defaultOpenRow,
  TRAIL_SHOWN,
  trailName,
  type TrailRow,
} from "./trailRows";
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

const amount = (n: number) => n.toLocaleString("en-US");

/**
 * Where a sticker has been: one row per hand-off, newest first. One row is open at a time, the
 * most recent gratitude by default, with its amount and Replay; any row with gratitude opens with
 * a tap. Past the newest gift, the rest fold into "N earlier gifts".
 */
export function TransferTrail({ rows, viewerId, artist, onReplay }: Props) {
  const [openId, setOpenId] = useState(() => defaultOpenRow(rows, viewerId));
  const openAt = rows.findIndex((r) => r.giftId === openId);
  const [unfolded, setUnfolded] = useState(openAt >= TRAIL_SHOWN);
  const shown = unfolded ? rows : rows.slice(0, TRAIL_SHOWN);
  const earlier = rows.length - shown.length;

  // The artist is named once, in the detail's by-line, so the rows carry no artist tag.
  const name = (p: PersonView, leads = false) => {
    const n = trailName(p, viewerId);
    return <b>{leads && n === "you" ? "You" : n}</b>;
  };
  // "@mika gave it to you · 9.23", with the giver's name leading the sentence.
  const sentence = (r: TrailRow) => (
    <span className="transfer-trail__say">
      {name(r.giver, true)} gave it to {name(r.receiver)}
      <span className="transfer-trail__at"> · {formatMonthDay(r.receivedAt)}</span>
    </span>
  );

  return (
    <section className="transfer-trail" aria-label="Where it’s been">
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
                    {amount(g.total)}
                    <span className="visually-hidden"> gratitude</span>
                  </span>
                  <CaretRight size={14} aria-hidden className="transfer-trail__caret" />
                </button>
              </li>
            );
          const split = artistShareLine(r, artist, viewerId);
          const from = trailName(r.receiver, viewerId);
          return (
            <li key={r.giftId} className="transfer-trail__row is-open">
              <p className="transfer-trail__head">{sentence(r)}</p>
              <div className="transfer-trail__figure">
                <span className="transfer-trail__heart" aria-hidden>
                  <Heart size={20} weight="fill" />
                </span>
                <span className="transfer-trail__sum">
                  <span
                    className={`transfer-trail__total ${amount(g.total).length > 5 ? "is-long" : ""}`}
                  >
                    {amount(g.total)}
                  </span>
                  <span className="fine transfer-trail__from">
                    {from === "you" ? "From you" : `From ${from}`}
                  </span>
                </span>
                {onReplay && (
                  <button
                    type="button"
                    className="transfer-trail__replay"
                    aria-label={`Play the replay of ${from === "you" ? "your" : `${from}’s`} ${amount(g.total)} gratitude`}
                    onClick={() => onReplay(r.giftId)}
                  >
                    <Play size={16} aria-hidden />
                    <span>Replay</span>
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
              <span>
                {earlier} earlier {earlier === 1 ? "gift" : "gifts"}
              </span>
            </button>
          </li>
        )}
      </ol>
    </section>
  );
}
