import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMyNsfwOptIn, veiledFor, withoutNsfwDrawings } from "../stickers/nsfw";
import { flushSync } from "react-dom";
import { apiError, type ApiError } from "../api/apiClient";
import { useApi } from "../api/useApi";
import { useApiQuery } from "../api/useApiQuery";
import { toApiSpots, toPerson, type PersonView, type StickerView } from "../api/views";
import { GiftReceivedNotice } from "../giving/GiftReceivedNotice";
import {
  markNoticed,
  newestUnnoticed,
  noticeReceivesFromNow,
  receiveOf,
} from "../giving/noticedGifts";
import { useGiftSender } from "../giving/useGiftSender";
import { FEEL_CONFIG } from "../gratitude/gameConfig";
import { readMiniGameDemoSettings } from "../gratitude/miniGameDemoSettings";
import { errorDetail, errorMessage, joinedDetails } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { DrawIcon } from "../icons/DrawIcon";
import { useMe } from "../api/meContext";
import { useIdentity } from "../identity/useIdentity";
import { CaretRight } from "../icons";
import { LIFF_ID } from "../line/liff";
import { formatHandle, formatNo } from "../stickers/format";
import { useLight } from "../stickers/light";
import { boardFoil } from "../stickers/madeFoil";
import { playStick } from "../stickers/stick";
import { DrawKeyTickets } from "../tickets/DrawKeyTickets";
import { describeTickets } from "../tickets/tickets";
import { useDrawFromBoard } from "../tickets/useDrawFromBoard";
import { useTickets } from "../tickets/useTickets";
import { EASE_OUT } from "../ui/easing";
import { ErrorLine } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import { useLargeScreen } from "../ui/largeScreen";
import { lazyWithPreload } from "../ui/lazyWithPreload";
import { PhotoSticker } from "../ui/PhotoSticker";
import { TabsLead } from "../ui/TabsLead";
import { useBackToClose } from "../ui/useBackToClose";
import { useReducedMotion } from "../ui/useReducedMotion";
import { normalizeTurn } from "./boardGesture";
import {
  hasLargeLayout,
  movedIn,
  onTheBoard,
  placeUnplaced,
  shownIn,
  toBoardSticker,
  type BoardSticker,
  type BoardStickerView,
  type GivenSpots,
  type PlacedBoardSticker,
} from "./boardSticker";
import { KeepAnimations } from "./keepAnimations";
import { PlacedSticker } from "./PlacedSticker";
import {
  FIRST_SPOT,
  PHONE_BOARD_SIZE,
  boxOf,
  fieldOf,
  freeSpot,
  kept,
  knobHidden,
  layoutsIn,
  nextZ,
  sizeOf,
  spotsIn,
  stickerBox,
  toFrac,
  toPx,
  TRAY_EDGE,
  type BoardLayout,
  type Box,
  type Placement,
  type Spots,
} from "./placement";
import { noteBootMilestone } from "../performance/bootMilestones";
import { BoardLoading } from "./BoardLoading";
import {
  assemblyOf,
  followBoardAssembly,
  markBoardComplete,
  usePreloadAfterBoard,
} from "./boardComplete";
import { markGreeted, owesGreeting } from "./artistChipGreeting";
import { markChipsPlayed } from "./boardSettled";
import { deriveLargeLayout, saveDerivedLayout, type LargeSpot } from "./largeLayout";
import { keepBoard, keptBoardFor } from "./lastBoard";
import { BoardFlip } from "./stat-board/BoardFlip";
import type { StatBoardHandle } from "./stat-board/StatBoard";
import { arrangeLeftOpen, keepArrangeOpen } from "./arrangeOpen";
import { inGiftsLast, readingOrder } from "./stickerOrder";
import { StickerToolbar } from "./StickerToolbar";
import { SendGratitudeSheet } from "../receiving/SendGratitudeSheet";
import { GiftsForYouBadge, type GiftForYou } from "../receiving/GiftsForYouBadge";
import { ArtistChipLayer } from "./ArtistChipLayer";
import type { StickerTrayHandle } from "./tray/StickerTray";
import type { TrayBoard } from "./tray/trayEngine";
import { trayProblemKey, trayProblemWords, type TrayProblem } from "./tray/trayProblem";
import { useBoardGestures, type SettledStep } from "./useBoardGestures";
import { useBoardLayout, useBoardSize } from "./useBoardSize";
import { CreasesContext, useCreases } from "./useCreases";
import { detailReadsKey, detailsAhead, preloadStickerDetails } from "./stickerDetailQuery";
import { onMyStickerBoardChanged, useMyStickerBoard } from "./useMyStickerBoard";
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
// A tap on a sticker drawn in Kyoto Seika Practice Mode peeks at its subjects.
const ThoughtLayer = lazyWithPreload("the subjects' peek", () =>
  import("./ThoughtLayer").then((m) => m.ThoughtLayer),
);
const OPENED_FROM_BOARD = [StickerDetail, Giving, StatBoard, GratitudeMiniGame, ThoughtLayer];

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

const round4 = (v: number) => Number(v.toFixed(4));

interface LoadedBoard {
  owner: PersonView;
  stickers: PlacedBoardSticker[];
  /** Drawn from the phone's storage, until the fresh board lands. */
  fromPhone?: boolean;
}

/**
 * The stickers whose spots win over a load's: all the board holds, since its moves are newer than any
 * load, but over a board from the phone's storage only those moved since it showed.
 */
