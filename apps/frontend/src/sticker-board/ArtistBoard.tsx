import { CaretLeft, Eye, Gift, Handshake } from "@phosphor-icons/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import { ArtistAvatarArt } from "../artists/ArtistAvatarArt";
import { ART_SIZE, avatarUrl, stickerArtUrl } from "../artists/artUrl";
import {
  artistByHandle,
  gratitudeTotal,
  type Artist,
  type ArtistBoardSticker,
} from "../artists/demoArtists";
import { GiveSheet } from "../giving/GiveSheet";
import { OfferSheet } from "../offers/OfferSheet";
import { Duration } from "../stickers/Duration";
import { formatHandle, formatNo } from "../stickers/format";
import { StickerFigure } from "../stickers/StickerFigure";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { PhotoSticker } from "../ui/PhotoSticker";
import { QuietLink } from "../ui/QuietLink";
import { useReducedMotion } from "../ui/useReducedMotion";
import type { BoardSticker } from "./boardSticker";
import { fieldOf, toPx, type Field } from "./placement";
import { PlacedSticker } from "./PlacedSticker";
import { BoardFlip } from "./stat-board/BoardFlip";
import { StatCork, type CorkFigures, type StatCorkHandle } from "./stat-board/StatCork";
import "./ArtistBoard.css";

interface Props {
  artist: Artist;
  onBack: () => void;
}

/** Gratitude at which a sticker's glow is at its brightest. */
const FULL_GLOW = 900;
/** The sticker menu's width, for keeping it on the board. */
const MENU_W = 250;

/**
 * A demo sticker as the board's parts take it: an image of its art, where it was stuck. The art
 * doubles as its mask, since its alpha is the silhouette, white edge and all.
 */
const asBoardSticker = (owner: string, s: ArtistBoardSticker, z: number): BoardSticker => {
  const art = stickerArtUrl(s.art);
  return {
    id: `${owner}-${s.no}`,
    no: s.no,
    createdAt: s.sealedAt,
    timeUsed: s.timeUsed,
    blob: new Blob(),
    width: ART_SIZE,
    height: ART_SIZE,
    urls: { png: art, mask: art },
    placement: { on: true, x: s.x, y: s.y, s: s.scale, r: s.rotation, z },
  };
};

/** Someone else's board has no sticker tray, so its field runs to the right inset too. */
const visitField = (w: number, h: number): Field => {
  const f = fieldOf(w, h);
  return { ...f, w: w - 2 * f.left };
};

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
        <b>{formatHandle(handle)}</b>
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
    <div className="visit-view-backdrop" onClick={onClose}>
      <div
        className="visit-view"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={formatNo(sticker.no)}
      >
        <StickerFigure
          urls={{ png: stickerArtUrl(sticker.art) }}
          width={ART_SIZE}
          height={ART_SIZE}
          className="visit-view-art"
        />
        <h2>{formatNo(sticker.no)}</h2>
        <div className="visit-view-meta fine">
          Drawn in <Duration seconds={sticker.timeUsed} /> · {formatHandle(sticker.by ?? owner)}
        </div>
        {sticker.by && <ArtistChip handle={sticker.by} />}
        <div className="visit-view-perf" />
        <QuietLink onClick={onClose}>Close</QuietLink>
      </div>
    </div>
  );
}

const figuresOf = (artist: Artist): CorkFigures => {
  const { stats } = artist;
  return {
    name: artist.displayName,
    handle: artist.handle,
    picture: <PhotoSticker src={avatarUrl(artist.avatar)} name={artist.displayName} size={42} />,
    own: false,
    gratitude: gratitudeTotal(stats) > 0 ? stats.gratitude : undefined,
    streak: { current: stats.streakDays, best: stats.bests.longestStreak ?? 0 },
    streakRule:
      stats.streakDays > 0
        ? "Miss a day and it drops by one, not back to zero. Days turn over at 4:00."
        : "It starts the first day they draw. Miss a day later and it drops by one.",
    stamps: { made: stats.made, received: stats.received, given: stats.given },
    bestCombo: stats.bests.bestCombo,
    mostThanksInADay: stats.bests.mostThanksInADay,
    since: stats.since,
    address: artist.boardAddress,
  };
};

/**
 * Someone else's Sticker Board, read only, opened from Explore. Their stickers sit where they
 * stuck them, foil on the ones someone else drew; their name turns it over to their stat board.
 */
