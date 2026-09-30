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
import { useMyAgeStatus } from "../identity/useMyAgeStatus";
import { veiledFor } from "../stickers/nsfw";
import { flushSync } from "react-dom";
import { apiError } from "../api/apiClient";
import { useApi } from "../api/useApi";
import { useApiQuery } from "../api/useApiQuery";
import {
  toApiPlacement,
  toPerson,
  toSticker,
  type PersonView,
  type StickerView,
} from "../api/views";
import { GiftReceivedNotice } from "../giving/GiftReceivedNotice";
import { markNoticed, newestUnnoticed, receiveOf } from "../giving/noticedGifts";
import { PendingGiftsNotificationBadge } from "../giving/PendingGiftsNotificationBadge";
import { useGiftSender } from "../giving/useGiftSender";
import { FEEL_CONFIG } from "../gratitude/gameConfig";
import { readMiniGameDemoSettings } from "../gratitude/miniGameDemoSettings";
import { errorReason } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { DrawIcon } from "../icons/DrawIcon";
import { useMe } from "../api/meContext";
import { useIdentity } from "../identity/useIdentity";
import { LIFF_ID } from "../line/liff";
import { formatHandle, formatNo } from "../stickers/format";
import { useLight } from "../stickers/light";
import { playStick } from "../stickers/stick";
import { DrawKeyTickets } from "../tickets/DrawKeyTickets";
import { describeTickets, ticketDay } from "../tickets/tickets";
import { useDrawFromBoard } from "../tickets/useDrawFromBoard";
import { useTickets } from "../tickets/useTickets";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { lazyWithPreload } from "../ui/lazyWithPreload";
import { PhotoSticker } from "../ui/PhotoSticker";
import { useBackToClose } from "../ui/useBackToClose";
import { useReducedMotion } from "../ui/useReducedMotion";
import { normalizeTurn } from "./boardGesture";
import {
  onItsWay,
  placeUnplaced,
  toBoardSticker,
  type BoardSticker,
  type BoardStickerView,
} from "./boardSticker";
import { PlacedSticker } from "./PlacedSticker";
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
  type Placement,
} from "./placement";
import { noteBootMilestone } from "../performance/bootMilestones";
import { BoardLoading } from "./BoardLoading";
import {
  assemblyOf,
  followBoardAssembly,
  markBoardComplete,
  usePreloadAfterBoard,
} from "./boardComplete";
import { markChipsPlayed } from "./boardSettled";
import { keepBoard, keptBoardFor } from "./lastBoard";
import { BoardFlip } from "./stat-board/BoardFlip";
import { takeReopenOnSettings } from "./stat-board/reopenOnSettings";
import type { StatBoardHandle } from "./stat-board/StatBoard";
import { readingOrder } from "./stickerOrder";
import { StickerToolbar } from "./StickerToolbar";
import { SendGratitudeSheet } from "../receiving/SendGratitudeSheet";
import { GiftsForYouBadge, type GiftForYou } from "../receiving/GiftsForYouBadge";
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
// Opened from the board, so their code loads once the board is complete: nothing else downloads while
// it assembles.
const StickerDetail = lazyWithPreload("the sticker detail", () =>
  import("./StickerDetail").then((m) => m.StickerDetail),
);
const Giving = lazyWithPreload("Giving", () => import("../giving/Giving").then((m) => m.Giving));
// Your name turns the board over from the moment it shows, so a touch on it starts the stat board's
// code loading too.
const StatBoard = lazyWithPreload("the stat board", () =>
  import("./stat-board/StatBoard").then((m) => m.StatBoard),
);
// The Gratitude Mini-game opens over the board from a received sticker or the stat board's slip.
const GratitudeMiniGame = lazyWithPreload("the Gratitude Mini-game", () =>
  import("../gratitude/GratitudeMiniGame").then((m) => m.GratitudeMiniGame),
);
const OPENED_FROM_BOARD = [StickerDetail, Giving, StatBoard, GratitudeMiniGame];

