import { useEffect, useRef, useState } from "react";
import { StickerBoard } from "../sticker-board/StickerBoard";
import { DrawingScreen, type DrawingScreenHandle } from "../sticker-creation/DrawingScreen";
import { ExploreScreen } from "./ExploreScreen";
import { TabBar, type Tab } from "./TabBar";
import { useFocusLoop } from "./useFocusLoop";
import "./App.css";

type View = Tab | "draw";

/** LINE's header shows the page title. */
const TITLES: Record<View, string> = {
  board: "Your sticker board",
  explore: "Explore",
  draw: "Draw",
};

export default function App() {
  const phone = useRef<HTMLDivElement>(null);
  const drawingScreen = useRef<DrawingScreenHandle>(null);
  // The sticker board is home. Draw is the board's key, not a tab.
  const [view, setView] = useState<View>("board");
  // Set from the seal until the next sticker starts; the board lands it with a "stick" animation.
  const [sealedId, setSealedId] = useState<string>();
  const drawing = view === "draw";

  useEffect(() => {
    document.title = TITLES[view];
  }, [view]);

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
        {view === "explore" && <ExploreScreen />}
      </div>
      <TabBar
        active={drawing ? undefined : view}
        tucked={drawing}
        onChange={(tab) => {
          drawingScreen.current?.closeDrawers();
          setView(tab);
        }}
      />
    </div>
  );
}
