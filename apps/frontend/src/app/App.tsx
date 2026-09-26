import { useRef, useState } from "react";
import { artistByHandle } from "../artists/demoArtists";
import { ArtistBoard } from "../sticker-board/ArtistBoard";
import { StickerBoard } from "../sticker-board/StickerBoard";
import { DrawingScreen, type DrawingScreenHandle } from "../sticker-creation/DrawingScreen";
import { ExploreScreen } from "../explore/ExploreScreen";
import { TabBar, type Tab } from "./TabBar";
import "./App.css";

export default function App() {
  const drawingScreen = useRef<DrawingScreenHandle>(null);
  // The sticker board is home.
  const [view, setView] = useState<Tab | "draw">("board");
  // Set from the seal until the next sticker starts; the board lands it with a "stick" animation.
  const [sealedId, setSealedId] = useState<string>();
  // Someone else's sticker board, opened from Explore over it, so Explore keeps its search and scroll.
  const [visiting, setVisiting] = useState<string>();
  const visitedArtist = visiting ? artistByHandle.get(visiting) : undefined;

  // After a seal, Draw starts a new sticker; otherwise it resumes the one in progress.
  const openDrawing = () => {
    if (sealedId) drawingScreen.current?.startNewSticker();
    setView("draw");
  };

  return (
    <div className={`phone ${view === "draw" ? "tabs-tucked" : ""}`}>
      <div className="card">
        <DrawingScreen
          ref={drawingScreen}
          active={view === "draw"}
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
        // Drawing starts from your board, so My board stays current behind the draw screen.
        active={view === "draw" ? "board" : view}
        tucked={view === "draw"}
        onChange={(tab) => {
          drawingScreen.current?.closeDrawers();
          setView(tab);
          setVisiting(undefined);
        }}
      />
    </div>
  );
}