interface Props {
  /** The sticker that was just sealed; it lands on the board the first time the board shows it. */
  freshId?: string;
  onDraw: () => void;
  /** Opens a gift waiting for you, to unpackage and accept as its gift message would. */
  onOpenGift: (gift: GiftForYou) => void;
  /** A closed Receiving dialog refreshes waiting gifts without reloading the sticker board. */
  giftClosures?: number;
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

interface LoadedBoard {
  owner: PersonView;
  stickers: BoardStickerView[];
  /** Drawn from the phone's storage, until the fresh board lands. */
  fromPhone?: boolean;
}

/**
 * The stickers whose spots win over a load's: all the board holds, since its moves are newer than any
 * load, but over a board from the phone's storage only those moved since it showed.
 */
function heldOver(list: readonly BoardStickerView[] | null, over: LoadedBoard | null) {
  if (!list || !over?.fromPhone) return list ?? [];
  const keptSpots = new Map(over.stickers.map((s) => [s.id, s.placement]));
  return list.filter((s) => keptSpots.get(s.id) !== s.placement);
}

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

/** Received stickers already asked about gratitude this session, so the question comes once. */
const askedForGratitude = new Set<string>();

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
  nsfw: s.nsfw,
  outline: s.outline ?? "",
  urls: s.urls,
  sealedAt: s.createdAt,
});

/** Gratitude being sent: for a received gift when `giftId` is set, which records it; the stat
 * board's demo has none. */
type GratitudeFor = { sticker: BoardSticker; giver: ReturnType<typeof asGiver>; giftId?: string };

