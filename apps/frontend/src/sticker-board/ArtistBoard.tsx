import { CaretLeft, CaretRight, GiveIcon } from "../icons";
import { useMyNsfwOptIn, veiledFor } from "../stickers/nsfw";
import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import type { Person } from "@drawing-app/api/client";
import { useApiQuery } from "../api/useApiQuery";
import { toPerson, type PersonView } from "../api/views";
import { GiveSheet } from "../giving/GiveSheet";
import { errorDetail, errorMessage, problemOf } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import { ArtistChip } from "../stickers/ArtistChip";
import { Duration } from "../stickers/Duration";
import { formatHandle, formatNo } from "../stickers/format";
import { Handle } from "../stickers/Handle";
import { useLight } from "../stickers/light";
import { StickerFigure } from "../stickers/StickerFigure";
import { ErrorLine } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import { useLargeScreen } from "../ui/largeScreen";
import { PhotoSticker } from "../ui/PhotoSticker";
import { QuietLink } from "../ui/QuietLink";
import { TabsLead } from "../ui/TabsLead";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import { ArtistChipLayer } from "./ArtistChipLayer";
import { markGreeted, owesGreeting } from "./artistChipGreeting";
import { onTheBoard, shownIn, toBoardSticker, type BoardStickerView } from "./boardSticker";
import { laidOutForVisitor } from "./largeLayout";
import { boxOf, fieldOf, kept, stickerBox, toPx, type Box, type Field } from "./placement";
import { PlacedSticker } from "./PlacedSticker";
import { AddressDialog } from "./stat-board/AddressDialog";
import { AddressPapers } from "./stat-board/AddressPapers";
import type { ChainAddress } from "./stat-board/addresses";
import { BoardFlip } from "./stat-board/BoardFlip";
import { StatCork, type CorkFigures, type StatCorkHandle } from "./stat-board/StatCork";
import { statFigures } from "./stat-board/statFigures";
import { focusStep, readingOrder } from "./stickerOrder";
import { StickerToolbar } from "./StickerToolbar";
import { useBoardLayout, useBoardSize } from "./useBoardSize";
import "./ArtistBoard.css";

interface Props {
  /** Whose board it is, as Explore found them. */
  person: Person;
  onBack: () => void;
}

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
  returnFocus,
}: {
  sticker: BoardStickerView;
  owner: PersonView;
  onClose: () => void;
  /** Where focus goes once it closes: the sticker it opened from. */
  returnFocus: () => HTMLElement | null;
}) {
  const { t } = useTranslation();
  const drawnByOwner = sticker.artist.id === owner.id;
  const optedIn = useMyNsfwOptIn();
  const root = useRef<HTMLDivElement>(null);
  useBackToClose(true, onClose);
  useFocusTrap(root, { onEscape: onClose, returnFocus });
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
          kyotoSeika={sticker.kyotoSeikaSubjects !== null}
          veiled={veiledFor(sticker, optedIn)}
          className="visit-view-art"
        />
        <h2>{formatNo(sticker.no)}</h2>
        <div className="visit-view-meta fine">
          <Trans
            i18nKey={($) => $.stickerBoard.artistBoard.drawnIn}
            components={{
              duration: <Duration seconds={sticker.timeUsed} />,
              artist: <Handle name={artistName(sticker.artist)} />,
            }}
          />
        </div>
        {!drawnByOwner && <ArtistChip artist={sticker.artist} wrap />}
        <div className="visit-view-perf" />
        <QuietLink onClick={onClose}>{t(($) => $.stickerBoard.artistBoard.close)}</QuietLink>
      </div>
    </div>
  );
}

/**
 * Someone else's Sticker Board, read only, opened from Explore. Their stickers sit where they
 * stuck them, foil on the ones someone else drew; their name turns it over to their stat board.
 * The keys work as on your board: one Tab stop, arrows between stickers, Enter selects one and
 * puts its toolbar next in Tab order, Escape lets go.
 */
