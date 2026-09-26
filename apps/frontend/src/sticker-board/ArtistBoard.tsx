import { useEffect, useState } from "react";
import { ArtistArt } from "../artists/ArtistArt";
import { ArtistAvatarArt } from "../artists/ArtistAvatarArt";
import { artistByHandle, type Artist, type ArtistBoardSticker } from "../artists/demoArtists";
import { Key, Label, QuietLink } from "../controls/controls";
import { usePress } from "../controls/usePress";
import { CaretLeftIcon } from "../icons/CaretLeftIcon";
import { EyeIcon } from "../icons/EyeIcon";
import { GiftIcon } from "../icons/GiftIcon";
import { HandshakeIcon } from "../icons/HandshakeIcon";
import { GiveSheet } from "../giving/GiveSheet";
import { OfferSheet } from "../offers/OfferSheet";
import { formatClock, formatNo } from "../stickers/format";
import { CorkBack } from "./CorkBack";
import "../styles/result-card.css";
import "./StickerBoard.css";
import "./ArtistBoard.css";

interface Props {
  artist: Artist;
  onBack: () => void;
}

/** Gratitude at which a sticker's glow is at its brightest. */
const FULL_GLOW = 900;

/** A sticker as it sits on someone else's board: foil when someone else drew it, a glow for thanks. */
function BoardArt({
  sticker,
  className = "",
}: {
  sticker: ArtistBoardSticker;
  className?: string;
}) {
  return (
    <span
      className={`board-art ${sticker.by ? "foiled" : ""} ${className}`}
      style={{ "--glow": Math.min(sticker.gratitude / FULL_GLOW, 1) }}
    >
      {sticker.by && <ArtistArt art={sticker.art} className="foil-band" />}
      <ArtistArt art={sticker.art} />
    </span>
  );
}

/** Who drew a foil sticker: their picture in a foil ring, over "ARTIST @name". */
function ArtistChip({ handle }: { handle: string }) {
  const artist = artistByHandle.get(handle);
  return (
    <span className="artist-chip">
      <span className="chip-ring">
        {artist ? (
          <ArtistAvatarArt avatar={artist.avatar} className="chip-avatar" />
        ) : (
          <span className="chip-avatar artist-avatar" />
        )}
      </span>
      <span className="chip-text">
        <span className="fine">Artist</span>
        <b>@{handle}</b>
      </span>
    </span>
  );
}

function StickerView({
  sticker,
  owner,
  onClose,
}: {
  sticker: ArtistBoardSticker;
  owner: string;
  onClose: () => void;
}) {
  return (
    <div className="result-backdrop" onClick={onClose}>
      <div
        className="result-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={formatNo(sticker.no)}
      >
        <BoardArt sticker={sticker} className="view-art" />
        <h2>{formatNo(sticker.no)}</h2>
        <div className="result-meta fine">
          Drawn in {formatClock(sticker.timeUsed)} · @{sticker.by ?? owner}
        </div>
        {sticker.by && <ArtistChip handle={sticker.by} />}
        <div className="perforation" />
        <QuietLink onPress={onClose}>Close</QuietLink>
      </div>
    </div>
  );
}

function ExploreChip({ onBack }: { onBack: () => void }) {
  const { handlers } = usePress(onBack);
  return (
    <button type="button" className="explore-chip" {...handlers}>
      <CaretLeftIcon size={14} />
      Explore
    </button>
  );
}

/** Someone else's sticker board, read only, opened from Explore. Their name turns it over. */
export function ArtistBoard({ artist, onBack }: Props) {
  const [turned, setTurned] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [viewing, setViewing] = useState<ArtistBoardSticker | null>(null);
  const [giving, setGiving] = useState(false);
  const [offering, setOffering] = useState<ArtistBoardSticker | null>(null);
  const menuSticker = selected === null ? null : artist.board[selected];

  // LINE's header shows the page title.
  useEffect(() => {
    const previous = document.title;
    document.title = `@${artist.handle}'s sticker board`;
    return () => {
      document.title = previous;
    };
  }, [artist.handle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (giving) setGiving(false);
      else if (offering) setOffering(null);
      else if (turned) setTurned(false);
      else setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turned, giving, offering]);

  const turn = () => {
    setSelected(null);
    setTurned((t) => !t);
  };

  return (
    <div className="artist-board">
      <div className={`flipper ${turned ? "turned" : ""}`}>
        <div className="face front" inert={turned}>
          <div className="board">
            <div className="artist-board-head">
              <button
                className="board-header"
                onClick={turn}
                aria-label={`${artist.displayName}, turn the board over for their stats`}
              >
                <span className="photo-sticker" style={{ background: artist.avatar.bg }}>
                  <ArtistArt art={artist.avatar.art} />
                </span>
                <span className="board-name">{artist.displayName}</span>
              </button>
              <ExploreChip onBack={onBack} />
            </div>

            <div className="board-frame read-only" onClick={() => setSelected(null)}>
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />

              {artist.board.length === 0 && (
                <div className="board-empty">
                  <div className="empty-slot">
                    @{artist.handle} hasn’t
                    <br />
                    stuck anything up yet.
                  </div>
                </div>
              )}

              {artist.board.map((s, i) => (
                <button
                  key={s.no}
                  type="button"
                  className={`visit-sticker ${selected === i ? "selected" : ""}`}
                  style={{
                    left: `${s.x * 100}%`,
                    top: `${s.y * 100}%`,
                    width: `${s.scale * 100}%`,
                    zIndex: selected === i ? artist.board.length + 1 : i + 1,
                    transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                  }}
                  aria-label={`${formatNo(s.no)}${s.by ? `, by @${s.by}` : ""}`}
                  aria-expanded={selected === i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(selected === i ? null : i);
                  }}
                >
                  <BoardArt sticker={s} />
                </button>
              ))}

              {menuSticker && (
                <div
                  className="sticker-menu"
                  style={{
                    left: `clamp(8px, calc(${menuSticker.x * 100}% - 125px), calc(100% - 258px))`,
                    top: `calc(${menuSticker.y * 100}% + ${menuSticker.y > 0.6 ? "-196px" : "48px"})`,
                  }}
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  {menuSticker.by && <ArtistChip handle={menuSticker.by} />}
                  <div className="sticker-menu-actions">
                    <Label
                      small
                      icon={<EyeIcon size={18} />}
                      onPress={() => {
                        setViewing(menuSticker);
                        setSelected(null);
                      }}
                    >
                      View
                    </Label>
                    <Label
                      small
                      hue="grape"
                      icon={<HandshakeIcon size={18} />}
                      onPress={() => {
                        setOffering(menuSticker);
                        setSelected(null);
                      }}
                    >
                      Offer for it
                    </Label>
                  </div>
                </div>
              )}
            </div>

            <div className="board-draw">
              <Key
                size="sm"
                hue="aqua"
                icon={<GiftIcon size={20} />}
                onPress={() => {
                  setSelected(null);
                  setGiving(true);
                }}
              >
                Give
              </Key>
            </div>
          </div>
        </div>

        <div className="face back" inert={!turned}>
          <CorkBack artist={artist} onFlipBack={() => setTurned(false)} />
        </div>
      </div>

      {viewing && (
        <StickerView sticker={viewing} owner={artist.handle} onClose={() => setViewing(null)} />
      )}
      {giving && <GiveSheet to={artist.handle} onClose={() => setGiving(false)} />}
      {offering && (
        <OfferSheet sticker={offering} holder={artist} onClose={() => setOffering(null)} />
      )}
    </div>
  );
}
