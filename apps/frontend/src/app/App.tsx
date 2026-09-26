import type { Person } from "@drawing-app/api/client";
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useApi } from "../api/useApi";
import { resendPendingGratitude } from "../gratitude/gratitudeOutbox";
import { useTranslation } from "../i18n/react";
import { StickerBoard } from "../sticker-board/StickerBoard";
import { DrawingScreen, type DrawingScreenHandle } from "../sticker-creation/DrawingScreen";
import { noteBootMilestone } from "../performance/bootMilestones";
import { markBoardComplete, usePreloadAfterBoard } from "../sticker-board/boardComplete";
import { lazyWithPreload } from "../ui/lazyWithPreload";
import { MotionPermissionCard } from "./MotionPermissionCard";
import { openedFrom, type View } from "./openedView";
import { changeScreen } from "./screenTransition";
import { ShopScreen } from "./ShopScreen";
import { TabBar } from "./TabBar";
import { useFocusLoop } from "./useFocusLoop";
import "./App.css";

// Explore is a tab away, so its code loads once the board is complete.
const ExploreScreen = lazyWithPreload("Explore", () =>
  import("../explore/ExploreScreen").then((m) => m.ExploreScreen),
);
const OPENED_FROM_TABS = [ExploreScreen];
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

export default function App() {
  const { t } = useTranslation();
  const api = useApi();
  const phone = useRef<HTMLDivElement>(null);
  const drawingScreen = useRef<DrawingScreenHandle>(null);
  // The sticker board is home. Draw is the board's key, not a tab. A chat menu link opens its own
  // screen; a gift message's link opens its gift over the board.
  const [opened] = useState(() => openedFrom(location.pathname));
  const [view, setView] = useState<View>(opened.view);
  // Held in memory while ReceiveGiftDialog is open over the board.
  const [giftClaimToken, setGiftClaimToken] = useState(opened.giftClaimToken);
  // Set from the seal until the next sticker starts, when Draw starts a new one.
  const [sealedId, setSealedId] = useState<string>();
  // The sticker that last arrived, sealed or received; the board lands it with a "stick" animation.
  const [freshId, setFreshId] = useState<string>();
  // A received gift mounts the board again, so it loads with the sticker on it.
  const [boardLoads, setBoardLoads] = useState(0);
  // Someone else's sticker board, opened from Explore over it, so Explore keeps its search and scroll.
  const [visiting, setVisiting] = useState<Person>();
  const drawing = view === "draw";
  usePreloadAfterBoard(OPENED_FROM_TABS);

  // The app renders once you're signed in to the server. Opened on another screen, there's no board
  // to wait for.
  useLayoutEffect(() => {
    noteBootMilestone("signed in");
    if (opened.view !== "board") markBoardComplete();
  }, [opened]);

  useEffect(() => {
    if (view === "explore") void ArtistBoard.preload();
  }, [view]);

  // Gratitude that hadn't reached the server when the app last closed goes again as it starts.
  useEffect(() => {
    void resendPendingGratitude(api);
  }, [api]);

  useEffect(() => {
    // While a gift is open, its dialog names the page.
    if (!giftClaimToken) document.title = t(($) => $.app.pageTitles[view]);
  }, [view, giftClaimToken, t]);

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
  };

  // The drawing screen tucks the tabs away so the sheet gets the room.
  return (
    <div ref={phone} className={`phone ${drawing ? "has-tucked-tabs" : ""}`}>
      <div className="screen">
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
        {view === "board" && (
          <StickerBoard key={boardLoads} freshId={freshId} onDraw={openDrawing} />
        )}
        {/* Each in its own boundary, so Explore stays up while an artist's board loads over it. */}
        {view === "explore" && (
          <Suspense fallback={null}>
            <ExploreScreen
              boardOf={opened.boardOf}
              onOpenArtist={setVisiting}
              onOpenMyBoard={() => setView("board")}
            />
          </Suspense>
        )}
        {view === "explore" && visiting && (
          <Suspense fallback={null}>
            <ArtistBoard
              key={visiting.id}
              person={visiting}
              onBack={() => setVisiting(undefined)}
            />
          </Suspense>
        )}
        {view === "shop" && <ShopScreen onDraw={openDrawing} />}
      </div>
      <TabBar
        active={drawing ? undefined : view}
        tucked={drawing}
        onChange={(tab) => {
          drawingScreen.current?.closeDrawers();
          changeScreen(() => {
            setView(tab);
            setVisiting(undefined);
          });
        }}
      />
      <MotionPermissionCard />
      {giftClaimToken && (
        // Liner while ReceiveGiftDialog's code loads, so the board doesn't show first.
        <Suspense fallback={<div style={GIFT_LOADING} />}>
          <ReceiveGiftDialog
            giftClaimToken={giftClaimToken}
            onClose={(receivedId) => {
              setGiftClaimToken(undefined);
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
