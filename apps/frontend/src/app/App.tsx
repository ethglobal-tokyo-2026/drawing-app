import { useRef, useState } from "react";
import { StickerBoard } from "../sticker-board/StickerBoard";
import { DrawingScreen, type DrawingScreenHandle } from "../sticker-creation/DrawingScreen";
import { ExploreScreen } from "./ExploreScreen";
import { TabBar, type Tab } from "./TabBar";
import "./App.css";

export default function App() {
  const drawingScreen = useRef<DrawingScreenHandle>(null);
  // The sticker board is home. Draw is the board's key, not a tab.
  const [view, setView] = useState<Tab | "draw">("board");
  // Set from the seal until the next sticker starts; the board lands it with a "stick" animation.
  const [sealedId, setSealedId] = useState<string>();

  // After a seal, Draw starts a new sticker; otherwise it resumes the one in progress.
  const openDrawing = () => {
    if (sealedId) drawingScreen.current?.startNewSticker();
    setView("draw");
  };

  return (
    <div className="phone">
      <div className="screen">
        <DrawingScreen
          ref={drawingScreen}
          active={view === "draw"}
          onSealed={setSealedId}
          onNewSticker={() => setSealedId(undefined)}
          onGoToBoard={() => setView("board")}
        />
        {view === "board" && <StickerBoard freshId={sealedId} onDraw={openDrawing} />}
        {view === "explore" && <ExploreScreen />}
      </div>
      <TabBar
        active={view === "draw" ? undefined : view}
        onChange={(tab) => {
          drawingScreen.current?.closeDrawers();
          setView(tab);
        }}
      />
    </div>
  );
}
