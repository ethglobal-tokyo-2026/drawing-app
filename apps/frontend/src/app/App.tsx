import { Suspense, useEffect, useRef, useState } from "react";
import { artistByHandle } from "../artists/demoArtists";
import { StickerBoard } from "../sticker-board/StickerBoard";
import { DrawingScreen, type DrawingScreenHandle } from "../sticker-creation/DrawingScreen";
import { lazyWithPreload, usePreloadWhenIdle } from "../ui/lazyWithPreload";
import { MotionPermissionCard } from "./MotionPermissionCard";
import { viewFromPath, type View } from "./openedView";
import { ShopScreen } from "./ShopScreen";
import { TabBar } from "./TabBar";
import { useFocusLoop } from "./useFocusLoop";
import "./App.css";

// Explore is a tab away, so its code loads once the app is idle.
const ExploreScreen = lazyWithPreload("Explore", () =>
  import("../explore/ExploreScreen").then((m) => m.ExploreScreen),
);
const OPENED_FROM_TABS = [ExploreScreen];
// Someone else's sticker board opens from Explore, so its code loads once Explore is open.
const ArtistBoard = lazyWithPreload("someone else's sticker board", () =>
  import("../sticker-board/ArtistBoard").then((m) => m.ArtistBoard),
);

/** LINE's header shows the page title. */
const TITLES: Record<View, string> = {
  board: "Your sticker board",
  explore: "Explore",
  shop: "Shop",
  draw: "Draw",
};

export default function App() {
  const phone = useRef<HTMLDivElement>(null);
  const drawingScreen = useRef<DrawingScreenHandle>(null);
  // The sticker board is home. Draw is the board's key, not a tab. A chat menu link opens its own screen.
  const [view, setView] = useState<View>(() => viewFromPath(location.pathname));
  // Set from the seal until the next sticker starts; the board lands it with a "stick" animation.
  const [sealedId, setSealedId] = useState<string>();
  // Someone else's sticker board, opened from Explore over it, so Explore keeps its search and scroll.
  const [visiting, setVisiting] = useState<string>();
  const visitedArtist = visiting ? artistByHandle.get(visiting) : undefined;
  const drawing = view === "draw";
  usePreloadWhenIdle(OPENED_FROM_TABS);

  useEffect(() => {
    if (view === "explore") void ArtistBoard.preload();
  }, [view]);

  useEffect(() => {
    document.title = TITLES[view];
  }, [view]);

  // Once opened, a menu link's path goes, so a reload after moving on doesn't jump back to it.
  useEffect(() => {
    if (viewFromPath(location.pathname) === "board") return;
    const url = new URL(location.href);
    url.pathname = "/";
    history.replaceState(history.state, "", url);
  }, []);

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
          onSealed={setSealedId}
          onNewSticker={() => setSealedId(undefined)}
          onGoToBoard={() => setView("board")}
        />
        {view === "board" && <StickerBoard freshId={sealedId} onDraw={openDrawing} />}
        {/* Each in its own boundary, so Explore stays up while an artist's board loads over it. */}
        {view === "explore" && (
          <Suspense fallback={null}>
            <ExploreScreen onOpenArtist={setVisiting} onOpenMyBoard={() => setView("board")} />
          </Suspense>
        )}
        {view === "explore" && visitedArtist && (
          <Suspense fallback={null}>
            <ArtistBoard artist={visitedArtist} onBack={() => setVisiting(undefined)} />
          </Suspense>
        )}
        {view === "shop" && <ShopScreen onDraw={openDrawing} />}
      </div>
      <TabBar
        active={drawing ? undefined : view}
        tucked={drawing}
        onChange={(tab) => {
          drawingScreen.current?.closeDrawers();
          setView(tab);
          setVisiting(undefined);
        }}
      />
      <MotionPermissionCard />
    </div>
  );
}
