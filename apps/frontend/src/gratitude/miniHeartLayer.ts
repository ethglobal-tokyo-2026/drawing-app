import { FEEL_CONFIG } from "./gameConfig";
import { miniHeartSvg, stampHeartSvg, svgDataUrl } from "./heartArt";
import type { MiniHeart } from "./miniHeartPhysics";

export interface MiniHeartLayer {
  draw: (hearts: readonly MiniHeart[]) => void;
  clear: () => void;
}

const MINI_URLS = FEEL_CONFIG.miniHearts.tones.map((tone) => svgDataUrl(miniHeartSvg(tone)));
const RAIN_URL = svgDataUrl(stampHeartSvg());

interface Drawn {
  img: HTMLImageElement;
  transform: string;
  opacity: string;
  /** The last draw that had its heart. */
  frame: number;
}

/** Draws the physics' hearts as images: 昇天's rain behind the big heart, the rest in front of it. */
export function createMiniHeartLayer(layers: {
  front: HTMLElement;
  behind: HTMLElement;
}): MiniHeartLayer {
  const drawn = new Map<number, Drawn>();
  let frame = 0;

  const add = (heart: MiniHeart) => {
    const img = document.createElement("img");
    img.className = "gr-p";
    img.alt = "";
    img.src = heart.kind === "rain" ? RAIN_URL : MINI_URLS[heart.tone];
    img.style.width = img.style.height = `${heart.size.toFixed(1)}px`;
    (heart.kind === "rain" ? layers.behind : layers.front).append(img);
    const entry: Drawn = { img, transform: "", opacity: "", frame };
    drawn.set(heart.id, entry);
    return entry;
  };

  return {
    draw: (hearts) => {
      frame++;
      for (const heart of hearts) {
        const entry = drawn.get(heart.id) ?? add(heart);
        entry.frame = frame;
        const half = heart.size / 2;
        const transform = `translate(${(heart.x - half).toFixed(1)}px, ${(heart.y - half).toFixed(1)}px) rotate(${heart.rotation.toFixed(1)}deg) scale(${heart.scale.toFixed(3)})`;
        const opacity = heart.opacity.toFixed(3);
        // A settled heart keeps still, so most of the pile needs no style writes.
        if (transform !== entry.transform) {
          entry.transform = transform;
          entry.img.style.transform = transform;
        }
        if (opacity !== entry.opacity) {
          entry.opacity = opacity;
          entry.img.style.opacity = opacity;
        }
      }
      for (const [id, entry] of drawn) {
        if (entry.frame === frame) continue;
        entry.img.remove();
        drawn.delete(id);
      }
    },
    clear: () => {
      for (const entry of drawn.values()) entry.img.remove();
      drawn.clear();
    },
  };
}
