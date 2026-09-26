import { useState } from "react";
import { ArtistArt } from "../artists/ArtistArt";
import { gratitudeTotal, type Artist } from "../artists/demoArtists";
import { Label } from "../controls/controls";
import { useToast } from "../controls/useToast";
import { CopyIcon } from "../icons/CopyIcon";
import { FlipBackIcon } from "../icons/FlipBackIcon";
import { formatDay } from "../stickers/format";
import "./CorkBack.css";

interface Props {
  artist: Artist;
  onFlipBack: () => void;
}

const figure = (n: number) => n.toLocaleString("en-US");

const GRATITUDE_KINDS = [
  { key: "daily", label: "Daily", reason: "For drawing each day. A streak adds more." },
  { key: "inspired", label: "Inspired", reason: "Thanks for stickers they gave." },
  { key: "magic", label: "Magic", reason: "Thanks sent a special way." },
] as const;

/** The back of someone's sticker board, where their figures are pinned up as paper. */
export function CorkBack({ artist, onFlipBack }: Props) {
  const toast = useToast();
  // The receipt is printed when the back is first turned to.
  const [printedAt] = useState(() => Date.now());
  const { stats } = artist;
  const total = gratitudeTotal(stats);
  const { bests } = stats;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(artist.boardAddress);
      toast.show("Address copied");
    } catch (error) {
      console.error("Copying the board address failed", error);
      toast.show("Couldn’t copy the address");
    }
  };

  return (
    // Bare cork flips back; everything pinned on it stops the tap.
    <div className="cork" onClick={onFlipBack}>
      <div className="name-card" onClick={(e) => e.stopPropagation()}>
        <span className="photo-sticker" style={{ background: artist.avatar.bg }}>
          <ArtistArt art={artist.avatar.art} />
        </span>
        <div className="name-paper">
          <span className="washi" aria-hidden />
          <b>{artist.displayName}</b>
          <span className="fine">@{artist.handle} · from their LINE profile</span>
        </div>
      </div>

      <div className="cork-grid" onClick={(e) => e.stopPropagation()}>
        <div className="cork-col">
          <section className="receipt pinned" aria-label="Gratitude received">
            <span className="pushpin" aria-hidden />
            <div className="receipt-head fine">
              <span>@{artist.handle}</span>
              <span>{formatDay(printedAt)}</span>
            </div>
            <h3 className="fine">Gratitude received</h3>
            {total === 0 ? (
              <p className="paper-note">
                No gratitude yet. It arrives when someone thanks a sticker they gave them.
              </p>
            ) : (
              <ul className="receipt-rows">
                {GRATITUDE_KINDS.map((k) => (
                  <li key={k.key}>
                    <span className={`receipt-dot receipt-dot-${k.key}`} aria-hidden />
                    <b>{k.label}</b>
                    <span className="receipt-amount">{figure(stats.gratitude[k.key])}</span>
                    <span className="paper-note">{k.reason}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="receipt-total">
              <span className="fine">Total</span>
              <span className="figure-big">{figure(total)}</span>
            </div>
          </section>

          <section className="bests pinned" aria-label="Bests">
            <span className="washi washi-corner" aria-hidden />
            <h3>Bests</h3>
            <dl>
              <div>
                <dt>Longest streak</dt>
                <dd>{bests.longestStreak === null ? "None yet" : `${bests.longestStreak} days`}</dd>
              </div>
              <div>
                <dt>
                  Best combo
                  <span className="paper-note">The most taps they’ve put into one thank-you</span>
                </dt>
                <dd>{bests.bestCombo === null ? "None yet" : `×${bests.bestCombo}`}</dd>
              </div>
              <div>
                <dt>Most thanks in a day</dt>
                <dd>
                  {bests.mostThanksInADay === null ? "None yet" : figure(bests.mostThanksInADay)}
                </dd>
              </div>
            </dl>
          </section>

          <button
            type="button"
            className="maker-tape"
            onClick={() => void copyAddress()}
            aria-label={`Copy ${artist.boardAddress}`}
          >
            {artist.boardAddress}
            <CopyIcon size={14} />
          </button>
          <span className="maker-tape since">Since {formatDay(stats.since)}</span>
        </div>

        <div className="cork-col">
          <section className="streak-leaf pinned" aria-label="Streak">
            <span className="leaf-pin" aria-hidden />
            <h3 className="leaf-band">Streak</h3>
            {stats.streakDays === 0 ? (
              <>
                <b className="leaf-empty">Not started</b>
                <p className="paper-note">
                  It starts the first day they draw. Miss a day later and it drops by one.
                </p>
              </>
            ) : (
              <>
                <b className="figure-huge">{stats.streakDays}</b>
                <span className="fine">{stats.streakDays === 1 ? "Day" : "Days"}</span>
                <p className="paper-note">
                  Miss a day and it drops by one, not back to zero. Days turn over at 4:00.
                </p>
              </>
            )}
          </section>

          <div className="stamps">
            <span className="stamp stamp-seal">
              <b>{stats.made}</b>
              <span>Made</span>
            </span>
            <span className="stamp stamp-grape">
              <b>{stats.received}</b>
              <span>Received</span>
            </span>
            <span className="stamp stamp-aqua">
              <b>{stats.given}</b>
              <span>Given</span>
            </span>
          </div>

          <Label small icon={<FlipBackIcon size={18} />} onPress={onFlipBack} className="flip-back">
            Flip back
          </Label>
        </div>
      </div>
      {toast.node}
    </div>
  );
}