export function ArtistBoard({ person, onBack }: Props) {
  const { t } = useTranslation();
  const layout = useBoardLayout();
  const owner = toPerson(person);
  const optedIn = useMyNsfwOptIn();
  const handle = person.handle ? formatHandle(person.handle) : owner.name;
  const title = t(($) => $.stickerBoard.artistBoard.title, { name: handle });
  const board = useApiQuery(`sticker-board/${person.id}`, (api) => api.stickerBoard(person.id));
  const stats = useApiQuery(`user-stats/${person.id}`, (api) => api.userStats(person.id));
  const address = useApiQuery(`sui-address/${person.id}`, (api) => api.suiAddress(person.id));
  const reduced = useReducedMotion();
  const hints = useId();
  const face = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const nameButton = useRef<HTMLButtonElement>(null);
  const giveSlot = useRef<HTMLSpanElement>(null);
  /** The Give key that opened the give sheet, which focus returns to; a tap may not have focused it. */
  const giveKey = useRef<HTMLButtonElement | null>(null);
  const flipBack = useRef<HTMLButtonElement>(null);
  const cork = useRef<StatCorkHandle>(null);
  const suiPaper = useRef<HTMLButtonElement>(null);
  /** Their Sui address held up in the address dialog. */
  const [holdingAddress, setHoldingAddress] = useState(false);
  const size = useBoardSize(face, layout);
  /** On a large screen Give stands at the tab strip's left end (ui/TabsLead.tsx). */
  const large = useLargeScreen();
  /** Give's box on the board, which a sticker's toolbar keeps clear of. */
  const [give, setGive] = useState<Box | null>(null);
  const [turned, setTurned] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  /** The sticker last focused, which Tab comes back to. */
  const [tabStop, setTabStop] = useState<string | null>(null);
  const [viewing, setViewing] = useState<BoardStickerView | null>(null);
  const [giving, setGiving] = useState(false);
  /** Their foil stickers' artist chips have played on this app open, or a sticker was selected. */
  const [chipsDone, setChipsDone] = useState(() => !owesGreeting(person.id));
  useLight(!turned);

  // It opens over Explore, which goes inert, so focus starts on their name.
  useEffect(() => {
    nameButton.current?.focus({ preventScroll: true });
  }, []);

  // In the tabs' row Give is off the board, so the toolbar has no Give to keep clear of.
  useLayoutEffect(() => {
    const key = giveSlot.current;
    if (!key) return;
    const measure = () => setGive((was) => (large ? null : kept(was, boxOf(key))));
    const observer = new ResizeObserver(measure);
    observer.observe(key);
    measure();
    return () => observer.disconnect();
  }, [size, large]);

  // What's on their board in the layout this screen shows, bottom of the stack first.
  const stickers = useMemo(
    () =>
      shownIn(
        layout,
        laidOutForVisitor(
          (board.state === "ready" ? board.data.boardStickers : []).map(toBoardSticker),
          layout,
          size,
        ),
      )
        .filter(onTheBoard)
        .sort((a, b) => a.placement.z - b.placement.z),
    [board, layout, size],
  );
  const field = size && visitField(size.W, size.H);
  // Screen readers and the arrow keys take the stickers in reading order, which is the DOM's too.
  const order = field
    ? readingOrder(stickers.map((s) => ({ id: s.id, ...toPx(field, s.placement) })))
    : [];
  const inOrder = order.flatMap((id) => stickers.filter((s) => s.id === id));
  const tabbable = [tabStop, selected].find((id) => id && order.includes(id)) ?? order[0];
  const byOther = (s: BoardStickerView) => s.artist.id !== person.id;
  const chips =
    chipsDone || board.state === "failed" || !field || !size
      ? []
      : stickers.filter(byOther).map((s) => ({
          id: s.id,
          artist: s.artist,
          box: stickerBox(field, size.U, s.placement, s),
        }));
  // The greeting is spent as it starts, so coming back to their board, or leaving early, doesn't replay it.
  const greeting = chips.length > 0;
  useEffect(() => {
    if (greeting) markGreeted(person.id);
  }, [greeting, person.id]);

  // LINE's header shows the page title.
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

  const turn = (over: boolean) => {
    setSelected(null);
    setTurned(over);
  };
  // Back turns the stat board to its front, as on your own board.
  useBackToClose(turned, () => turn(false));

  const stickerEl = (id: string) =>
    stage.current?.querySelector<HTMLElement>(`[data-sticker-id="${CSS.escape(id)}"]`) ?? null;
  const stickerAt = (target: EventTarget) => {
    const el = target instanceof Element ? target.closest<HTMLElement>(".placed-sticker") : null;
    return el?.dataset.stickerId === undefined ? null : { id: el.dataset.stickerId, el };
  };

  // A tap selects a sticker and shows its toolbar, or lets go of it; so does a tap on bare board.
  const onStageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof Element && e.target.closest(".sticker-toolbar")) return;
    const tapped = stickerAt(e.target);
    if (!tapped || tapped.id === selected) {
      setSelected(null);
      return;
    }
    setSelected(tapped.id);
    setChipsDone(true);
    tapped.el.focus({ preventScroll: true, focusVisible: false });
  };
  const onStageKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const from = stickerAt(e.target);
    if (!from || !field) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected(from.id === selected ? null : from.id);
      setChipsDone(true);
    } else if (e.key === "Escape") {
      if (selected) setSelected(null);
    } else {
      const points = stickers.map((s) => ({ id: s.id, ...toPx(field, s.placement) }));
      const next = focusStep(points, from.id, e.key);
      if (next === undefined) return;
      e.preventDefault();
      stickerEl(next)?.focus();
    }
  };
  const onStageFocus = (e: FocusEvent<HTMLDivElement>) => {
    const focused = stickerAt(e.target);
    if (focused) setTabStop(focused.id);
  };

  const statsProblem =
    stats.state === "failed" ? { ...problemOf(stats.error), retry: stats.retry } : null;
  /** Their Sui address paper; none while they have no wallet. */
  const sui: ChainAddress | null =
    address.state === "loading"
      ? { state: "loading" }
      : address.state === "failed"
        ? { state: "failed", retry: address.retry }
        : address.data === null
          ? null
          : { state: "ready", address: address.data };
  const held = holdingAddress && sui?.state === "ready" ? sui.address : null;
  if (holdingAddress && !held) setHoldingAddress(false);

  const figures: CorkFigures = {
    name: owner.name,
    handle: person.handle ?? owner.name,
    own: false,
    loading: stats.state === "loading",
    failure: statsProblem,
    ...statFigures(stats.state === "ready" ? stats.data : null),
    since: stats.state === "ready" ? Date.parse(stats.data.since) : null,
  };

  const backToExplore = (
    <button
      type="button"
      className="explore-chip"
      data-press
      onClick={onBack}
      aria-label={t(($) => $.stickerBoard.artistBoard.backToExplore)}
    >
      <CaretLeft size={14} />
      {t(($) => $.stickerBoard.artistBoard.explore)}
    </button>
  );

  // Give takes Draw's slot as the board's one key; on a large screen it stands in the tabs' row, where
  // it can't turn away with the board, so it hides.
  const giveKeyGroup = (
    <span
      ref={giveSlot}
      className={`board-draw ${large && turned ? "is-away" : ""}`}
      inert={large && turned}
    >
      <Key
        size="compact"
        tone="aqua"
        icon={<GiveIcon />}
        onClick={(e) => {
          giveKey.current = e.currentTarget;
          setSelected(null);
          setGiving(true);
        }}
      >
        {t(($) => $.stickerBoard.artistBoard.give)}
      </Key>
    </span>
  );

  const front = (
    <div className="board visit" ref={face} data-resting={turned ? "" : undefined}>
      {/* Their name, the Explore chip and Give come before the stickers, so Tab reaches them first. A
          large screen has no chip: the Explore tab, lit while you visit, is the way back there. */}
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
        <CaretRight className="board-who-cue" size={14} weight="bold" aria-hidden />
      </button>
      {layout === "phone" && backToExplore}

      <TabsLead>{giveKeyGroup}</TabsLead>

      <div
        className="board-stage"
        ref={stage}
        role="region"
        aria-label={title}
        onClick={onStageClick}
        onKeyDown={onStageKeyDown}
        onFocus={onStageFocus}
      >
        {/* Descriptions only: hidden from reading, still read out for the sticker that names them. */}
        <span id={`${hints}-focus`} hidden>
          {t(($) => $.stickerBoard.artistBoard.focusHint)}
        </span>
        <span id={`${hints}-selected`} hidden>
          {t(($) => $.stickerBoard.artistBoard.selectedHint)}
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
          <div className="board-blank board-problem">
            <ErrorLine detail={errorDetail(board.error)} onRetry={board.retry}>
              {t(($) => $.stickerBoard.artistBoard.didntLoad, {
                name: handle,
                reason: errorMessage(board.error),
              })}
            </ErrorLine>
          </div>
        )}
        {field &&
          size &&
          inOrder.map((s) => (
            <Fragment key={s.id}>
              <PlacedSticker
                sticker={s}
                field={field}
                unit={size.U}
                stack={s.id === selected ? stickers.length : stickers.indexOf(s)}
                selected={s.id === selected}
                knobBelow={false}
                landing={false}
                onLanded={() => {}}
                reduced={reduced}
                tabbable={s.id === tabbable}
                position={order.indexOf(s.id) + 1}
                setSize={order.length}
                hintId={`${hints}-${s.id === selected ? "selected" : "focus"}`}
                foil={byOther(s)}
                veiled={veiledFor(s, optedIn)}
                by={byOther(s) ? artistName(s.artist) : undefined}
              />
              {/* Right after its sticker, so Tab reaches it next. */}
              {s.id === selected && (
                <StickerToolbar
                  label={formatNo(s.no)}
                  sticker={{ ...stickerBox(field, size.U, s.placement, s), r: s.placement.r }}
                  board={size}
                  knobBelow={false}
                  clearOf={give}
                  onView={() => setViewing(s)}
                  {...(byOther(s) && { artist: s.artist })}
                  onEscape={() => stickerEl(s.id)?.focus()}
                  reduced={reduced}
                />
              )}
            </Fragment>
          ))}
      </div>

      {chips.length > 0 && size && (
        <ArtistChipLayer
          chips={chips}
          board={size}
          onDone={() => setChipsDone(true)}
          reduced={reduced}
        />
      )}
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
            side={
              sui && (
                <AddressPapers
                  sui={sui}
                  whose={owner.name}
                  lifted={held !== null}
                  paperRef={suiPaper}
                  onOpen={() => setHoldingAddress(true)}
                />
              )
            }
          />
        }
      />
      {/* Beside the cork rather than in it, so its taps and Escape never reach the cork's own. */}
      {held && (
        <AddressDialog
          address={held}
          whose={owner.name}
          from={suiPaper}
          onClose={() => setHoldingAddress(false)}
        />
      )}

      {viewing && (
        <StickerView
          sticker={viewing}
          owner={owner}
          onClose={() => setViewing(null)}
          returnFocus={() => stickerEl(viewing.id)}
        />
      )}
      {giving && (
        <GiveSheet
          to={person.handle ?? owner.name}
          toId={person.id}
          toNsfwOptIn={person.nsfwOptIn}
          onClose={() => setGiving(false)}
          returnFocus={() => giveKey.current}
        />
      )}
    </div>
  );
}
