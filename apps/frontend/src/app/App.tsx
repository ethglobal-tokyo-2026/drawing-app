import type { Person } from "@drawing-app/api/client";
import {
  Activity,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { flushSync } from "react-dom";
import { useMe } from "../api/meContext";
import { useApi } from "../api/useApi";
import { reportKeptSends } from "../giving/sentReports";
import { resendGratitudeWhenReachable } from "../gratitude/gratitudeOutbox";
import { useTranslation } from "../i18n/react";
import { startPrivy } from "../identity/privyStart";
import { ShopScreen } from "../shop/ShopScreen";
import { whenBoardSettled } from "../sticker-board/boardSettled";
import { StickerBoard } from "../sticker-board/StickerBoard";
import type { DrawingScreenHandle } from "../sticker-creation/DrawingScreen";
import { noteBootMilestone } from "../performance/bootMilestones";
import { markBoardComplete, usePreloadAfterBoard } from "../sticker-board/boardComplete";
import { forgetBoardUnlessFor } from "../sticker-board/lastBoard";
import { ReserveTicketCheckout } from "../tickets/ReserveTicketCheckout";
import { preloadReservePacks } from "../tickets/reservePacks";
import {
  unaddedPurchaseToShow,
  useAddUnaddedPurchases,
  useUnaddedPurchases,
} from "../tickets/unaddedPurchases";
import { lazyWithPreload } from "../ui/lazyWithPreload";
import { useReducedMotion } from "../ui/useReducedMotion";
import { MotionPermissionCard } from "./MotionPermissionCard";
import type { GiftFrom } from "../receiving/ReceiveGiftDialog";
import { openedFrom, type View } from "./openedView";
import { TabBar, type Tab } from "./TabBar";
import { useFocusLoop } from "./useFocusLoop";
import "./App.css";

// Explore is a tab away, so its code loads once the board is complete. Once visited, it stays
// mounted but hidden between visits, so its search, scroll and pile are as they were on a return.
const ExploreScreen = lazyWithPreload("Explore", () =>
  import("../explore/ExploreScreen").then((m) => m.ExploreScreen),
);
// The drawing screen loads once the board is complete too, or at once when Draw opens it first.
// Mounted, it stays under the other screens, so a sticker in progress survives a tab change, and it
// picks up a sheet kept across a reload as it mounts.
const DrawingScreen = lazyWithPreload("the drawing screen", () =>
  import("../sticker-creation/DrawingScreen").then((m) => m.DrawingScreen),
);
const AFTER_THE_BOARD = [ExploreScreen, DrawingScreen];
// Someone else's sticker board opens from Explore, so its code loads once Explore is open.
const ArtistBoard = lazyWithPreload("someone else's sticker board", () =>
  import("../sticker-board/ArtistBoard").then((m) => m.ArtistBoard),
);
// Only a gift message's link opens a gift, so its code loads when one does.
const ReceiveGiftDialog = lazyWithPreload("the gift", () =>
  import("../receiving/ReceiveGiftDialog").then((m) => m.ReceiveGiftDialog),
);
const GIFT_LOADING: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: "var(--z-sheet)",
  background: "var(--liner)",
};
const DRAWING_LOADING: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "var(--liner)",
};

const EXPLORE_CONTROLS = 'button, a[href], input, [role="button"]';

/** The control in Explore that a click or focus reached, unless it's in one of Explore's sheets. */
const explorePlaceOf = (target: EventTarget) => {
  const control = target instanceof Element ? target.closest<HTMLElement>(EXPLORE_CONTROLS) : null;
  return control && !control.closest('[role="dialog"]') ? control : null;
};

