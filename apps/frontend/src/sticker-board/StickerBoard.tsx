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
import { apiError, type ApiError } from "../api/apiClient";
import { useApi } from "../api/useApi";
import { useApiQuery } from "../api/useApiQuery";
import { toPerson, toSticker, type PersonView, type StickerView } from "../api/views";
import { GiftReceivedNotice } from "../giving/GiftReceivedNotice";
import { markNoticed, newestUnnoticed } from "../giving/noticedGifts";
import { PendingGiftsNotificationBadge } from "../giving/PendingGiftsNotificationBadge";
import { useGiftSender } from "../giving/useGiftSender";
import { useStickerGifts } from "../giving/useStickerGifts";
import { FEEL_CONFIG } from "../gratitude/gameConfig";
import { GratitudeMiniGame } from "../gratitude/GratitudeMiniGame";
import { readMiniGameDemoSettings } from "../gratitude/miniGameDemoSettings";
import { DrawIcon } from "../icons/DrawIcon";
import { useIdentity } from "../identity/useIdentity";
import { LIFF_ID } from "../line/liff";
import { formatHandle, formatNo } from "../stickers/format";
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
import {
  onItsWay,
  placeUnplaced,
  toApiPlacement,
  toBoardSticker,
  type BoardSticker,
  type BoardStickerView,
} from "./boardSticker";
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
import { SendGratitudeSheet } from "../receiving/SendGratitudeSheet";
import { ArtistChipLayer } from "./ArtistChipLayer";
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

const reasonOf = (error: ApiError) => error.detail ?? error.code;

/** The stat board reads records' dates, never their images. */
const NO_IMAGE = new Blob();

interface LoadedBoard {
  owner: PersonView;
  stickers: BoardStickerView[];
}

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

/** Received stickers already asked about thanks this session, so the question comes once. */
const askedToThank = new Set<string>();

/** Someone as the gratitude Mini-game names them. */
const asGiver = (p: PersonView) => ({
  handle: p.handle ?? p.name,
  displayName: p.name,
  ...(p.pictureUrl && { pictureUrl: p.pictureUrl }),
});

/** A board sticker as the gift screens draw it. */
const viewOf = (s: BoardStickerView): StickerView => ({
  id: s.id,
  no: s.no,
  artist: s.artist,
  timeUsed: s.timeUsed,
  width: s.width,
  height: s.height,
  outline: s.outline ?? "",
  urls: s.urls,
  sealedAt: s.createdAt,
});

