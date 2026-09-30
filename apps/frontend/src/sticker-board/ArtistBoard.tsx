import { CaretLeft, GiveIcon, OfferIcon, ViewIcon } from "../icons";
import { useMyAgeStatus } from "../identity/useMyAgeStatus";
import { veiledFor } from "../stickers/nsfw";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import type { Person } from "@drawing-app/api/client";
import { useApiQuery } from "../api/useApiQuery";
import { toPerson, type PersonView } from "../api/views";
import { GiveSheet } from "../giving/GiveSheet";
import { errorReason } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import { OfferSheet } from "../offers/OfferSheet";
import { ArtistChip } from "../stickers/ArtistChip";
import { Duration } from "../stickers/Duration";
import { formatHandle, formatNo } from "../stickers/format";
import { useLight } from "../stickers/light";
import { StickerFigure } from "../stickers/StickerFigure";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { PhotoSticker } from "../ui/PhotoSticker";
import { QuietLink } from "../ui/QuietLink";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import { onTheBoard, toBoardSticker, type BoardStickerView } from "./boardSticker";
import { fieldOf, toPx, type Field } from "./placement";
import { PlacedSticker } from "./PlacedSticker";
import { BoardFlip } from "./stat-board/BoardFlip";
import { StatCork, type CorkFigures, type StatCorkHandle } from "./stat-board/StatCork";
import { statFigures } from "./stat-board/statFigures";
import { useBoardSize } from "./useBoardSize";
import "./ArtistBoard.css";

interface Props {
  /** Whose board it is, as Explore found them. */
  person: Person;
  onBack: () => void;
}

/** The sticker menu's width, for keeping it on the board. */
const MENU_W = 250;

/** Their handle, or their LINE name until they've picked one. */
const artistName = (artist: PersonView) =>
  artist.handle ? formatHandle(artist.handle) : artist.name;

/** Someone else's board has no sticker tray, so its field runs to the right inset too. */
const visitField = (w: number, h: number): Field => {
  const f = fieldOf(w, h);
  return { ...f, w: w - 2 * f.left };
};