/** The drawing screen's place while its code loads: plain Liner, and one line for screen readers. */
function DrawingScreenLoading() {
  const { t } = useTranslation();
  return (
    <div style={DRAWING_LOADING}>
      <p className="visually-hidden" role="status">
        {t(($) => $.app.drawingLoading)}
      </p>
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  const api = useApi();
  const me = useMe();
  const phone = useRef<HTMLDivElement>(null);
  const drawingScreen = useRef<DrawingScreenHandle>(null);
  // The sticker board is home. Draw is the board's key, not a tab. A chat menu link opens its own
  // screen; a gift message's link opens its gift over the board.
  const [opened] = useState(() => openedFrom(location.pathname));
  const [view, setView] = useState<View>(opened.view);
  const [exploredHere, setExploredHere] = useState(view === "explore");
  if (view === "explore" && !exploredHere) setExploredHere(true);
  // The tab whose screen is settling in after a tab change (App.css), until its animation ends.
  const [arriving, setArriving] = useState<Tab | null>(null);
  const reduced = useReducedMotion();
  // The gift ReceiveGiftDialog shows over the board: a gift message's link's token, held in memory
  // while it's open, or a gift waiting for you, opened from the board's badge.
  const [giftOpening, setGiftOpening] = useState<GiftFrom | undefined>(() =>
    opened.giftClaimToken ? { giftClaimToken: opened.giftClaimToken } : undefined,
  );
  // Set from the seal until the next sticker starts, when Draw starts a new one.
  const [sealedId, setSealedId] = useState<string>();
  // The sticker that last arrived, sealed or received; the board lands it with a "stick" animation.
  const [freshId, setFreshId] = useState<string>();
  // A received gift mounts the board again, so it loads with the sticker on it.
  const [boardLoads, setBoardLoads] = useState(0);
  // Previewing can assign a gift to this person even when they leave it for later.
  const [giftClosures, setGiftClosures] = useState(0);
  // Someone else's sticker board, opened from Explore over it, so Explore keeps its search and scroll.
  const [visiting, setVisiting] = useState<Person>();
  // Where you were in Explore, which Back returns focus to.
  const explorePlace = useRef<HTMLElement | null>(null);
  const rememberPlace = (target: EventTarget) => {
    explorePlace.current = explorePlaceOf(target) ?? explorePlace.current;
  };
  // The reserve ticket checkout, opened from the Shop over the whole phone, tabs and all.
  const [checkingOut, setCheckingOut] = useState(false);
  const drawing = view === "draw";
  const afterTheBoard = usePreloadAfterBoard(AFTER_THE_BOARD);
  // The Shop's prices load with the screens' code, so the Shop opens on them.
  useEffect(() => {
    if (afterTheBoard) preloadReservePacks(api);
  }, [afterTheBoard, api]);
  // Draw opened the drawing screen, so it stays mounted from then on.
  const [drewHere, setDrewHere] = useState(drawing);
  if (drawing && !drewHere) setDrewHere(true);

  // The app renders once you're signed in to the server, and a board this phone kept for someone
  // else goes. Opened on another screen, there's no board to wait for.
  useLayoutEffect(() => {
    noteBootMilestone("signed in");
    forgetBoardUnlessFor(me.id);
    if (opened.view !== "board") markBoardComplete();
  }, [opened, me.id]);

  useEffect(() => {
    if (view === "explore") void ArtistBoard.preload();
  }, [view]);

  // Your gratitude that hadn't reached the server goes again as the app starts, and whenever the
  // phone is back online or the app is back in front.
  useEffect(() => resendGratitudeWhenReachable(api, me.id), [api, me.id]);
  // So does word of a Gift Message that went out while the server couldn't hear it.
  useEffect(() => void reportKeptSends(api, me.id), [api, me.id]);
  // Paid packs whose tickets the server hadn't added are asked for again too.
  useAddUnaddedPurchases();
  // One that still waits, or was refused, puts a pip on the Shop tab, where the Shop says why.
  const keptPayment = unaddedPurchaseToShow(useUnaddedPurchases());

  // Privy's SDK waits for the board to settle, so it doesn't hold up the stickers. A gift needs
  // it at once, and any other screen has no board to wait for.
  useEffect(() => {
    if (giftOpening) startPrivy("gift-link");
    else if (view !== "board") startPrivy("elsewhere");
    else void whenBoardSettled().then(() => startPrivy("board-settled"));
  }, [giftOpening, view]);

  useEffect(() => {
    // While a gift is open, its dialog names the page.
    if (!giftOpening) document.title = t(($) => $.app.pageTitles[view]);
  }, [view, giftOpening, t]);

  // Once opened, a link's path goes, so a reload after moving on doesn't jump back to it, and a
  // reload with a gift open lands on the board: the gift message opens it again.
  useEffect(() => {
    if (opened.view === "board" && !opened.giftClaimToken) return;
    const url = new URL(location.href);
    url.pathname = "/";
    history.replaceState(history.state, "", url);
  }, [opened]);

  // While drawing, the drawing screen's controls and the grabber are all there is to focus.
  useFocusLoop(phone, drawing);

  // After a seal, Draw starts a new sticker; otherwise it resumes the one in progress.
  const openDrawing = () => {
    if (sealedId) drawingScreen.current?.startNewSticker();
    setView("draw");
    setArriving(null);
  };

  // The new screen shows at once and takes taps from its first frame; only its look settles in.
  const changeTab = (tab: Tab) => {
    drawingScreen.current?.closeDrawers();
    if (tab !== view || visiting) setArriving(reduced ? null : tab);
    setView(tab);
    setVisiting(undefined);
  };

  // The drawing screen tucks the tabs away so the sheet gets the room.
  return (
    <div ref={phone} className={`phone ${drawing ? "has-tucked-tabs" : ""}`}>
      <div
        className="screen"
        data-arriving={arriving !== null && arriving === view ? "" : undefined}
        onAnimationEnd={(e) => {
          if (e.animationName === "screen-in") setArriving(null);
        }}
      >
        {(afterTheBoard || drewHere) && (
          // Draw tapped before its code is in holds on plain Liner for the moment it takes.
          <Suspense fallback={drawing ? <DrawingScreenLoading /> : null}>
            <DrawingScreen
              ref={drawingScreen}
              active={drawing}
              onSealed={(id) => {
                setSealedId(id);
                setFreshId(id);
              }}
              onNewSticker={() => setSealedId(undefined)}
              onGoToBoard={() => setView("board")}
            />
          </Suspense>
        )}
        {view === "board" && (
          <StickerBoard
            key={boardLoads}
            freshId={freshId}
            giftClosures={giftClosures}
            onDraw={openDrawing}
            onOpenGift={(gift) => setGiftOpening({ gift })}
          />
        )}
        {/* Each in its own boundary, so Explore stays up while an artist's board loads over it. */}
        {exploredHere && (
          // Hidden, it takes no layout, paint or focus, and its effects (loads, timers, frame loops)
          // stop until it shows again.
          <Activity mode={view === "explore" ? "visible" : "hidden"}>
            {/* Inert under their board, so Tab and screen readers stay on it. */}
            <div
              className="screen-layer"
              inert={visiting !== undefined}
              onFocusCapture={(e) => rememberPlace(e.target)}
              onClickCapture={(e) => rememberPlace(e.target)}
            >
              <Suspense fallback={null}>
                <ExploreScreen onOpenArtist={setVisiting} onOpenMyBoard={() => setView("board")} />
              </Suspense>
            </div>
          </Activity>
        )}
        {view === "explore" && visiting && (
          <Suspense fallback={null}>
            <ArtistBoard
              key={visiting.id}
              person={visiting}
              onBack={() => {
                flushSync(() => setVisiting(undefined));
                explorePlace.current?.focus({ preventScroll: true });
              }}
            />
          </Suspense>
        )}
        {view === "shop" && <ShopScreen onBuyReserveTickets={() => setCheckingOut(true)} />}
      </div>
      <TabBar
        active={drawing ? undefined : view}
        unaddedTickets={keptPayment && (keptPayment.refusal ? "refused" : "waiting")}
        tucked={drawing}
        onChange={changeTab}
      />
      {checkingOut && view === "shop" && (
        <ReserveTicketCheckout
          onDraw={() => {
            setCheckingOut(false);
            openDrawing();
          }}
          onClose={() => setCheckingOut(false)}
        />
      )}
      <MotionPermissionCard />
      {giftOpening && (
        // Liner while ReceiveGiftDialog's code loads, so the board doesn't show first.
        <Suspense fallback={<div style={GIFT_LOADING} />}>
          <ReceiveGiftDialog
            from={giftOpening}
            onClose={(receivedId) => {
              setGiftOpening(undefined);
              setGiftClosures((n) => n + 1);
              if (!receivedId) return;
              setFreshId(receivedId);
              setBoardLoads((n) => n + 1);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
