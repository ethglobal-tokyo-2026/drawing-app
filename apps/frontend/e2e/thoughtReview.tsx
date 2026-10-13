import { createRoot } from "react-dom/client";
import { i18next } from "../src/i18n/i18n";
import { ThoughtLayer } from "../src/sticker-board/ThoughtLayer";
import { THOUGHT_CUT } from "../src/sticker-board/thoughtCut.fixture";
import { knobBox } from "../src/sticker-board/placement";
import "../src/styles/fonts.css";
import "../src/styles/tokens.css";
import "../src/styles/base.css";

const query = new URLSearchParams(location.search);
await i18next.changeLanguage(query.get("lang") === "en" ? "en" : "ja");
const W = Number(query.get("width") ?? 390);
const at = { x: W / 2 - 34, y: 313, w: 245, h: 240, r: -27 };
const outline = `${THOUGHT_CUT.map((p, i) => `${i ? "L" : "M"}${p.x * 694} ${p.y * 704}`).join("")}Z`;
const silhouette = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 694 704"><path d="${outline}" fill="white" stroke="#888" stroke-width="3"/></svg>`)}`;
const src = query.has("actual")
  ? "https://stickeroo.art/api/images/0x143894c3fbf1fb9ea6359187326c77b0fd3e83de5e020d24bf90a80faf917fbc.display.webp"
  : silhouette;
const knob = knobBox(at, false);
const subjects = [
  { ja: "伝説", reading: "でんせつ", en: query.has("long") ? "graduation ceremony" : "legend" },
  { ja: "ひな", reading: "", en: query.has("long") ? "transformation" : "young bird" },
] as const;

/** Production thought layer at the reported phone position, with offline cut and optional actual art. */
export function ThoughtReview() {
  return (
    <div className="review-board" style={{ width: W }}>
      <div
        className="review-sticker"
        style={{
          left: at.x - at.w / 2,
          top: at.y - at.h / 2,
          width: at.w,
          height: at.h,
          rotate: `${at.r}deg`,
        }}
      >
        <div className="review-selection" />
        <img src={src} alt="" />
        <svg
          viewBox="0 0 694 704"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <path className="review-cut" d={outline} fill="none" />
        </svg>
      </div>
      <div
        className="review-knob"
        style={{
          left: knob.left,
          top: knob.top,
          width: knob.right - knob.left,
          height: knob.bottom - knob.top,
        }}
      />
      <div className="sticker-toolbar" style={{ width: W - 40 }} />
      <ThoughtLayer
        subjects={subjects}
        sticker={at}
        art={{ outline, width: 694, height: 704 }}
        board={{ W, H: 596 }}
        knobBelow={false}
        trayEdge={40}
        reduced
        onDone={() => {}}
      />
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("The thought review page has no root");
createRoot(root).render(<ThoughtReview />);