function StickerView({
  sticker,
  owner,
  onClose,
}: {
  sticker: BoardStickerView;
  owner: PersonView;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const drawnByOwner = sticker.artist.id === owner.id;
  const myAge = useMyAgeStatus();
  const root = useRef<HTMLDivElement>(null);
  useBackToClose(true, onClose);
  useFocusTrap(root, { onEscape: onClose });
  return (
    <div className="visit-view-backdrop" onClick={onClose}>
      <div
        ref={root}
        tabIndex={-1}
        className="visit-view"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={formatNo(sticker.no)}
      >
        <StickerFigure
          urls={sticker.urls}
          width={sticker.width}
          height={sticker.height}
          nsfw={sticker.nsfw}
          veiled={veiledFor(sticker, myAge)}
          className="visit-view-art"
        />
        <h2>{formatNo(sticker.no)}</h2>
        <div className="visit-view-meta fine">
          {/* Their name is a component's text, which Trans never reads as markup. */}
          <Trans
            i18nKey={($) => $.stickerBoard.artistBoard.drawnIn}
            components={{
              duration: <Duration seconds={sticker.timeUsed} />,
              artist: <>{artistName(sticker.artist)}</>,
            }}
          />
        </div>
        {!drawnByOwner && <ArtistChip artist={sticker.artist} />}
        <div className="visit-view-perf" />
        <QuietLink onClick={onClose}>{t(($) => $.stickerBoard.artistBoard.close)}</QuietLink>
      </div>
    </div>
  );
}

/**
 * Someone else's Sticker Board, read only, opened from Explore. Their stickers sit where they
 * stuck them, foil on the ones someone else drew; their name turns it over to their stat board.
 */
export function ArtistBoard({ person, onBack }: Props) {
  const { t } = useTranslation();
  const owner = toPerson(person);
  const myAge = useMyAgeStatus();
  const handle = person.handle ? formatHandle(person.handle) : owner.name;
  const title = t(($) => $.stickerBoard.artistBoard.title, { name: handle });
  const board = useApiQuery(`sticker-board/${person.id}`, (api) => api.stickerBoard(person.id));
  const stats = useApiQuery(`user-stats/${person.id}`, (api) => api.userStats(person.id));
  const reduced = useReducedMotion();
  const hint = useId();
  const face = useRef<HTMLDivElement>(null);
  const nameButton = useRef<HTMLButtonElement>(null);
  const flipBack = useRef<HTMLButtonElement>(null);
  const cork = useRef<StatCorkHandle>(null);
  const size = useBoardSize(face);
  const [turned, setTurned] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [viewing, setViewing] = useState<BoardStickerView | null>(null);
  const [giving, setGiving] = useState(false);
  const [offering, setOffering] = useState<BoardStickerView | null>(null);
  useLight(!turned);

  // What's on their board, bottom of the stack first.
  const stickers = useMemo(
    () =>
      (board.state === "ready" ? board.data.boardStickers : [])
        .map(toBoardSticker)
        .filter(onTheBoard)
        .sort((a, b) => a.placement.z - b.placement.z),
    [board],
  );
  const field = size && visitField(size.W, size.H);
  const menuSticker = selected === null ? null : stickers[selected];

  // LINE's header shows the page title.
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

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
  // Back turns the stat board to its front, as on your own board.
  useBackToClose(turned, () => turn(false));

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

  const menuSpot = (s: BoardStickerView) => {
    if (!field || !size) return undefined;
    const c = toPx(field, s.placement);
    const half = (s.placement.s * size.W) / 2;
    return {
      left: Math.min(Math.max(8, c.x - MENU_W / 2), size.W - MENU_W - 8),
      top: s.placement.y > 0.6 ? c.y - half - 136 : c.y + half + 12,
    };
  };

  const figures: CorkFigures = {
    name: owner.name,
    handle: person.handle ?? owner.name,
    ensName: person.ensName,
    own: false,
    failure:
      stats.state === "failed"
        ? t(($) => $.stickerBoard.artistBoard.statsDidntLoad, {
            reason: errorReason(stats.error),
          })
        : null,
    ...statFigures(stats.state === "ready" ? stats.data : null),
    since: stats.state === "ready" ? Date.parse(stats.data.since) : null,
  };

  const front = (
    <div className="board visit" ref={face}>
      <div
        className="board-stage"
        role="region"
        aria-label={title}
        onClick={onStageClick}
        onKeyDown={onStageKeyDown}
      >
        <span id={hint} hidden>
          {t(($) => $.stickerBoard.artistBoard.hint)}
        </span>
        {board.state === "ready" && stickers.length === 0 && (
          <div className="board-blank">
            <span className="board-blank-cut" aria-hidden />
            <span className="board-blank-note">
              {t(($) => $.stickerBoard.artistBoard.blank, { name: handle })}
            </span>
          </div>
        )}
        {board.state === "failed" && (
          <div className="board-blank" role="alert">
            <span className="board-blank-note">
              {t(($) => $.stickerBoard.artistBoard.didntLoad, {
                name: handle,
                reason: errorReason(board.error),
              })}
            </span>
            <LabelButton size="sm" onClick={board.retry}>
              {t(($) => $.stickerBoard.tryAgain)}
            </LabelButton>
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
              position={i + 1}
              setSize={stickers.length}
              hintId={hint}
              foil={s.artist.id !== person.id}
              veiled={veiledFor(s, myAge)}
              by={s.artist.id !== person.id ? artistName(s.artist) : undefined}
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
        aria-label={t(($) => $.stickerBoard.artistBoard.theirStats, { name: owner.name })}
      >
        <PhotoSticker src={owner.pictureUrl} name={owner.name} size={42} />
        <span className="board-who-name">{owner.name}</span>
      </button>
      <button type="button" className="explore-chip" data-press onClick={onBack}>
        <CaretLeft size={14} />
        {t(($) => $.stickerBoard.artistBoard.explore)}
      </button>

      {menuSticker && (
        <div
          className="sticker-menu"
          style={menuSpot(menuSticker)}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {menuSticker.artist.id !== person.id && <ArtistChip artist={menuSticker.artist} />}
          <div className="sticker-menu-actions">
            <LabelButton
              size="sm"
              icon={<ViewIcon />}
              onClick={() => {
                setViewing(menuSticker);
                setSelected(null);
              }}
            >
              {t(($) => $.stickerBoard.artistBoard.view)}
            </LabelButton>
            <LabelButton
              size="sm"
              tone="grape"
              icon={<OfferIcon />}
              onClick={() => {
                setOffering(menuSticker);
                setSelected(null);
              }}
            >
              {t(($) => $.stickerBoard.artistBoard.offer)}
            </LabelButton>
          </div>
        </div>
      )}

      {/* Give takes Draw's slot as the board's one key. */}
      <span className="board-draw">
        <Key
          size="compact"
          tone="aqua"
          icon={<GiveIcon />}
          onClick={() => {
            setSelected(null);
            setGiving(true);
          }}
        >
          {t(($) => $.stickerBoard.artistBoard.give)}
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
            figures={figures}
            onFlipBack={() => turn(false)}
            flipBackRef={flipBack}
          />
        }
      />

      {viewing && <StickerView sticker={viewing} owner={owner} onClose={() => setViewing(null)} />}
      {giving && (
        <GiveSheet
          to={person.handle ?? owner.name}
          toId={person.id}
          toAgeStatus={person.ageStatus}
          onClose={() => setGiving(false)}
        />
      )}
      {offering && (
        <OfferSheet sticker={offering} holder={owner} onClose={() => setOffering(null)} />
      )}
    </div>
  );
}
