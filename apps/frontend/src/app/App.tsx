import { useEffect, useRef, useState } from "react";
import { artistByHandle } from "../artists/demoArtists";
import { ArtistBoard } from "../sticker-board/ArtistBoard";
import { StickerBoard } from "../sticker-board/StickerBoard";
import { DrawingScreen, type DrawingScreenHandle } from "../sticker-creation/DrawingScreen";
import { ExploreScreen } from "../explore/ExploreScreen";
import { viewFromPath, type View } from "./openedView";
import { TabBar } from "./TabBar";
import { useFocusLoop } from "./useFocusLoop";
import "./App.css";

/** LINE's header shows the page title. */
const TITLES: Record<View, string> = {
  board: "Your sticker board",
  explore: "Explore",
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
        {view === "explore" && (
          <ExploreScreen onOpenArtist={setVisiting} onOpenMyBoard={() => setView("board")} />
        )}
        {view === "explore" && visitedArtist && (
          <ArtistBoard artist={visitedArtist} onBack={() => setVisiting(undefined)} />
        )}
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
    </div>
  );
}
