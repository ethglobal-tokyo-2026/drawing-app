import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { useApi } from "../api/useApi";
import { useApiQuery } from "../api/useApiQuery";
import { toApiPlacement, type PersonView } from "../api/views";
import { useGiftSender } from "../giving/useGiftSender";
import { useStickerGifts } from "../giving/useStickerGifts";
import { DrawIcon } from "../icons/DrawIcon";
import { useIdentity } from "../identity/useIdentity";
import { LIFF_ID } from "../line/liff";
import { formatNo } from "../stickers/format";
import { useLight } from "../stickers/light";
import { playStick } from "../stickers/stick";
import type { Placement } from "../stickers/stickerStorage";
import { TicketCounts } from "../tickets/TicketCount";
import { describeTickets, ticketDay } from "../tickets/tickets";
import { useTicketState } from "../tickets/useTickets";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { lazyWithPreload, usePreloadWhenIdle } from "../ui/lazyWithPreload";
import { PhotoSticker } from "../ui/PhotoSticker";
import { useBackToClose } from "../ui/useBackToClose";
import { useReducedMotion } from "../ui/useReducedMotion";
import { normalizeTurn } from "./boardGesture";
import { placeUnplaced, toBoardSticker, type BoardSticker } from "./boardSticker";
import { PlacedSticker } from "./PlacedSticker";
import { GivenStickerSilhouette } from "./GivenStickerSilhouette";
import {
  FIRST_SPOT,
  fieldOf,
  freeSpot,
  knobHidden,
  nextZ,
  sizeOf,
  stickerBox,
  toFrac,
  toPx,
  type Box,
} from "./placement";
import { BoardFlip } from "./stat-board/BoardFlip";
import type { StatBoardHandle } from "./stat-board/StatBoard";
import { readingOrder } from "./stickerOrder";
import { StickerToolbar } from "./StickerToolbar";
import type { StickerTrayHandle } from "./tray/StickerTray";
import type { TrayBoard } from "./tray/trayEngine";
import { useBoardGestures } from "./useBoardGestures";
import "./StickerBoard.css";

// The Zipper shows on the board at rest, so the sticker tray's code starts loading with the board's.
const StickerTray = lazyWithPreload("the sticker tray", () =>
  import("./tray/StickerTray").then((m) => m.StickerTray),
);
void StickerTray.preload();
// Opened from the board, so their code loads once it's up.
const StickerDetail = lazyWithPreload("the sticker detail", () =>
  import("./StickerDetail").then((m) => m.StickerDetail),
);
const Giving = lazyWithPreload("Giving", () => import("../giving/Giving").then((m) => m.Giving));
// Opened from a received sticker's detail.
const GratitudeMiniGamePlaceholder = lazyWithPreload("the gratitude Mini-game", () =>
  import("../gratitude/GratitudeMiniGamePlaceholder").then((m) => m.GratitudeMiniGamePlaceholder),
);
const StatBoard = lazyWithPreload("the stat board", () =>
  import("./stat-board/StatBoard").then((m) => m.StatBoard),
);
// Your name turns the board over from the moment it shows, so the stat board's code loads with the board's.
void StatBoard.preload();
const OPENED_FROM_BOARD = [StickerDetail, Giving, StatBoard];

interface Props {
  /** The sticker that was just sealed; it lands on the board the first time the board shows it. */
  freshId?: string;
  onDraw: () => void;
}

/** Stickers that have landed this session. */
const landed = new Set<string>();
/** Stickers touched this session, which press their lifted corner down. */
const settled = new Set<string>();

/**
 * The newest of today's stickers that hasn't been touched: it has a lifted corner, which passes to
 * the next-newest once it's touched.
 */
function curledToday(stickers: readonly BoardSticker[], now: Date) {
  const today = ticketDay(now);
  let newest: BoardSticker | undefined;
  for (const s of stickers)
    if (
      !settled.has(s.id) &&
      ticketDay(new Date(s.createdAt)) === today &&
      (!newest || s.createdAt > newest.createdAt)
    )
      newest = s;
  return newest?.id;
}

const round4 = (v: number) => Number(v.toFixed(4));