type Thanking = { sticker: BoardSticker; giver: ReturnType<typeof asGiver> };

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
  const [stickers, setStickers] = useState<BoardStickerView[] | null>(null);
  /** The load the stickers came from, and whose board it is: a sticker someone else drew wears foil. */
  const [adopted, setAdopted] = useState<LoadedBoard | null>(null);
  const owner = adopted?.owner ?? null;
  /** The stickers as last drawn, for a reload to keep the spots the board has given them. */
  const latestStickers = useRef(stickers);
  useLayoutEffect(() => {
    latestStickers.current = stickers;
  });
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
  /** The board is turned over to its stat board. */
  const [turned, setTurned] = useState(false);
  /** The board has turned over before, so its stat board stays mounted for every turn after. */
  const [wasTurned, setWasTurned] = useState(false);
  /** The sticker the gratitude mini-game is open for, from the stat board's developer slip. */
  const [thanking, setThanking] = useState<Thanking | null>(null);
  /** A received gift's notice, closed: the silhouettes say the rest. */
  const [noticeClosed, setNoticeClosed] = useState(false);
  /** A sticker that just reached you, and who to thank for it, when it hasn't been thanked. */
  const [owed, setOwed] = useState<{ gift: { id: string }; giver: PersonView } | null>(null);
  /** The first-load artist chips have played, or a sticker was selected, which clears them. */
  const [chipsDone, setChipsDone] = useState(false);
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
          const failure = apiError(error);
          console.error(`Saving where ${formatNo(sticker.no)} sits failed`, failure);
          setUnsaved((was) => new Map(was).set(sticker.id, reasonOf(failure)));
        },
      );
    },
    [api],
  );

  // The board mounts anew on every visit, so its load is its refresh. A sticker the board has never
  // placed gets a spot as it loads, saved so it stays there.
  const board = useApiQuery("sticker-board", async (client): Promise<LoadedBoard> => {
    const data = await client.stickerBoard();
    const { stickers: list, placed } = placeUnplaced(
      data.boardStickers.map(toBoardSticker),
      latestStickers.current ?? [],
    );
    for (const s of placed) save(s, s.placement);
    return { owner: toPerson(data.owner), stickers: list };
  });
  const loaded = board.state === "ready" ? board.data : null;
  if (loaded && loaded !== adopted) {
    setAdopted(loaded);
    // Moves made while it loaded stay.
    setStickers(placeUnplaced(loaded.stickers, stickers ?? []).stickers);
  }

  const pending = useApiQuery("pending-gifts", (client) => client.pendingGifts());
  const onTheirWay =
    pending.state === "ready"
      ? pending.data.gifts
          .filter((p) => p.gift.status === "sent")
          .map((p) => ({ giftId: p.gift.id, sticker: toSticker(p.sticker) }))
      : [];

  // Once per board opening: the newest gift someone received since this device last said so.
  const receivedGifts = (adopted?.stickers ?? []).flatMap((s) =>
    !s.held && s.givenTo
      ? [
          {
            stickerId: s.id,
            receivedAt: s.givenTo.receivedAt,
            sticker: viewOf(s),
            receiver: s.givenTo.receiver,
            ...(s.urls.mask && { mask: s.urls.mask }),
          },
        ]
      : [],
  );
  const notice = noticeClosed ? null : newestUnnoticed(receivedGifts);

  // A sticker that just reached you asks about thanks, when its newest hand-off to you has none.
  useEffect(() => {
    if (!freshId || askedToThank.has(freshId)) return;
    let current = true;
    api.stickerDetail(freshId).then(
      (detail) => {
        const [entry] = detail.transferTrail;
        if (current && entry && entry.receiver.id === detail.owner.id && !entry.gratitude)
          setOwed({ gift: { id: entry.giftId }, giver: toPerson(entry.giver) });
      },
      (error: unknown) =>
        console.error(`Checking whether ${freshId} has been thanked failed`, apiError(error)),
    );
    return () => {
      current = false;
    };
  }, [api, freshId]);

  // The open sticker tray's NEW marks, which the tray takes off at once.
  const markSeen = (ids: readonly string[]) => {
    api.markTraySeen(ids).catch((error: unknown) => {
      console.error(
        `Saving that the sticker tray showed ${ids.join(", ")} failed, so they show NEW again next time`,
        apiError(error),
      );
    });
  };

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

  // A sticker on its way has left the board for the badge.
  const onBoard = (stickers ?? []).filter((s) => s.placement.on && s.held && !onItsWay(s));
  // The gratitude mini-game's demo always thanks whichever sticker landed most recently.
  const newest = onBoard.reduce<BoardSticker | null>(
    (latest, s) => (!latest || s.createdAt > latest.createdAt ? s : latest),
    null,
  );
  // Received, it leaves its given sticker silhouette where it sat, naming who has it.
  const givenSilhouettes = (stickers ?? []).flatMap((s) => {
    const mask = s.urls.mask;
    return !s.held && s.givenTo && mask ? [{ sticker: s, mask, givenTo: s.givenTo }] : [];
  });
  const field = useMemo(() => size && fieldOf(size.W, size.H), [size]);
  const landedNow = useCallback(() => setLandingId(undefined), []);
  /** Drawn by someone other than the board's owner: it wears foil and names its artist. */
  const byOther = (s: BoardStickerView) => owner !== null && s.artist.id !== owner.id;
  const printedArtist = (s: BoardStickerView) =>
    s.artist.handle ? formatHandle(s.artist.handle) : s.artist.name;
  // A received sticker landing names its artist alone; otherwise every foil sticker does, once.
  const landingByOther = onBoard.find((s) => s.id === landingId && byOther(s));
  const chips =
    chipsDone || !field || !size
      ? []
      : onBoard
          .filter((s) => byOther(s) && (!landingByOther || s.id === landingByOther.id))
          .map((s) => ({
            id: s.id,
            artist: s.artist,
            box: stickerBox(field, size.W, s.placement, s),
          }));
  const freshSticker = freshId ? stickers?.find((s) => s.id === freshId) : undefined;

  const setPlacement = (id: string, placement: Placement) =>
    setStickers((list) => list?.map((s) => (s.id === id ? { ...s, placement } : s)) ?? null);

  // Selecting raises a sticker above the rest; the raise is saved with its next move.
  const select = (id: string | null) => {
    setSelected(id);
    if (id) setChipsDone(true);
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

      {onTheirWay.length > 0 && (
        <div className="board-pending">
          <PendingGiftsNotificationBadge
            gifts={onTheirWay}
            onOpen={(id) => setOpen({ id, mode: "yours" })}
          />
        </div>
      )}

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
              onOpen={() => setOpen({ id: o.sticker.id, mode: "given" })}
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
                foil={byOther(s)}
                by={byOther(s) ? printedArtist(s) : undefined}
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
                  {...(byOther(s) && { artist: s.artist })}
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

      {chips.length > 0 && size && (
        <ArtistChipLayer
          chips={chips}
          board={size}
          onDone={() => setChipsDone(true)}
          reduced={reduced}
        />
      )}

      {stickers && owner && (
        <Suspense fallback={null}>
          <StickerTray
            ref={tray}
            board={face}
            stickers={stickers}
            ownerId={owner.id}
            api={trayBoard}
            onSeen={markSeen}
          />
        </Suspense>
      )}

      {board.state === "failed" && (
        <div className="board-blank board-problem" role="alert" style={blankStyle}>
          <span className="board-blank-cut" aria-hidden />
          <span className="board-blank-note">Your stickers didn’t load.</span>
          <span className="fine board-problem-reason">{reasonOf(board.error)}</span>
          <LabelButton size="sm" onClick={board.retry}>
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
              if (!sent) return;
              // Sent, it leaves the board at once, as this device's gift record says, and the reload
              // confirms where it is.
              setSelected(null);
              const gift = gifts.get(giving.id);
              if (gift?.state === "sent")
                setStickers(
                  (list) =>
                    list?.map((s) =>
                      s.id === giving.id
                        ? { ...s, openGift: { id: gift.giftId, status: "sent" } }
                        : s,
                    ) ?? null,
                );
              if (board.state === "ready") board.refresh();
              if (pending.state === "ready") pending.refresh();
            }}
          />
        </Suspense>
      )}

      {notice && (
        <GiftReceivedNotice
          sticker={notice.sticker}
          receiver={notice.receiver}
          receivedAt={notice.receivedAt}
          {...(notice.mask && { mask: notice.mask })}
          onClose={() => {
            markNoticed(receivedGifts);
            setNoticeClosed(true);
          }}
        />
      )}

      {owed && freshSticker && !landingId && !askedToThank.has(freshSticker.id) && (
        <SendGratitudeSheet
          gift={owed.gift}
          sticker={viewOf(freshSticker)}
          giver={owed.giver}
          onSend={() => {
            askedToThank.add(freshSticker.id);
            setOwed(null);
            setThanking({ sticker: freshSticker, giver: asGiver(owed.giver) });
          }}
          onLater={() => {
            askedToThank.add(freshSticker.id);
            setOwed(null);
          }}
        />
      )}

      {thanking && (
        <GratitudeMiniGame
          sticker={thanking.sticker}
          giver={thanking.giver}
          intensity={
            readMiniGameDemoSettings().fullEffects
              ? FEEL_CONFIG.intensity.full
              : FEEL_CONFIG.intensity.everyday
          }
          showFrameTimes={readMiniGameDemoSettings().showFrameTimes}
          onClose={() => setThanking(null)}
        />
      )}

      {open && (
        <Suspense fallback={null}>
          <StickerDetail
            // In the order they arrived, as the board loads them.
            stickers={(stickers ?? []).filter((s) => (open.mode === "given" ? !s.held : s.held))}
            startId={open.id}
            mode={open.mode}
            // It lifts off from where the sticker sits: on the board, or its given sticker silhouette.
            originOf={(id) =>
              stickerEl(id)?.querySelector<HTMLElement>(
                ".placed-sticker__lift, .given-sticker-silhouette__art",
              ) ?? null
            }
            {...(owner && { ownerId: owner.id })}
            onSendGratitude={(_gift, sticker, giver) => {
              const s = stickers?.find((x) => x.id === sticker.id);
              if (!s) return;
              setOpen(null);
              setThanking({ sticker: s, giver: asGiver(giver) });
            }}
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
              // Your own stickers, as it counted when every sticker here was one you drew.
              stickers={
                board.state === "failed"
                  ? null
                  : (stickers ?? [])
                      .filter((s) => s.artist.id === owner?.id)
                      .map((s) => ({ ...s, blob: NO_IMAGE }))
              }
              gifts={gifts}
              onFlipBack={() => turn(false)}
              flipBackRef={flipBack}
              onTryGratitudeMiniGame={
                newest
                  ? () =>
                      setThanking({
                        sticker: newest,
                        giver: {
                          handle: me.handle,
                          displayName: me.displayName,
                          pictureUrl: me.pictureUrl,
                        },
                      })
                  : null
              }
            />
          </Suspense>
        )
      }
    />
  );
}
