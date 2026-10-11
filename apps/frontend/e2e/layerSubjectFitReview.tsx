import { createRoot } from "react-dom/client";
import { CornerPrint } from "../src/kyoto-seika/CornerPrint";
import subjects from "../src/kyoto-seika/subjects/subjects.json";
import { i18next } from "../src/i18n/i18n";
import { HistoryButtons } from "../src/sticker-creation/tools/HistoryButtons";
import { MyBoardTile } from "../src/sticker-creation/tools/MyBoardTile";
import { SealKey } from "../src/sticker-creation/SealKey";
import "../src/styles/fonts.css";
import "../src/styles/tokens.css";
import "../src/styles/base.css";
import "../src/styles/keys.css";
import "../src/sticker-creation/DrawingScreen.css";

const query = new URLSearchParams(location.search);
const language = query.get("lang") === "ja" ? "ja" : "en";
await i18next.changeLanguage(language);
document.documentElement.lang = language;
const pair =
  query.get("pair") === "unbroken"
    ? ["入院", "管理人"]
    : language === "ja"
      ? ["アーティスト", "宇宙飛行士"]
      : ["見合い", "高校生"];
const first = subjects.find((subject) => subject.ja === pair[0]);
const second = subjects.find((subject) => subject.ja === pair[1]);
if (!first || !second) throw new Error("The subject fit fixture has no matching pair");
const root = document.getElementById("root");
if (!root) throw new Error("The subject fit fixture has no root");
createRoot(root).render(
  <div className="drawing-screen" data-hand={query.get("hand") ?? "right"}>
    <HistoryButtons
      canUndo={false}
      canRedo={false}
      undoRef={null}
      onUndo={() => {}}
      onRedo={() => {}}
    />
    <MyBoardTile onOpen={() => {}} />
    <SealKey shown problem={null} onTap={() => {}} />
    <CornerPrint subjects={[first, second]} />
  </div>,
);