export function StickerBoard({ freshId, onDraw, onOpenGift, giftClosures = 0 }: Props) {
  const { t, i18n } = useTranslation();
  const stage = useRef<HTMLDivElement>(null);
  /** The board's face, which the sticker tray runs down the right edge of. */
  const [face, setFace] = useState<HTMLDivElement | null>(null);
  const tray = useRef<StickerTrayHandle>(null);
  const nameButton = useRef<HTMLButtonElement>(null);
  const drawSlot = useRef<HTMLSpanElement>(null);
  const flipBack = useRef<HTMLButtonElement>(null);
  const statBoard = useRef<StatBoardHandle>(null);
  const api = useApi();
  const account = useMe();
  /** The last board this phone showed you, drawn at once while the fresh one loads. */
  const [fromPhone] = useState(() => keptBoardFor(account.id));
  const [stickers, setStickers] = useState<BoardStickerView[] | null>(
    () => fromPhone?.stickers ?? null,
  );
  /** The load the stickers came from, and whose board it is: a sticker someone else drew wears foil. */
  const [adopted, setAdopted] = useState<LoadedBoard | null>(
    () => fromPhone && { ...fromPhone, fromPhone: true },
  );
  const owner = adopted?.owner ?? null;
  /** The stickers as last drawn, and their load, for a reload to keep the spots the board has given them. */
  const latestStickers = useRef(stickers);
  const latestAdopted = useRef(adopted);
  useLayoutEffect(() => {
    latestStickers.current = stickers;
    latestAdopted.current = adopted;
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
  const openYours = (id: string) => setOpen({ id, mode: "yours" });
  const [giving, setGiving] = useState<BoardSticker | null>(null);
  /** The app restarted for a language change, so it opens on the stat board, at Settings. */
  const [reopenedOnSettings] = useState(takeReopenOnSettings);
  /** The board is turned over to its stat board. */
  const [turned, setTurned] = useState(reopenedOnSettings);
  /** The board has turned over before, so its stat board stays mounted for every turn after. */
  const [wasTurned, setWasTurned] = useState(reopenedOnSettings);
  const { tickets } = useTickets();
  // Draw spends a daily ticket at once, its ticket peeling off the key; with none at all, a card says when.
  const drawKey = useDrawFromBoard(onDraw);
  /** The sticker the gratitude mini-game is open for, from the stat board's developer slip. */
  const [gratitudeFor, setGratitudeFor] = useState<GratitudeFor | null>(null);
  /** Received gifts whose notice closed on this visit, by receive: each close brings on the next. */
  const [noticesClosed, setNoticesClosed] = useState<ReadonlySet<string>>(() => new Set());
  /** A sticker that just reached you, and its giver, while it has no gratitude yet. */
  const [owed, setOwed] = useState<{ gift: { id: string }; giver: PersonView } | null>(null);
  /** The first-load artist chips have played, or a sticker was selected, which clears them. */
  const [chipsDone, setChipsDone] = useState(false);
  const me = useIdentity();
  const giftSender = useGiftSender();
  const reduced = useReducedMotion();
  const myAge = useMyAgeStatus();
  const hints = useId();
  const idle = usePreloadAfterBoard(OPENED_FROM_BOARD);
  // The gratitude mini-game covers the board, so the tilt and its sheen sweeps rest while it plays.
  useLight(!turned && !gratitudeFor);

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
          setUnsaved((was) => new Map(was).set(sticker.id, errorReason(failure)));
        },
      );
    },
    [api],
  );

  // The board mounts anew on every visit, so its load is its refresh. A sticker the board has never
  // placed gets a spot as it loads, saved so it stays there.
  const board = useApiQuery("sticker-board", async (client): Promise<LoadedBoard> => {
    const data = await client.stickerBoard();
    noteBootMilestone("board JSON", `${data.boardStickers.length} stickers`);
    const { stickers: list, placed } = placeUnplaced(
      data.boardStickers.map(toBoardSticker),
      heldOver(latestStickers.current, latestAdopted.current),
    );
    for (const s of placed) save(s, s.placement);
    return { owner: toPerson(data.owner), stickers: list };
  });
  const loaded = board.state === "ready" ? board.data : null;
  if (loaded && loaded !== adopted) {
    setAdopted(loaded);
    // Moves made while it loaded stay.
    setStickers(placeUnplaced(loaded.stickers, heldOver(stickers, adopted)).stickers);
  }
  // The first open's board completes once the fresh board's stickers have all decoded; one from the
  // phone's storage starts them decoding. A board that didn't load has nothing more coming, so what
  // waited for it goes ahead.
  useEffect(() => {
    if (!adopted) return;
    followBoardAssembly(assemblyOf(adopted.stickers), { fresh: !adopted.fromPhone });
  }, [adopted]);
  useEffect(() => {
    if (fromPhone)
      noteBootMilestone("board from this phone", `${fromPhone.stickers.length} stickers`);
  }, [fromPhone]);
  // Once the fresh board is in, the board as it shows is kept for your next open.
  useEffect(() => {
    if (adopted && !adopted.fromPhone && stickers)
      keepBoard(account.id, { owner: adopted.owner, stickers });
  }, [account.id, adopted, stickers]);
  const failed = board.state === "failed";
  useEffect(() => {
    if (failed) markBoardComplete();
  }, [failed]);

  const pending = useApiQuery("pending-gifts", (client) => client.pendingGifts());
  // A preview can make a gift wait here even when the person chooses Not now.
  const forYou = useApiQuery(`gifts-for-you:${giftClosures}`, (client) => client.giftsForYou());
  const waiting = forYou.state === "ready" ? forYou.data.gifts : [];
  const onTheirWay =
    pending.state === "ready"
      ? pending.data.gifts
          .filter((p) => p.gift.status === "sent")
          .map((p) => ({
            giftId: p.gift.id,
            sticker: toSticker(p.sticker),
            ...(p.for && { to: toPerson(p.for) }),
          }))
      : [];

  // Each gift someone received since this device last said so, newest first, one notice at a time.
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
  // Closed ones stay closed on this visit even when the device can't save that they were noticed.
  const notice = newestUnnoticed(receivedGifts.filter((g) => !noticesClosed.has(receiveOf(g))));

  // A sticker that just reached you asks about gratitude, when its newest gift to you has none.
  useEffect(() => {
    if (!freshId || askedForGratitude.has(freshId)) return;
    let current = true;
    api.stickerDetail(freshId).then(
      (detail) => {
        const [entry] = detail.transferTrail;
        if (current && entry && entry.receiver.id === detail.owner.id && !entry.gratitude)
          setOwed({ gift: { id: entry.giftId }, giver: toPerson(entry.giver) });
      },
      (error: unknown) =>
        console.error(`Checking whether ${freshId} has gratitude failed`, apiError(error)),
    );
    return () => {
      current = false;
    };
  }, [api, freshId]);

  // The sheet asking about gratitude starts the game's code while it's read.
  useEffect(() => {
    if (owed) void GratitudeMiniGame.preload();
  }, [owed]);

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

  // A given sticker has left the board: on its way, for the badge; received, for good.
  const onBoard = (stickers ?? []).filter((s) => s.placement.on && s.held && !onItsWay(s));
  // The gratitude mini-game's demo always sends gratitude for whichever sticker landed most recently.
  const newest = onBoard.reduce<BoardSticker | null>(
    (latest, s) => (!latest || s.createdAt > latest.createdAt ? s : latest),
    null,
  );
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
    onOpen: openYours,
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
  /** A given sticker's blank spot on the sticker tray's front sheet, or the sheet pulled out. */
  const givenSpot = (id: string) =>
    face?.querySelector<HTMLElement>(
      `.tray__sheet.is-top .tray__slot[data-state="given"][data-id="${CSS.escape(id)}"]`,
    ) ?? null;
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
    openGiven: (id) => setOpen({ id, mode: "given" }),
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
  // Privy's SDK waits for the first-load chips too (whenBoardSettled), so its wallet frame doesn't
  // stutter them.
  const chipsOver = failed || (stickers !== null && field !== null && chips.length === 0);
  useEffect(() => {
    if (chipsOver) markChipsPlayed();
  }, [chipsOver]);
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
        onPointerDown={() => void StatBoard.preload()}
        onFocus={() => void StatBoard.preload()}
        aria-expanded={turned}
        aria-haspopup="dialog"
        aria-label={t(($) => $.stickerBoard.board.yourStats, { name: me.displayName })}
      >
        <PhotoSticker src={me.pictureUrl} name={me.displayName} size={42} />
        <span className="board-who-name">{me.displayName}</span>
      </button>

      {(waiting.length > 0 || onTheirWay.length > 0) && (
        <div className="board-gifts">
          {/* Gifts for you first: they ask to be opened, where gifts on their way only report. */}
          <GiftsForYouBadge gifts={waiting} onOpen={onOpenGift} />
          <PendingGiftsNotificationBadge gifts={onTheirWay} onOpen={openYours} />
        </div>
      )}

      {/* The slot carries the first-sticker hop and ring, so the key keeps its own lip and press. The tickets
          tuck behind the key's right end, in the slot beside it, so they hop along but never press. */}
      <span ref={drawSlot} className={`board-draw ${firstVisit ? "is-fresh" : ""}`}>
        <Key
          size="compact"
          icon={<DrawIcon />}
          onClick={drawKey.draw}
          aria-label={
            tickets
              ? t(($) => $.stickerBoard.board.drawLabelWithTickets, {
                  tickets: describeTickets(tickets),
                })
              : t(($) => $.stickerBoard.board.drawLabel)
          }
        >
          {t(($) => $.stickerBoard.board.draw)}
        </Key>
        {drawKey.shown && <DrawKeyTickets tickets={drawKey.shown} peel={drawKey.peeling} />}
      </span>
      {drawKey.overBoard}
      {firstVisit && (
        <span className="board-nudge" aria-hidden>
          {t(($) => $.stickerBoard.board.firstSticker)}
        </span>
      )}

      <div
        className="board-stage"
        ref={stage}
        role="region"
        aria-label={t(($) => $.stickerBoard.board.label)}
      >
        {/* Descriptions only: hidden from reading, still read out for the sticker that names them. */}
        <span id={`${hints}-focus`} hidden>
          {t(($) => $.stickerBoard.board.focusHint)}
        </span>
        <span id={`${hints}-selected`} hidden>
          {t(($) => $.stickerBoard.board.selectedHint)}
        </span>
        {!stickers && board.state === "loading" && <BoardLoading />}
        {stickers && onBoard.length === 0 && (
          <div className="board-blank" style={blankStyle}>
            <span className="board-blank-cut" aria-hidden />
            <span className="board-blank-note">{t(($) => $.stickerBoard.board.blank)}</span>
          </div>
        )}
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
                position={order.indexOf(s.id) + 1}
                setSize={order.length}
                hintId={`${hints}-${s.id === selected ? "selected" : "focus"}`}
                foil={byOther(s)}
                veiled={veiledFor(s, myAge)}
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
                  onView={() => openYours(s.id)}
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
          <span className="board-blank-note">{t(($) => $.stickerBoard.board.didntLoad)}</span>
          <span className="fine board-problem-reason">{errorReason(board.error)}</span>
          <LabelButton size="sm" onClick={board.retry}>
            {t(($) => $.stickerBoard.tryAgain)}
          </LabelButton>
        </div>
      )}

      {unsavedStickers.length > 0 && (
        <div className="board-unsaved" role="alert">
          <p className="board-unsaved-note">
            {t(($) => $.stickerBoard.board.unsaved, {
              count: unsavedStickers.length,
              stickers: new Intl.ListFormat(i18n.language).format(
                unsavedStickers.map((s) => formatNo(s.no)),
              ),
              reasons: [...new Set(unsavedStickers.map((s) => unsaved.get(s.id)))].join("; "),
            })}
          </p>
          <LabelButton
            size="sm"
            onClick={() => unsavedStickers.forEach((s) => save(s, s.placement))}
          >
            {t(($) => $.stickerBoard.tryAgain)}
          </LabelButton>
        </div>
      )}

      {giving && giftSender && (
        <Suspense fallback={null}>
          <Giving
            sticker={{ ...giving, url: giving.urls.png }}
            fromHandle={account.handle ?? me.displayName}
            sender={giftSender}
            liffId={LIFF_ID}
            onClose={(sent) => {
              setGiving(null);
              // Given, it has left the board, and the board loads where its gift is.
              if (sent) {
                setSelected(null);
                if (board.state === "ready") board.refresh();
              }
              // The bag's gift may have been packed, sent or taken out.
              if (pending.state === "ready") pending.refresh();
              else if (pending.state === "failed") pending.retry();
            }}
          />
        </Suspense>
      )}

      {notice && (
        <GiftReceivedNotice
          // Each notice arrives anew.
          key={receiveOf(notice)}
          sticker={notice.sticker}
          receiver={notice.receiver}
          receivedAt={notice.receivedAt}
          {...(notice.mask && { mask: notice.mask })}
          onClose={() => {
            markNoticed([notice]);
            setNoticesClosed((was) => new Set(was).add(receiveOf(notice)));
          }}
        />
      )}

      {owed && freshSticker && !landingId && !askedForGratitude.has(freshSticker.id) && (
        <SendGratitudeSheet
          gift={owed.gift}
          sticker={viewOf(freshSticker)}
          giver={owed.giver}
          onSend={() => {
            askedForGratitude.add(freshSticker.id);
            setOwed(null);
            setGratitudeFor({
              sticker: freshSticker,
              giver: asGiver(owed.giver),
              giftId: owed.gift.id,
            });
          }}
          onLater={() => {
            askedForGratitude.add(freshSticker.id);
            setOwed(null);
          }}
        />
      )}

      {gratitudeFor && (
        <Suspense fallback={null}>
          <GratitudeMiniGame
            sticker={gratitudeFor.sticker}
            giver={gratitudeFor.giver}
            {...(gratitudeFor.giftId && { giftId: gratitudeFor.giftId })}
            intensity={
              readMiniGameDemoSettings().fullEffects
                ? FEEL_CONFIG.intensity.full
                : FEEL_CONFIG.intensity.everyday
            }
            showFrameTimes={readMiniGameDemoSettings().showFrameTimes}
            onClose={() => setGratitudeFor(null)}
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
            // It lifts off from where the sticker sits: on the board, or given, its spot in the tray.
            originOf={(id) =>
              stickerEl(id)?.querySelector<HTMLElement>(".placed-sticker__lift") ?? givenSpot(id)
            }
            {...(owner && { ownerId: owner.id })}
            onSendGratitude={(gift, sticker, giver) => {
              const s = stickers?.find((x) => x.id === sticker.id);
              if (!s) return;
              setOpen(null);
              setGratitudeFor({ sticker: s, giver: asGiver(giver), giftId: gift.id });
            }}
            onClose={() => setOpen(null)}
            // Back to the sticker it opened from: on the board, or given, its spot in the tray.
            returnFocus={() => stickerEl(open.id) ?? givenSpot(open.id)}
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
              onFlipBack={() => turn(false)}
              flipBackRef={flipBack}
              reopenedOnSettings={reopenedOnSettings}
              onTryGratitudeMiniGame={
                newest
                  ? () =>
                      setGratitudeFor({
                        sticker: newest,
                        giver: {
                          handle: account.handle ?? me.displayName,
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