function heldOver(list: readonly PlacedBoardSticker[] | null, over: LoadedBoard | null) {
  if (!list || !over?.fromPhone) return list ?? [];
  const keptSpots = new Map(over.stickers.map((s) => [s.id, s.placements]));
  return list.filter((s) => keptSpots.get(s.id) !== s.placements);
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

/** A sticker's spots that didn't save, the layouts they're in, and why. */
interface Unsaved {
  error: ApiError;
  layouts: ReadonlySet<BoardLayout>;
}

/** `was` after a save of `layouts` for `ids`: failed with `error`, or saved when there's none. */
function unsavedAfter(
  was: ReadonlyMap<string, Unsaved>,
  ids: readonly string[],
  layouts: readonly BoardLayout[],
  error: ApiError | null,
): ReadonlyMap<string, Unsaved> {
  if (!error && !ids.some((id) => was.has(id))) return was;
  const next = new Map(was);
  for (const id of ids) {
    const before = next.get(id);
    const left = new Set(before?.layouts);
    for (const layout of layouts) {
      if (error) left.add(layout);
      else left.delete(layout);
    }
    const reason = error ?? before?.error;
    if (left.size > 0 && reason) next.set(id, { error: reason, layouts: left });
    else next.delete(id);
  }
  return next;
}

/** A sticker's spots now, in `layouts`, to save again. */
function spotsOf(s: PlacedBoardSticker, layouts: Iterable<BoardLayout>): Spots {
  const spots: Spots = {};
  for (const layout of layouts) {
    const placement = s.placements[layout];
    if (placement) spots[layout] = placement;
  }
  return spots;
}

/** Received stickers already asked about gratitude this session, so the question comes once. */
const askedForGratitude = new Set<string>();

/** Someone as the gratitude Mini-game names them. */
const asGiver = (p: PersonView) => ({
  handle: p.handle ?? p.name,
  displayName: p.name,
  ...(p.pictureUrl && { pictureUrl: p.pictureUrl }),
});

/** A board sticker as the gift screens draw it. */
const viewOf = (s: PlacedBoardSticker): StickerView => ({
  drawnWidth: s.drawnWidth,
  drawnHeight: s.drawnHeight,
  id: s.id,
  no: s.no,
  artist: s.artist,
  timeUsed: s.timeUsed,
  width: s.width,
  height: s.height,
  nsfw: s.nsfw,
  kyotoSeikaSubjects: s.kyotoSeikaSubjects,
  outline: s.outline ?? "",
  urls: s.urls,
  sealedAt: s.createdAt,
});

/** The stickers of yours that others have received, each with the giver's notice's contents. */
const receivedGiftsOf = (stickers: readonly PlacedBoardSticker[]) =>
  stickers.flatMap((s) =>
    !s.held && s.givenTo
      ? [
          {
            stickerId: s.id,
            receivedAt: s.givenTo.receivedAt,
            sticker: viewOf(s),
            receiver: s.givenTo.receiver,
          },
        ]
      : [],
  );

/** Gratitude being sent: for a received gift when `giftId` is set, which records it; the stat
 * board's demo has none. */
type GratitudeFor = { sticker: BoardSticker; giver: ReturnType<typeof asGiver>; giftId?: string };

export function StickerBoard({ freshId, onDraw, onOpenGift, giftClosures = 0 }: Props) {
  const { t, i18n } = useTranslation();
  const layout = useBoardLayout();
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
  // Arrange's step tiles stay out for every selection once opened, on every visit from this device.
  const [arrangeOpen, setArrangeOpen] = useState(() => arrangeLeftOpen(account.id));
  const openArrange = (open: boolean) => {
    setArrangeOpen(open);
    keepArrangeOpen(account.id, open);
  };
  const stepsSaid = useRef<HTMLParagraphElement>(null);
  /** Reads out what a run of steps did once it settles; cleared first, so the same words twice are read twice. */
  const tellSteps = (last: SettledStep) => {
    const el = stepsSaid.current;
    if (!el) return;
    const words = last.moved
      ? t(($) => $.stickerBoard.toolbar.arrange.moved[last.step])
      : t(($) => $.stickerBoard.toolbar.arrange.stopped[last.step]);
    el.textContent = "";
    requestAnimationFrame(() => {
      el.textContent = words;
    });
  };
  const optedIn = useMyNsfwOptIn();
  /**
   * The last board this device showed you, drawn at once while the fresh one loads, when it has
   * spots in this screen's layout.
   */
  const [fromPhone] = useState(() => {
    const stored = keptBoardFor(account.id);
    return stored && (layout === "phone" || hasLargeLayout(stored.stickers)) ? stored : null;
  });
  /** The board's stickers as loaded and moved, with their spots in both layouts; `stickers` shows them. */
  const [loaded, setStickers] = useState<PlacedBoardSticker[] | null>(
    () => fromPhone?.stickers ?? null,
  );
  /** The load the stickers came from, and whose board it is: a sticker someone else drew wears foil. */
  const [adopted, setAdopted] = useState<LoadedBoard | null>(
    () => fromPhone && { ...fromPhone, fromPhone: true },
  );
  const owner = adopted?.owner ?? null;
  // A load's owner is you, with the opt-in its images were picked for: the browser keeps a drawing
  // it has shown, so until a load under your opt-in now is adopted, NSFW stickers show none, and the
  // board isn't kept on this phone.
  const imagesCurrent = owner === null || owner.nsfwOptIn === optedIn;
  const stickers = useMemo(
    () => loaded && shownIn(layout, imagesCurrent ? loaded : withoutNsfwDrawings(loaded)),
    [loaded, imagesCurrent, layout],
  );
  /** Stickers whose spot didn't save, and why; each goes once a save of it succeeds. */
  const [unsaved, setUnsaved] = useState<ReadonlyMap<string, Unsaved>>(() => new Map());
  /** What the sticker tray couldn't do, said in an alert until it's dismissed. */
  const [trayProblems, setTrayProblems] = useState<readonly TrayProblem[]>([]);
  const addTrayProblem = useCallback(
    (problem: TrayProblem) =>
      setTrayProblems((was) =>
        was.some((p) => trayProblemKey(p) === trayProblemKey(problem)) ? was : [...was, problem],
      ),
    [],
  );
  const size = useBoardSize(stage, layout);
  /** On a large screen Draw stands at the tab strip's left end (ui/TabsLead.tsx). */
  const large = useLargeScreen();
  /** The name button's box on the board, which a sticker's knob must stay clear of. */
  const [name, setName] = useState<Box | null>(null);
  /** Draw's box on the board, which the selected sticker's toolbar keeps clear of. */
  const [draw, setDraw] = useState<Box | null>(null);
  const [landingId, setLandingId] = useState(() =>
    freshId && !landed.has(freshId) ? freshId : undefined,
  );
  /** The sticker landing as this visit opened. `landingId` clears once it sticks; its chip plays on. */
  const [arrivedId] = useState(landingId);
  const [selected, setSelected] = useState<string | null>(null);
  /** The sticker drawn in Kyoto Seika Practice Mode a tap just selected, peeking at its subjects; each peek its own. */
  const [peek, setPeek] = useState<{ id: string; n: number } | null>(null);
  /** The sticker the detail shows, among your stickers or among the ones you gave. */
  const [open, setOpen] = useState<{ id: string; mode: "yours" | "given" } | null>(null);
  const openYours = (id: string) => setOpen({ id, mode: "yours" });
  const [giving, setGiving] = useState<BoardSticker | null>(null);
  /** The board is turned over to its stat board. */
  const [turned, setTurned] = useState(false);
  /** The board has turned over before, so its stat board stays mounted for every turn after. */
  const [wasTurned, setWasTurned] = useState(false);
  const { tickets, error: ticketsError, refresh: refreshTickets } = useTickets();
  // Draw spends a daily ticket at once, its ticket peeling off the key; with none at all, a card says when.
  const drawKey = useDrawFromBoard(onDraw);
  /** The sticker the gratitude mini-game is open for, from the stat board's developer slip. */
  const [gratitudeFor, setGratitudeFor] = useState<GratitudeFor | null>(null);
  /** Received gifts whose notice closed on this visit, by receive: each close brings on the next. */
  const [noticesClosed, setNoticesClosed] = useState<ReadonlySet<string>>(() => new Set());
  /** A sticker that just reached you, and its giver, while it has no gratitude yet. */
  const [owed, setOwed] = useState<{ gift: { id: string }; giver: PersonView } | null>(null);
  /** This visit opened owing the greeting, which a board gets once per app open. */
  const [owedGreeting] = useState(() => owesGreeting(account.id));
  /** This visit's artist chips have played, or a selection or a turn of the board cleared them. */
  const [chipsDone, setChipsDone] = useState(false);
  const me = useIdentity();
  const giftSender = useGiftSender();
  const reduced = useReducedMotion();
  const hints = useId();
  const idle = usePreloadAfterBoard(OPENED_FROM_BOARD);
  // Once the board is idle, the details of the stickers on top load ahead, so opening one shows it
  // whole at once. Only a change in which stickers those are, or in their trails, starts it again, not
  // raising one of them.
  const ahead = useMemo(() => (stickers ? detailsAhead(stickers) : []), [stickers]);
  const aheadKey = detailReadsKey(ahead);
  const preloadAhead = useEffectEvent(() => preloadStickerDetails(api, ahead));
  useEffect(() => {
    if (!idle || aheadKey === "") return;
    return preloadAhead();
  }, [idle, api, aheadKey]);
  // The gratitude mini-game covers the board, so the tilt and its sheen sweeps rest while it plays.
  useLight(!turned && !gratitudeFor);

  /**
   * Stickers whose spots are saving, each with the spots waiting to go once that save settles. One
   * save of a sticker at a time, so an older spot can't land on the server last; spots that wait
   * merge, the latest in each layout winning.
   */
  const saving = useRef(new Map<string, Spots | null>());
  const save = useCallback(
    (sticker: Pick<BoardSticker, "id" | "no">, spots: Spots) => {
      const inFlight = saving.current;
      if (inFlight.has(sticker.id)) {
        inFlight.set(sticker.id, { ...inFlight.get(sticker.id), ...spots });
        return;
      }
      const send = (body: Spots) => {
        inFlight.set(sticker.id, null);
        const after = (failure: ApiError | null) => {
          const next = inFlight.get(sticker.id);
          if (next) {
            // A failed save's spots go again with the ones that waited, the waiting ones winning.
            send(failure ? { ...body, ...next } : next);
            if (failure) return;
          } else inFlight.delete(sticker.id);
          setUnsaved((was) => unsavedAfter(was, [sticker.id], layoutsIn(body), failure));
        };
        api.saveStickerPlacement(sticker.id, toApiSpots(body)).then(
          () => after(null),
          (error: unknown) => {
            const failure = apiError(error);
            console.error(`Saving where ${formatNo(sticker.no)} sits failed`, failure);
            after(failure);
          },
        );
      };
      send(spots);
    },
    [api],
  );

  // The board mounts anew on every visit, so its load is its refresh. An answer kept from an earlier
  // visit predates that visit's moves, which the phone's board holds, so it waits for its own.
  const board = useMyStickerBoard({ ownLoadOnly: true });
  const answer = board.state === "ready" ? board.data : null;
  /** The server's answer the stickers were last adopted from. */
  const [adoptedAnswer, setAdoptedAnswer] = useState<typeof answer>(null);
  /** The language the board's names were made in: "Someone", a deleted account's, is the app's word. */
  const [namedIn, setNamedIn] = useState(i18n.language);
  /** Stickers the board had never placed, given a spot as their answer was adopted. */
  const [newlyPlaced, setNewlyPlaced] = useState<readonly GivenSpots[]>([]);
  /** The large layout derived here from the phone's, to save once. */
  const [derivedLayout, setDerivedLayout] = useState<readonly LargeSpot[]>([]);
  if (answer && (answer !== adoptedAnswer || namedIn !== i18n.language)) {
    setAdoptedAnswer(answer);
    setNamedIn(i18n.language);
    // Moves made while it loaded stay, and a language change holds every spot over.
    const { stickers: next, placed } = placeUnplaced(
      answer.boardStickers.map(toBoardSticker),
      heldOver(loaded, adopted),
      size ? { [layout]: size } : {},
    );
    setAdopted({ owner: toPerson(answer.owner), stickers: next });
    setStickers(next);
    setNewlyPlaced(placed);
    // A sticker that comes back to you returns to the sticker tray, so there's no landing to wait for.
    const landing = shownIn(layout, next).find((s) => s.id === landingId);
    if (landing && !onTheBoard(landing)) setLandingId(undefined);
  }
  // The first time a large screen shows your board, the large layout is derived from the phone's, from
  // a load of its own: a kept board can be older than a large layout another device saved.
  if (
    layout === "large" &&
    size &&
    loaded &&
    adopted &&
    !adopted.fromPhone &&
    !hasLargeLayout(loaded)
  ) {
    const { stickers: next, derived } = deriveLargeLayout(loaded, size);
    if (derived.length > 0) {
      setStickers(next);
      setAdopted({ ...adopted, stickers: next });
      setDerivedLayout(derived);
    }
  }
  // Each spot the board gave is saved, so the sticker stays there.
  useEffect(() => {
    for (const { sticker, spots } of newlyPlaced) save(sticker, spots);
  }, [newlyPlaced, save]);
  // A large layout derived here is saved once, where the server has none; a failure says so, and its
  // retry saves each sticker's large spot.
  useEffect(() => {
    if (derivedLayout.length === 0) return;
    saveDerivedLayout(api, derivedLayout).catch((error: unknown) => {
      const failure = apiError(error);
      console.error(
        `Saving the large layout derived from your phone's failed for ${derivedLayout.length} stickers`,
        failure,
      );
      setUnsaved((was) =>
        unsavedAfter(
          was,
          derivedLayout.map((d) => d.id),
          ["large"],
          failure,
        ),
      );
    });
  }, [api, derivedLayout]);
  // The first open's board completes once the fresh board's stickers have all decoded; one from the
  // phone's storage starts them decoding. A board that didn't load has nothing more coming, so what
  // waited for it goes ahead.
  useEffect(() => {
    if (!adopted) return;
    followBoardAssembly(assemblyOf(shownIn(layout, adopted.stickers)), {
      fresh: !adopted.fromPhone,
    });
  }, [adopted, layout]);
  useEffect(() => {
    if (fromPhone)
      noteBootMilestone("board from this phone", `${fromPhone.stickers.length} stickers`);
  }, [fromPhone]);
  // Once the fresh board is in, the board as it shows is kept for your next open.
  useEffect(() => {
    if (adopted && !adopted.fromPhone && imagesCurrent && loaded)
      keepBoard(account.id, { owner: adopted.owner, stickers: loaded });
  }, [account.id, adopted, imagesCurrent, loaded]);
  const failed = board.state === "failed";
  useEffect(() => {
    if (failed) markBoardComplete();
  }, [failed]);
  /**
   * A gift went out or its bag changed, so the board loads again where its gift is: at once, or once a
   * load in flight lands, since that one may have read the board before the gift moved.
   */
  const [reloadForGift, setReloadForGift] = useState(false);
  if (reloadForGift && board.state !== "loading") {
    setReloadForGift(false);
    if (board.state === "ready") board.refresh();
    else board.retry();
  }

  // A Gift Message's send the server heard only late, as the app started, left the board behind too.
  useEffect(() => onMyStickerBoardChanged(() => setReloadForGift(true)), []);
  // A preview can make a gift wait here even when the person chooses Not now.
  const forYou = useApiQuery(`gifts-for-you:${giftClosures}`, (client) => client.giftsForYou());
  const waiting = forYou.state === "ready" ? forYou.data.gifts : [];

  // Each gift someone received since this device last said so, newest first, one notice at a time.
  // From the stickers as they show: the same given stickers as the load's, with no NSFW drawing
  // loaded under the other opt-in.
  const receivedGifts = useMemo(() => receivedGiftsOf(stickers ?? []), [stickers]);
  // Closed ones stay closed on this visit even when the device can't save that they were noticed. The
  // device's record is read again only when these change, not on every render.
  const notice = useMemo(
    () => newestUnnoticed(receivedGifts.filter((g) => !noticesClosed.has(receiveOf(g)))),
    [receivedGifts, noticesClosed],
  );

  // A device with no record of notices would replay every gift ever received, so the first board it
  // draws counts those as noticed.
  useEffect(() => {
    if (adopted) noticeReceivesFromNow(receivedGiftsOf(adopted.stickers));
  }, [adopted]);

  // A sticker that just reached you asks about gratitude, when its newest gift to you has none. When
  // the check fails, the ask can't come, so the board says so, with a way to check again.
  const [checkFailure, setCheckFailure] = useState<ApiError | null>(null);
  const [checks, setChecks] = useState(0);
  useEffect(() => {
    if (!freshId || askedForGratitude.has(freshId)) return;
    let current = true;
    api.stickerDetail(freshId).then(
      (detail) => {
        if (!current) return;
        setCheckFailure(null);
        const [entry] = detail.transferTrail;
        if (entry && entry.receiver.id === detail.owner.id && !entry.gratitude)
          setOwed({ gift: { id: entry.giftId }, giver: toPerson(entry.giver) });
      },
      (error: unknown) => {
        const failure = apiError(error);
        console.error(`Checking whether ${freshId} has gratitude failed`, failure);
        if (current) setCheckFailure(failure);
      },
    );
    return () => {
      current = false;
    };
  }, [api, freshId, checks]);

  // The sheet asking about gratitude starts the game's code while it's read.
  useEffect(() => {
    if (owed) void GratitudeMiniGame.preload();
  }, [owed]);

  // The open sticker tray's NEW marks, which the tray takes off at once.
  const markSeen = (ids: readonly string[]) => {
    api.markTraySeen(ids).catch((error: unknown) => {
      const failure = apiError(error);
      console.error(
        `Saving that the sticker tray showed ${ids.join(", ")} failed, so they show NEW again next time`,
        failure,
      );
      addTrayProblem({
        kind: "seen",
        nos: (stickers ?? []).filter((s) => ids.includes(s.id)).map((s) => s.no),
        error: failure,
      });
    });
  };

  // The name's width follows the person's name, which arrives after the board; Draw's, its font. Draw
  // sits at the board's foot, so a new board size moves it too. In the tabs' row it's off the board.
  useLayoutEffect(() => {
    const who = nameButton.current;
    if (!who) return;
    // On a large screen Draw mounts after the name, in the tab row's slot.
    const key = drawSlot.current;
    const measure = () => {
      setName((was) => kept(was, boxOf(who)));
      setDraw((was) => (large || !key ? null : kept(was, boxOf(key))));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(who);
    if (key) observer.observe(key);
    measure();
    return () => observer.disconnect();
  }, [size, large]);

  useEffect(() => {
    if (landingId) landed.add(landingId);
  }, [landingId]);

  // A given sticker has left the board: on its way, for its spot in the tray; received, for good.
  const onBoard = (stickers ?? []).filter(onTheBoard);
  // The gratitude mini-game's demo always sends gratitude for whichever sticker landed most recently.
  const newest = onBoard.reduce<BoardSticker | null>(
    (latest, s) => (!latest || s.createdAt > latest.createdAt ? s : latest),
    null,
  );
  const demoGiver = {
    handle: account.handle ?? me.displayName,
    displayName: me.displayName,
    pictureUrl: me.pictureUrl,
  };
  // The stat board's callbacks are stable, so the memoized stat board skips the board's renders.
  const demo = useRef({ newest, giver: demoGiver });
  useLayoutEffect(() => {
    demo.current = { newest, giver: demoGiver };
  });
  const tryGratitudeMiniGame = useCallback(() => {
    const { newest: sticker, giver } = demo.current;
    if (sticker) setGratitudeFor({ sticker, giver });
  }, []);
  const field = useMemo(() => size && fieldOf(size.W, size.H), [size]);
  const landedNow = useCallback(() => setLandingId(undefined), []);
  /** Drawn by someone other than the board's owner: it wears foil and names its artist. */
  const byOther = (s: BoardStickerView) => owner !== null && s.artist.id !== owner.id;
  const printedArtist = (s: BoardStickerView) =>
    s.artist.handle ? formatHandle(s.artist.handle) : s.artist.name;
  // A received sticker landing names its artist alone, greeted or not; otherwise the greeting names
  // every foil sticker's, once per app open.
  const arrived = onBoard.find((s) => s.id === arrivedId && byOther(s));
  const named = arrived ? [arrived] : owedGreeting ? onBoard.filter(byOther) : [];
  // Not while the board is turned over: the front is out of sight, and a greeting played there is spent unseen.
  const chips =
    chipsDone || failed || turned || !field || !size
      ? []
      : named.map((s) => ({
          id: s.id,
          artist: s.artist,
          box: stickerBox(field, size.U, s.placement, s),
        }));
  // The greeting is spent as it starts, so coming back to the board, or leaving early, doesn't replay it.
  const greeting = chips.length > 0;
  useEffect(() => {
    if (greeting) markGreeted(account.id);
  }, [greeting, account.id]);
  const freshSticker = freshId ? stickers?.find((s) => s.id === freshId) : undefined;

  /** Moves a sticker in the layout on screen; its spot in the other layout stays. */
  const setPlacement = (id: string, placement: Placement) =>
    setStickers(
      (list) =>
        list?.map((s) =>
          s.id === id ? { ...s, placements: movedIn(s.placements, layout, placement) } : s,
        ) ?? null,
    );

  // Selecting raises a sticker above the rest; the raise is saved with its next move. A tap that
  // selects a sticker drawn in Kyoto Seika Practice Mode peeks at its subjects.
  const select = (id: string | null, by?: "tap") => {
    setSelected(id);
    if (id) setChipsDone(true);
    if (!id || !stickers) return;
    const sticker = stickers.find((s) => s.id === id);
    if (by === "tap" && sticker?.kyotoSeikaSubjects)
      setPeek((was) => ({ id, n: (was?.n ?? 0) + 1 }));
    const z = zOnTop(stickers, id);
    if (sticker && z !== sticker.placement.z) setPlacement(id, { ...sticker.placement, z });
  };

  // Back into the sticker tray: off the board, with its spot kept for when it comes back out.
  const removeFromBoard = (id: string, steppedTo?: Placement) => {
    const sticker = stickers?.find((s) => s.id === id);
    if (!sticker) return;
    if (selected === id) setSelected(null);
    const placement = { ...(steppedTo ?? sticker.placement), on: false };
    setPlacement(id, placement);
    save(sticker, spotsIn(layout, placement));
  };

  const turnBack = useCallback(() => setTurned(false), []);
  // Turning over lets go of the selected sticker, so the board comes back without a stray toolbar.
  const turn = (over: boolean) => {
    if (!over) {
      turnBack();
      return;
    }
    setTurned(true);
    setWasTurned(true);
    // Chips still playing end with the turn, so they don't start over when the board turns back.
    if (greeting) setChipsDone(true);
    select(null);
  };
  // Back turns the stat board back over, as LINE's Back does on any overlay.
  useBackToClose(turned, () => turn(false));

  const { hold, stow, arrange, tabStop } = useBoardGestures({
    stage,
    stickers: onBoard,
    field,
    size,
    layout,
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
      save(sticker, spotsIn(layout, moved));
    },
    onRemove: removeFromBoard,
    onStepsSettled: tellSteps,
  });
  const stickerEl = (id: string) =>
    stage.current?.querySelector<HTMLElement>(`[data-sticker-id="${CSS.escape(id)}"]`) ?? null;
  /**
   * The spot of a sticker given, or in a gift, on the sticker tray's front sheet or the sheet pulled
   * out.
   */
  const givenSpot = (id: string) =>
    face?.querySelector<HTMLElement>(
      `.tray__sheet.is-top .tray__slot:is([data-state="given"], [data-state="inTheBag"], [data-state="onItsWay"])[data-id="${CSS.escape(id)}"]`,
    ) ?? null;
  // What the sticker tray asks of the board, all in board pixels.
  const trayBoard: TrayBoard = {
    stickerRect: (id) => {
      const s = onBoard.find((x) => x.id === id);
      if (!s || !field || !size) return null;
      const { x, y, w, h } = stickerBox(field, size.U, s.placement, s);
      return { x, y, w, h, r: s.placement.r };
    },
    sizeFor: (id) => {
      const s = stickers?.find((x) => x.id === id);
      return s && size ? sizeOf(size.U, s.placement.s, s) : { w: 0, h: 0 };
    },
    place: (id, at) => {
      const sticker = stickers?.find((s) => s.id === id);
      if (!stickers || !sticker || !field) return Promise.resolve(null);
      const spot = at
        ? { ...toFrac(field, at), s: sticker.placement.s, r: normalizeTurn(at.r) }
        : freeSpot(
            onBoard.map((s) => ({ placement: s.placement, art: s })),
            sticker,
            layout,
            size ?? PHONE_BOARD_SIZE,
          );
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
      save(sticker, spotsIn(layout, placement));
      const el = stickerEl(id);
      // Dropped, it presses flat; a tapped sticker's landing is the tray's to play.
      const lift = el?.querySelector<HTMLElement>(".placed-sticker__lift");
      if (at && lift) void playStick(lift, { reduced });
      return Promise.resolve(el);
    },
    remove: removeFromBoard,
    openGiven: (id) => setOpen({ id, mode: "given" }),
    openYours,
    pulse: (id) => {
      const sticker = stickerEl(id);
      // Its hole's Show it: a screen reader can't see the pulse, so focus goes to the sticker.
      sticker?.focus({ preventScroll: true });
      const lift = sticker?.querySelector<HTMLElement>(".placed-sticker__lift");
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
          { duration: 520, easing: EASE_OUT },
        );
    },
  };
  // The sticker tray skips the board's renders, so it's handed one side of the board that never
  // changes, each call reaching the board as it is now.
  const trayNow = useRef({ board: trayBoard, markSeen });
  useLayoutEffect(() => {
    trayNow.current = { board: trayBoard, markSeen };
  });
  const [traySide] = useState<TrayBoard>(() => ({
    stickerRect: (id) => trayNow.current.board.stickerRect(id),
    sizeFor: (id) => trayNow.current.board.sizeFor(id),
    place: (id, at) => trayNow.current.board.place(id, at),
    remove: (id) => trayNow.current.board.remove(id),
    pulse: (id) => trayNow.current.board.pulse(id),
    openGiven: (id) => trayNow.current.board.openGiven(id),
    openYours: (id) => trayNow.current.board.openYours(id),
  }));
  const onTraySeen = useCallback((ids: readonly string[]) => trayNow.current.markSeen(ids), []);
  const stack = stackOf(onBoard);
  const creases = useCreases({
    stickers: onBoard.toSorted((a, b) => (stack.get(a.id) ?? 0) - (stack.get(b.id) ?? 0)),
    field,
    unit: size?.U ?? null,
    foilOf: (s) =>
      boardFoil({ nsfw: s.nsfw, kyotoSeika: s.kyotoSeikaSubjects !== null, byOther: byOther(s) }),
    held: hold?.id,
  });
  // Screen readers and the arrow keys take the stickers in reading order, which is the DOM's too.
  const order = field
    ? readingOrder(onBoard.map((s) => ({ id: s.id, ...toPx(field, s.placement) })))
    : [];
  const onBoardById = new Map(onBoard.map((s) => [s.id, s]));
  const inOrder = order.flatMap((id) => onBoardById.get(id) ?? []);
  // Privy's SDK waits for the first-load chips too (whenBoardSettled), so its wallet frame doesn't
  // stutter them.
  const chipsOver = failed || (stickers !== null && field !== null && chips.length === 0);
  useEffect(() => {
    if (chipsOver) markChipsPlayed();
  }, [chipsOver]);
  // The stickers' one Tab stop: the one last focused, else the selected one, else the first.
  const tabbable = [tabStop, selected].find((id) => id && order.includes(id)) ?? order[0];
  const chosen = onBoard.find((s) => s.id === selected);
  const chosenBox = chosen && field && size && stickerBox(field, size.U, chosen.placement, chosen);
  // Where the knob would sit off the board or under the name, it hangs below the sticker.
  const knobBelow = Boolean(
    chosen && chosenBox && name && knobHidden({ ...chosenBox, r: chosen.placement.r }, name),
  );
  // A peek ends at once on a drag or a handle, letting go, another selection, the detail or a turn.
  if (peek && (peek.id !== selected || hold || open || turned)) setPeek(null);
  const peeked = peek && chosen?.id === peek.id ? chosen.kyotoSeikaSubjects : null;
  // The empty board's dashed spot, where the first sticker lands; a load error shows in it too.
  const blankAt = field && toPx(field, FIRST_SPOT);
  const blankStyle = blankAt ? { left: blankAt.x, top: blankAt.y } : undefined;
  // Until the first sticker, Draw says where to start; a drawing in progress has started.
  const firstVisit = stickers?.length === 0 && !drawKey.inProgress;
  // An empty board that still has stickers in the sticker tray points to the tray, not to Draw.
  const inTray = (stickers ?? []).some((s) => s.held && !onTheBoard(s));
  const unsavedStickers = (stickers ?? []).filter((s) => unsaved.has(s.id));
  const unsavedErrors = unsavedStickers.flatMap((s) => unsaved.get(s.id)?.error ?? []);

  const head = (
    <>
      <button
        ref={nameButton}
        // Its width is its own until a gifts badge needs the room opposite.
        className={`board-who ${waiting.length > 0 ? "" : "is-roomy"}`}
        onClick={() => turn(!turned)}
        onPointerDown={() => void StatBoard.preload()}
        onFocus={() => void StatBoard.preload()}
        aria-expanded={turned}
        aria-haspopup="dialog"
        aria-label={t(($) => $.stickerBoard.board.yourStats, { name: me.displayName })}
      >
        <PhotoSticker src={me.pictureUrl} name={me.displayName} size={42} />
        <span className="board-who-name">{me.displayName}</span>
        <CaretRight className="board-who-cue" size={14} weight="bold" aria-hidden />
      </button>

      {waiting.length > 0 && (
        <div className="board-gifts">
          {/* Gifts for you: they ask to be opened. */}
          <GiftsForYouBadge gifts={waiting} onOpen={onOpenGift} nudging={idle} />
        </div>
      )}
    </>
  );

  // The slot carries the first-sticker hop and ring, so the key keeps its own lip and press. The tickets
  // tuck behind the key's right end, in the slot beside it, so they hop along but never press. On a
  // large screen it stands in the tabs' row, where it can't turn away with the board, so it hides.
  const drawKeyGroup = (
    <>
      <span
        ref={drawSlot}
        className={`board-draw ${firstVisit ? "is-fresh" : ""} ${large && turned ? "is-away" : ""}`}
        inert={large && turned}
      >
        <Key
          size="compact"
          icon={<DrawIcon />}
          onClick={drawKey.draw}
          aria-label={
            drawKey.inProgress
              ? undefined
              : tickets
                ? t(($) => $.stickerBoard.board.drawLabelWithTickets, {
                    tickets: describeTickets(tickets),
                  })
                : t(($) => $.stickerBoard.board.drawLabel)
          }
        >
          {drawKey.inProgress
            ? t(($) => $.stickerBoard.board.continueDrawing)
            : t(($) => $.stickerBoard.board.draw)}
        </Key>
        {drawKey.shown && <DrawKeyTickets tickets={drawKey.shown} peel={drawKey.peeling} />}
      </span>
      {firstVisit && (
        <span className="board-nudge" aria-hidden>
          {t(($) => $.stickerBoard.board.firstSticker)}
        </span>
      )}
    </>
  );

  const front = (
    <div className="board" ref={setFace} data-resting={turned || gratitudeFor ? "" : undefined}>
      {/* Your name and Draw come before the stickers, so Tab reaches them first. On a large screen the
          name and the gifts share one row, so a long name gives way to the gifts rather than under them. */}
      {layout === "large" ? <div className="board-head">{head}</div> : head}

      <TabsLead>{drawKeyGroup}</TabsLead>
      {drawKey.overBoard}

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
            <span className="board-blank-note keep-phrases">
              {inTray
                ? t(($) => $.stickerBoard.board.blankWithTray)
                : t(($) => $.stickerBoard.board.blank)}
            </span>
          </div>
        )}
        <CreasesContext value={creases}>
          <KeepAnimations order={order.join(" ")} root={stage}>
            {field &&
              size &&
              inOrder.map((s, i) => (
                <Fragment key={s.id}>
                  <PlacedSticker
                    sticker={s}
                    field={field}
                    unit={size.U}
                    stack={stack.get(s.id) ?? 0}
                    selected={s.id === selected}
                    knobBelow={s.id === selected && knobBelow}
                    held={hold?.id === s.id ? hold.kind : undefined}
                    landing={s.id === landingId}
                    onLanded={landedNow}
                    reduced={reduced}
                    tabbable={s.id === tabbable}
                    position={i + 1}
                    setSize={order.length}
                    hintId={`${hints}-${s.id === selected ? "selected" : "focus"}`}
                    foil={byOther(s)}
                    veiled={veiledFor(s, optedIn)}
                    by={byOther(s) ? printedArtist(s) : undefined}
                  />
                  {/* Right after its sticker, so Tab reaches it next. */}
                  {s.id === selected && !hold && (
                    <StickerToolbar
                      label={formatNo(s.no)}
                      sticker={{ ...stickerBox(field, size.U, s.placement, s), r: s.placement.r }}
                      board={size}
                      knobBelow={knobBelow}
                      clearOf={draw}
                      {...(giftSender && { onGive: () => setGiving(s) })}
                      onView={() => openYours(s.id)}
                      onRemove={() => stow(s.id)}
                      arrange={{
                        open: arrangeOpen,
                        onOpen: openArrange,
                        onStep: (step) => arrange(s.id, step),
                      }}
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
          </KeepAnimations>
        </CreasesContext>
        <p ref={stepsSaid} className="board-steps-status visually-hidden" role="status" />
      </div>

      {peek && peeked && chosen && chosenBox && size && (
        <Suspense fallback={null}>
          <ThoughtLayer
            key={peek.n}
            subjects={peeked}
            sticker={{ ...chosenBox, r: chosen.placement.r }}
            board={size}
            knobBelow={knobBelow}
            trayEdge={TRAY_EDGE}
            reduced={reduced}
            onDone={() => setPeek(null)}
          />
        </Suspense>
      )}

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
            api={traySide}
            onSeen={onTraySeen}
            onProblem={addTrayProblem}
          />
        </Suspense>
      )}

      {board.state === "failed" && (
        <div className="board-blank board-problem" style={blankStyle}>
          <span className="board-blank-cut" aria-hidden />
          <ErrorLine detail={errorDetail(board.error)} onRetry={board.retry}>
            {t(($) => $.stickerBoard.board.didntLoad, { reason: errorMessage(board.error) })}
          </ErrorLine>
        </div>
      )}

      {(unsavedStickers.length > 0 || trayProblems.length > 0 || checkFailure || ticketsError) && (
        <div className="board-alerts">
          {ticketsError && (
            <ErrorLine detail={errorDetail(ticketsError)} onRetry={refreshTickets}>
              {t(($) => $.stickerBoard.board.ticketsDidntLoad, {
                reason: errorMessage(ticketsError),
              })}
            </ErrorLine>
          )}
          {unsavedStickers.length > 0 && (
            <ErrorLine
              detail={joinedDetails(unsavedErrors.map(errorDetail))}
              onRetry={() =>
                unsavedStickers.forEach((s) =>
                  save(s, spotsOf(s, unsaved.get(s.id)?.layouts ?? [])),
                )
              }
            >
              {t(($) => $.stickerBoard.board.unsaved, {
                count: unsavedStickers.length,
                stickers: new Intl.ListFormat(i18n.language).format(
                  unsavedStickers.map((s) => formatNo(s.no)),
                ),
                reasons: [...new Set(unsavedErrors.map(errorMessage))].join("; "),
              })}
            </ErrorLine>
          )}
          {trayProblems.length > 0 && (
            <ErrorLine
              detail={joinedDetails(trayProblems.map((p) => trayProblemWords(p).detail))}
              action={{
                label: t(($) => $.stickerBoard.tray.problem.dismiss),
                onClick: () => setTrayProblems([]),
              }}
            >
              {trayProblems.map((p) => (
                <span className="board-alerts__sentence" key={trayProblemKey(p)}>
                  {t(($) => $.stickerBoard.tray.problem[p.kind], {
                    stickers: new Intl.ListFormat(i18n.language).format(p.nos.map(formatNo)),
                    reason: trayProblemWords(p).reason,
                  })}
                </span>
              ))}
            </ErrorLine>
          )}
          {checkFailure && (
            <ErrorLine detail={errorDetail(checkFailure)} onRetry={() => setChecks((n) => n + 1)}>
              {t(($) => $.stickerBoard.board.gratitudeCheckFailed, {
                reason: errorMessage(checkFailure),
              })}
            </ErrorLine>
          )}
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
              // Given, it has left the board.
              if (sent) setSelected(null);
              // The bag's gift may have been packed, sent or taken out: the board loads where it is.
              setReloadForGift(true);
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
            // In the order they arrived, as the board loads them; among yours, those in a gift last.
            stickers={
              open.mode === "given"
                ? (stickers ?? []).filter((s) => !s.held)
                : inGiftsLast((stickers ?? []).filter((s) => s.held))
            }
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
              turned={turned}
              onFlipBack={turnBack}
              flipBackRef={flipBack}
              onTryGratitudeMiniGame={newest ? tryGratitudeMiniGame : null}
            />
          </Suspense>
        )
      }
    />
  );
}