/** An element's box on the board, which is its offset parent. */
const boxOf = (el: HTMLElement): Box => ({
  left: el.offsetLeft,
  top: el.offsetTop,
  right: el.offsetLeft + el.offsetWidth,
  bottom: el.offsetTop + el.offsetHeight,
});

/** The box as it was when it hasn't moved, so measuring again doesn't re-render the board. */
const kept = (was: Box | null, now: Box) =>
  was?.left === now.left &&
  was.top === now.top &&
  was.right === now.right &&
  was.bottom === now.bottom
    ? was
    : now;

const reasonOf = (error: unknown) =>
  error instanceof Error && error.message ? error.message : String(error);

/** "No.0001", "No.0001 and No.0002", "No.0001, No.0002 and No.0003". */
const listed = (names: readonly string[]) =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/** The stacking order that keeps a sticker on top: its own when it's there already. */
function zOnTop(stickers: readonly BoardSticker[], id: string) {
  const own = stickers.find((s) => s.id === id)?.placement.z ?? 0;
  const top = nextZ(stickers.filter((s) => s.id !== id).map((s) => s.placement));
  return own >= top ? own : top;
}

/**
 * Each sticker's place in the stack, from the bottom. The board stacks by rank rather than by the
 * stored order, which only grows, so stickers always stay under the header and the toolbar.
 */
const stackOf = (stickers: readonly BoardSticker[]) =>
  new Map(
    [...stickers]
      .sort((a, b) => a.placement.z - b.placement.z || a.createdAt - b.createdAt)
      .map((s, i) => [s.id, i]),
  );