export function ArtistBoard({ artist, onBack }: Props) {
  const reduced = useReducedMotion();
  const hint = useId();
  const face = useRef<HTMLDivElement>(null);
  const nameButton = useRef<HTMLButtonElement>(null);
  const flipBack = useRef<HTMLButtonElement>(null);
  const cork = useRef<StatCorkHandle>(null);
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const [turned, setTurned] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [viewing, setViewing] = useState<ArtistBoardSticker | null>(null);
  const [giving, setGiving] = useState(false);
  const [offering, setOffering] = useState<ArtistBoardSticker | null>(null);

  const stickers = useMemo(
    () => artist.board.map((s, i) => asBoardSticker(artist.handle, s, i + 1)),
    [artist],
  );
  const field = size && visitField(size.W, size.H);
  const menuSticker = selected === null ? null : artist.board[selected];

  useLayoutEffect(() => {
    const el = face.current;
    if (!el) return;
    const measure = () =>
      setSize((was) =>
        was?.W === el.clientWidth && was.H === el.clientHeight
          ? was
          : { W: el.clientWidth, H: el.clientHeight },
      );
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, []);

  // LINE's header shows the page title.
  useEffect(() => {
    const previous = document.title;
    document.title = `${formatHandle(artist.handle)}'s sticker board`;
    return () => {
      document.title = previous;
    };
  }, [artist.handle]);

  // The stat board and the give and offer sheets handle their own Escape; on the front it closes
  // the sticker view, then the sticker menu.
  useEffect(() => {
    if (turned || giving || offering) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (viewing) setViewing(null);
      else setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turned, giving, offering, viewing]);

  const turn = (over: boolean) => {
    setSelected(null);
    setTurned(over);
  };

  const toggleMenu = (target: EventTarget) => {
    const el = target instanceof Element ? target.closest("[data-sticker-id]") : null;
    const i = el ? stickers.findIndex((s) => s.id === el.getAttribute("data-sticker-id")) : -1;
    setSelected(i < 0 || i === selected ? null : i);
  };
  const onStageClick = (e: MouseEvent<HTMLDivElement>) => toggleMenu(e.target);
  // Read only, so every sticker is a Tab stop and Enter or Space opens its menu.
  const onStageKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    toggleMenu(e.target);
  };

  const menuSpot = (s: ArtistBoardSticker) => {
    if (!field || !size) return undefined;
    const c = toPx(field, s);
    const half = (s.scale * size.W) / 2;
    return {
      left: Math.min(Math.max(8, c.x - MENU_W / 2), size.W - MENU_W - 8),
      top: s.y > 0.6 ? c.y - half - 136 : c.y + half + 12,
    };
  };

  const front = (
    <div className="board visit" ref={face}>
      <div
        className="board-stage"
        role="region"
        aria-label={`${formatHandle(artist.handle)}'s sticker board`}
        onClick={onStageClick}
        onKeyDown={onStageKeyDown}
      >
        <span id={hint} hidden>
          Enter opens its menu: view it, or offer for it
        </span>
        {artist.board.length === 0 && (
          <div className="board-blank">
            <span className="board-blank-cut" aria-hidden />
            <span className="board-blank-note">
              {formatHandle(artist.handle)} hasn’t stuck anything up yet.
            </span>
          </div>
        )}
        {field &&
          size &&
          stickers.map((s, i) => (
            <PlacedSticker
              key={s.id}
              sticker={s}
              field={field}
              boardWidth={size.W}
              stack={i === selected ? stickers.length : i}
              curled={false}
              selected={i === selected}
              knobBelow={false}
              landing={false}
              onLanded={() => {}}
              reduced={reduced}
              tabbable
              position={`${i + 1} of ${stickers.length}`}
              hintId={hint}
              foil={Boolean(artist.board[i].by)}
              glow={Math.min(artist.board[i].gratitude / FULL_GLOW, 1)}
            />
          ))}
      </div>

      <button
        type="button"
        ref={nameButton}
        className="board-who"
        onClick={() => turn(!turned)}
        aria-expanded={turned}
        aria-haspopup="dialog"
        aria-label={`${artist.displayName}: their stats`}
      >
        <PhotoSticker src={avatarUrl(artist.avatar)} name={artist.displayName} size={42} />
        <span className="board-who-name">{artist.displayName}</span>
      </button>
      <button type="button" className="explore-chip" data-press onClick={onBack}>
        <CaretLeft size={14} />
        Explore
      </button>

      {menuSticker && (
        <div
          className="sticker-menu"
          style={menuSpot(menuSticker)}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {menuSticker.by && <ArtistChip handle={menuSticker.by} />}
          <div className="sticker-menu-actions">
            <LabelButton
              size="sm"
              icon={<Eye />}
              onClick={() => {
                setViewing(menuSticker);
                setSelected(null);
              }}
            >
              View
            </LabelButton>
            <LabelButton
              size="sm"
              tone="grape"
              icon={<Handshake />}
              onClick={() => {
                setOffering(menuSticker);
                setSelected(null);
              }}
            >
              Offer for it
            </LabelButton>
          </div>
        </div>
      )}

      {/* Give takes Draw's slot as the board's one key. */}
      <span className="board-draw">
        <Key
          size="compact"
          tone="aqua"
          icon={<Gift />}
          onClick={() => {
            setSelected(null);
            setGiving(true);
          }}
        >
          Give
        </Key>
      </span>
    </div>
  );

  return (
    <div className="artist-board">
      <BoardFlip
        turned={turned}
        onTurnedChange={turn}
        onTurnEnd={(over) => {
          if (over) cork.current?.settle();
        }}
        frontFocus={nameButton}
        backFocus={flipBack}
        front={front}
        back={
          <StatCork
            ref={cork}
            figures={figuresOf(artist)}
            onFlipBack={() => turn(false)}
            flipBackRef={flipBack}
          />
        }
      />

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
