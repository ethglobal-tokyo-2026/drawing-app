import { createRoot } from "react-dom/client";
import { acquireLight, currentLight, installLight } from "../src/stickers/light";
import { STILL_POSE } from "../src/stickers/lightMode";
import { StickerMaterial } from "../src/stickers/StickerMaterial";
import "../src/styles/tokens.css";

// One gloss sticker of black ink filling most of the screen, centered: its only light is the room's
// reflection, so the ceiling light's glare stands out wherever the pose puts it.
const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">${body}</svg>`)}`;
const print = svg('<rect width="600" height="800" fill="black"/>');
const cut = svg('<rect width="600" height="800" fill="white"/>');

document.body.style.cssText =
  "margin:0;background:#777;height:100vh;display:grid;place-items:center";
const uninstall = installLight(document.documentElement);
const releaseLight = acquireLight();
window.addEventListener(
  "pagehide",
  () => {
    releaseLight();
    uninstall();
  },
  { once: true },
);
declare global {
  interface Window {
    /** The still pose is the page's own device class's, which a spec can't read outside it. */
    lightSweepsFixture: { getPose: typeof currentLight; stillPose: typeof STILL_POSE };
  }
}
window.lightSweepsFixture = { getPose: currentLight, stillPose: STILL_POSE };

const root = document.getElementById("root");
if (!root) throw new Error("The light sweeps fixture root is missing");
createRoot(root).render(
  <div
    data-sweep-sticker
    style={{
      position: "relative",
      height: "min(100vh - 40px, (100vw - 40px) * 4 / 3)",
      aspectRatio: "3 / 4",
    }}
  >
    <StickerMaterial print={print} cut={cut} />
  </div>,
);