export function StickerBoard({ freshId, onDraw }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  /** The board's face, which the sticker tray runs down the right edge of. */
  const [face, setFace] = useState<HTMLDivElement | null>(null);
  const tray = useRef<StickerTrayHandle>(null);
  const nameButton = useRef<HTMLButtonElement>(null);
  const drawSlot = useRef<HTMLSpanElement>(null);
  const flipBack = useRef<HTMLButtonElement>(null);
  const statBoard = useRef<StatBoardHandle>(null);
  const api = useApi();
  const board = useApiQuery("sticker-board", (client) => client.stickerBoard());
  // The board's own copy, which moves as stickers do; the next load replaces it.
  const [stickers, setStickers] = useState<BoardSticker[] | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<object | null>(null);
  /** Stickers whose spot didn't save, and why; each goes once a save of it succeeds. */
  const [unsaved, setUnsaved] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  /** The name button's box on the board, which a sticker's knob must stay clear of. */
  const [name, setName] = useState<Box | null>(null);
  /** Draw's box on the board, which the selected sticker's toolbar keeps clear of. */
  const [draw, setDraw] = useState<Box | null>(null);
  const [landingId, setLandingId] = useState(() =>
    freshId && !landed.has(freshId) ? freshId : undefined,
  );
  const [selected, setSelected] = useState<string | null>(null);
  /** The sticker the detail shows, among your stickers or among the ones you gave. */
  const [open, setOpen] = useState<{ id: string; mode: "yours" | "given" } | null>(null);
  const [giving, setGiving] = useState<BoardSticker | null>(null);
  /** A received sticker being thanked, with its gift and giver. */
  const [thanking, setThanking] = useState<{
    giftId: string;
    sticker: BoardSticker;
    giver: PersonView;
  } | null>(null);
  /** The board is turned over to its stat board. */
  const [turned, setTurned] = useState(false);
  /** The board has turned over before, so its stat board stays mounted for every turn after. */
  const [wasTurned, setWasTurned] = useState(false);
  const me = useIdentity();
  const tickets = useTicketState();
  const gifts = useStickerGifts();
  const giftSender = useGiftSender();
  const reduced = useReducedMotion();
  const hints = useId();
  const idle = usePreloadWhenIdle(OPENED_FROM_BOARD);
  useLight(!turned);

  const save = useCallback(
    (sticker: Pick<BoardSticker, "id" | "no">, placement: Placement) => {
      api.saveStickerPlacement(sticker.id, toApiPlacement(placement)).then(
        () =>
          setUnsaved((was) => {
            if (!was.has(sticker.id)) return was;
            const next = new Map(was);
            next.delete(sticker.id);
            return next;
          }),
        (error: unknown) => {
          console.error(`Saving where ${formatNo(sticker.no)} sits failed`, error);
          setUnsaved((was) => new Map(was).set(sticker.id, reasonOf(error)));
        },
      );
    },
    [api],
  );

  // The board mounts anew on every visit, so its load is its refresh. Each answer replaces the
  // board's copy, and a sticker without a spot gets one, saved so it stays there.
  const [newlyPlaced, setNewlyPlaced] = useState<readonly BoardSticker[]>([]);
  if (board.state === "ready" && board.data !== loadedFrom) {
    const placed: BoardSticker[] = [];
    setLoadedFrom(board.data);
    setStickers(placeUnplaced(board.data.boardStickers.map(toBoardSticker), (s) => placed.push(s)));
    setNewlyPlaced(placed);
  }
  useEffect(() => {
    for (const s of newlyPlaced) save(s, s.placement);
  }, [newlyPlaced, save]);
  const loadError = board.state === "failed" ? board.error.message : null;

  useLayoutEffect(() => {
    const el = stage.current;
    const who = nameButton.current;
    const key = drawSlot.current;
    if (!el || !who || !key) return;
    const measure = () => {
      setSize((was) =>
        was?.W === el.clientWidth && was.H === el.clientHeight
          ? was
          : { W: el.clientWidth, H: el.clientHeight },
      );
      setName((was) => kept(was, boxOf(who)));
      setDraw((was) => kept(was, boxOf(key)));
    };
    // The name's width follows the person's name, which arrives after the board; Draw's, its font.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(who);
    observer.observe(key);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (landingId) landed.add(landingId);
  }, [landingId]);

  // A sticker given away, or on its way, has left the board.
  const away = (s: BoardSticker) => !s.held || gifts.get(s.id)?.state === "sent";
  const onBoard = (stickers ?? []).filter((s) => s.placement.on && !away(s));
  // It leaves its given sticker silhouette where it sat. On its way, it keeps one until the
  // pending gifts badge can hold it.
  const givenSilhouettes = (stickers ?? []).flatMap((s) => {
    const mask = s.urls.mask;
    if (!mask) return [];
    if (s.givenTo)
      return [
        {
          sticker: s,
          mask,
          sentAt: s.givenTo.receivedAt,
          to: s.givenTo.receiver.handle ?? undefined,
        },
      ];
    const gift = gifts.get(s.id);
    return gift?.state === "sent" ? [{ sticker: s, mask, sentAt: gift.sentAt, to: gift.to }] : [];
  });
  const field = useMemo(() => size && fieldOf(size.W, size.H), [size]);
  const landedNow = useCallback(() => setLandingId(undefined), []);

  const setPlacement = (id: string, placement: Placement) =>
    setStickers((list) => list?.map((s) => (s.id === id ? { ...s, placement } : s)) ?? null);

  // Selecting raises a sticker above the rest; the raise is saved with its next move.
  const select = (id: string | null) => {
    setSelected(id);
    if (!id || !stickers) return;
    settled.add(id);
    const sticker = stickers.find((s) => s.id === id);
    const z = zOnTop(stickers, id);
    if (sticker && z !== sticker.placement.z) setPlacement(id, { ...sticker.placement, z });
  };

  // Back into the sticker tray: off the board, with its spot kept for when it comes back out.
  const removeFromBoard = (id: string) => {
    const sticker = stickers?.find((s) => s.id === id);
    if (!sticker) return;
    if (selected === id) setSelected(null);
    const placement = { ...sticker.placement, on: false };
    setPlacement(id, placement);
    save(sticker, placement);
  };

  // Turning over lets go of the selected sticker, so the board comes back without a stray toolbar.
  const turn = (over: boolean) => {
    setTurned(over);
    if (!over) return;
    setWasTurned(true);
    select(null);
  };
  // Back turns the stat board back over, as LINE's Back does on any overlay.
  useBackToClose(turned, () => turn(false));

  const { hold, stow, tabStop } = useBoardGestures({
    stage,
    stickers: onBoard,
    field,
    size,
    selected,
    reduced,
    tray,
    onSelect: select,
    onOpen: (id) => setOpen({ id, mode: "yours" }),
    onCommit: (id, placement) => {
      const sticker = stickers?.find((s) => s.id === id);
      if (!stickers || !sticker) return;
      const moved = { ...placement, z: zOnTop(stickers, id) };
      setPlacement(id, moved);
      save(sticker, moved);
    },
    onRemove: removeFromBoard,
  });
  const stickerEl = (id: string) =>
    stage.current?.querySelector<HTMLElement>(`[data-sticker-id="${CSS.escape(id)}"]`) ?? null;
  // What the sticker tray asks of the board, all in board pixels.
  const trayBoard: TrayBoard = {
    stickerRect: (id) => {
      const s = onBoard.find((x) => x.id === id);
      if (!s || !field || !size) return null;
      const { x, y, w, h } = stickerBox(field, size.W, s.placement, s);
      return { x, y, w, h, r: s.placement.r };
    },
    sizeFor: (id) => {
      const s = stickers?.find((x) => x.id === id);
      return s && size ? sizeOf(size.W, s.placement.s, s) : { w: 0, h: 0 };
    },
    place: (id, at) => {
      const sticker = stickers?.find((s) => s.id === id);
      if (!stickers || !sticker || !field) return Promise.resolve(null);
      const spot = at
        ? { ...toFrac(field, at), s: sticker.placement.s, r: normalizeTurn(at.r) }
        : freeSpot(onBoard.map((s) => s.placement));
      const placement: Placement = {
        on: true,
        x: round4(spot.x),
        y: round4(spot.y),
        s: spot.s,
        r: spot.r,
        z: zOnTop(stickers, id),
      };
      // Drawn at once, so the tray can hand the sticker over where it lands.
      flushSync(() => setPlacement(id, placement));
      save(sticker, placement);
      const el = stickerEl(id);
      // Dropped, it presses flat; a tapped sticker's landing is the tray's to play.
      const lift = el?.querySelector<HTMLElement>(".placed-sticker__lift");
      if (at && lift) void playStick(lift, { reduced });
      return Promise.resolve(el);
    },
    remove: removeFromBoard,
    pulse: (id) => {
      const lift = stickerEl(id)?.querySelector<HTMLElement>(".placed-sticker__lift");
      if (!lift) return;
      if (reduced)
        lift.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 400 });
      else
        lift.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.12) rotate(-2deg)", offset: 0.34 },
            { transform: "scale(0.98)", offset: 0.7 },
            { transform: "scale(1)" },
          ],
          { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
        );
    },
  };
  const stack = stackOf(onBoard);
  // Screen readers and the arrow keys take the stickers in reading order, which is the DOM's too.
  const order = field
    ? readingOrder(onBoard.map((s) => ({ id: s.id, ...toPx(field, s.placement) })))
    : [];
  const inOrder = order.flatMap((id) => onBoard.filter((s) => s.id === id));
  // The stickers' one Tab stop: the one last focused, else the selected one, else the first.
  const tabbable = [tabStop, selected].find((id) => id && order.includes(id)) ?? order[0];
  const chosen = onBoard.find((s) => s.id === selected);
  const chosenBox = chosen && field && size && stickerBox(field, size.W, chosen.placement, chosen);
  // Where the knob would sit off the board or under the name, it hangs below the sticker.
  const knobBelow = Boolean(
    chosen && chosenBox && name && knobHidden({ ...chosenBox, r: chosen.placement.r }, name),
  );
  const curled = curledToday(onBoard, new Date());
  // The empty board's dashed spot, where the first sticker lands; a load error shows in it too.
  const blankAt = field && toPx(field, FIRST_SPOT);
  const blankStyle = blankAt ? { left: blankAt.x, top: blankAt.y } : undefined;
  // Until the first sticker, Draw says where to start.
  const firstVisit = stickers?.length === 0;
  const unsavedStickers = (stickers ?? []).filter((s) => unsaved.has(s.id));

  const front = (
    <div className="board" ref={setFace}>
      {/* Your name and Draw come before the stickers, so Tab reaches them first. */}
      <button
        ref={nameButton}
        className="board-who"
        onClick={() => turn(!turned)}
        aria-expanded={turned}
        aria-haspopup="dialog"
        aria-label={`${me.displayName}: your stats`}
      >
        <PhotoSticker src={me.pictureUrl} name={me.displayName} size={42} />
        <span className="board-who-name">{me.displayName}</span>
      </button>

      {/* The slot carries the first-sticker hop and ring, so the key keeps its own lip and press. */}
      <span ref={drawSlot} className={`board-draw ${firstVisit ? "is-fresh" : ""}`}>
        <Key
          size="compact"
          icon={<DrawIcon />}
          onClick={onDraw}
          aria-label={`Draw a new sticker: you have ${describeTickets(tickets)}`}
        >
          Draw
          <TicketCounts state={tickets} className="ticket-counts--on-key" />
        </Key>
      </span>
      {firstVisit && (
        <span className="board-nudge" aria-hidden>
          Make your first sticker
        </span>
      )}

      <div className="board-stage" ref={stage} role="region" aria-label="Sticker board">
        {/* Descriptions only: hidden from reading, still read out for the sticker that names them. */}
        <span id={`${hints}-focus`} hidden>
          Enter selects it. Arrow keys go to the other stickers.
        </span>
        <span id={`${hints}-selected`} hidden>
          Selected. Enter opens it, and Tab reaches its toolbar. Arrow keys move it, [ and ] turn
          it, minus and plus resize it, Delete takes it off the board, and Escape lets go of it.
        </span>
        {stickers && onBoard.length === 0 && givenSilhouettes.length === 0 && (
          <div className="board-blank" style={blankStyle}>
            <span className="board-blank-cut" aria-hidden />
            <span className="board-blank-note">Stickers you make or receive land here.</span>
          </div>
        )}
        {field &&
          size &&
          givenSilhouettes.map((o) => (
            <GivenStickerSilhouette
              key={o.sticker.id}
              {...o}
              field={field}
              boardWidth={size.W}
              onOpen={() => setOpen({ id: o.sticker.id, mode: o.sticker.held ? "yours" : "given" })}
            />
          ))}
        {field &&
          size &&
          inOrder.map((s) => (
            <Fragment key={s.id}>
              <PlacedSticker
                sticker={s}
                field={field}
                boardWidth={size.W}
                stack={stack.get(s.id) ?? 0}
                curled={s.id === curled}
                selected={s.id === selected}
                knobBelow={s.id === selected && knobBelow}
                held={hold?.id === s.id ? hold.kind : undefined}
                landing={s.id === landingId}
                onLanded={landedNow}
                reduced={reduced}
                tabbable={s.id === tabbable}
                position={`${order.indexOf(s.id) + 1} of ${order.length}`}
                hintId={`${hints}-${s.id === selected ? "selected" : "focus"}`}
              />
              {/* Right after its sticker, so Tab reaches it next. */}
              {s.id === selected && !hold && (
                <StickerToolbar
                  label={formatNo(s.no)}
                  sticker={{ ...stickerBox(field, size.W, s.placement, s), r: s.placement.r }}
                  board={size}
                  knobBelow={knobBelow}
                  clearOf={draw}
                  give={giftSender !== null}
                  onGive={() => setGiving(s)}
                  onView={() => setOpen({ id: s.id, mode: "yours" })}
                  onRemove={() => stow(s.id)}
                  onEscape={() =>
                    stage.current
                      ?.querySelector<HTMLElement>(`[data-sticker-id="${CSS.escape(s.id)}"]`)
                      ?.focus()
                  }
                  reduced={reduced}
                />
              )}
            </Fragment>
          ))}
      </div>

      {stickers && (
        <Suspense fallback={null}>
          <StickerTray ref={tray} board={face} stickers={stickers} gifts={gifts} api={trayBoard} />
        </Suspense>
      )}

      {loadError && (
        <div className="board-blank board-problem" role="alert" style={blankStyle}>
          <span className="board-blank-cut" aria-hidden />
          <span className="board-blank-note">Your stickers didn’t load.</span>
          <span className="fine board-problem-reason">{loadError}</span>
          <LabelButton
            size="sm"
            onClick={() => {
              if (board.state === "failed") board.retry();
            }}
          >
            Try again
          </LabelButton>
        </div>
      )}

      {unsavedStickers.length > 0 && (
        <div className="board-unsaved" role="alert">
          <p className="board-unsaved-note">
            Couldn’t save where {listed(unsavedStickers.map((s) => formatNo(s.no)))}{" "}
            {unsavedStickers.length === 1 ? "sits" : "sit"}:{" "}
            {[...new Set(unsavedStickers.map((s) => unsaved.get(s.id)))].join("; ")}
          </p>
          <LabelButton
            size="sm"
            onClick={() => unsavedStickers.forEach((s) => save(s, s.placement))}
          >
            Try again
          </LabelButton>
        </div>
      )}

      {giving && giftSender && (
        <Suspense fallback={null}>
          <Giving
            sticker={{ ...giving, url: giving.urls.png }}
            fromHandle={me.handle}
            sender={giftSender}
            liffId={LIFF_ID}
            onClose={(sent) => {
              setGiving(null);
              // Given, it has left the board, and the board loads where its gift is.
              if (sent) {
                setSelected(null);
                if (board.state === "ready") board.refresh();
              }
            }}
          />
        </Suspense>
      )}

      {open && (
        <Suspense fallback={null}>
          <StickerDetail
            // In the order they arrived, as the board loads them.
            stickers={(stickers ?? []).filter((s) => (open.mode === "given") !== s.held)}
            startId={open.id}
            mode={open.mode}
            // It lifts off from where the sticker sits: on the board, or its given sticker silhouette.
            originOf={(id) =>
              stickerEl(id)?.querySelector<HTMLElement>(
                ".placed-sticker__lift, .given-sticker-silhouette__art",
              ) ?? null
            }
            onClose={() => setOpen(null)}
            // Back to the sticker it opened from: on the board, or its given sticker silhouette.
            returnFocus={() =>
              stage.current?.querySelector<HTMLElement>(
                `[data-sticker-id="${CSS.escape(open.id)}"]`,
              ) ?? null
            }
            onGive={
              giftSender
                ? (s) => {
                    setOpen(null);
                    setGiving(s);
                  }
                : undefined
            }
            onSendGratitude={(gift, sticker, giver) =>
              setThanking({ giftId: gift.id, sticker, giver })
            }
          />
        </Suspense>
      )}

      {thanking && (
        <Suspense fallback={null}>
          <GratitudeMiniGamePlaceholder
            giftId={thanking.giftId}
            sticker={{
              id: thanking.sticker.id,
              no: thanking.sticker.no,
              timeUsed: thanking.sticker.timeUsed,
              createdAt: thanking.sticker.createdAt,
              urls: thanking.sticker.urls,
              width: thanking.sticker.width,
              height: thanking.sticker.height,
            }}
            giver={{
              handle: thanking.giver.handle ?? thanking.giver.name,
              displayName: thanking.giver.name,
              ...(thanking.giver.pictureUrl && { pictureUrl: thanking.giver.pictureUrl }),
            }}
            onClose={() => setThanking(null)}
          />
        </Suspense>
      )}
    </div>
  );

  return (
    <BoardFlip
      turned={turned}
      onTurnedChange={turn}
      onTurnEnd={(over) => {
        if (over) statBoard.current?.settle();
      }}
      frontFocus={nameButton}
      backFocus={flipBack}
      front={front}
      back={
        // Mounted once the board is idle, or as it first turns over, and kept from then on.
        (idle || wasTurned) && (
          <Suspense fallback={null}>
            <StatBoard
              ref={statBoard}
              stickers={loadError ? null : (stickers ?? [])}
              gifts={gifts}
              onFlipBack={() => turn(false)}
              flipBackRef={flipBack}
            />
          </Suspense>
        )
      }
    />
  );
}
