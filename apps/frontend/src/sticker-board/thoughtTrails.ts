import type { Bead } from "../kyoto-seika/balloonGeometry";
import type { ThoughtEdgeGap } from "./thoughtGeometry";

/** The final bubble stops this far short of the sticker's cut, in board pixels. */
const THOUGHT_TIP_GAP_PX = 2;

/** Short trails fit between the two visible outlines; fewer dots fit a tighter space. */
export function thoughtTrail(gap: ThoughtEdgeGap, radii: readonly number[]): Bead[] {
  if (gap.overlapping || gap.distance < 13) return [];
  // A crowded small sticker may need a cloud beyond its controls. Extra dots keep both ends connected.
  const extended = [
    ...Array.from({ length: Math.max(0, Math.ceil((gap.distance - 40) / 16)) }, () => radii[0]),
    ...radii,
  ];
  const dx = (gap.from.x - gap.to.x) / gap.distance;
  const dy = (gap.from.y - gap.to.y) / gap.distance;
  for (let count = extended.length; count > 0; count--) {
    const sizes = extended.slice(-count);
    const end = sizes[count - 1] + THOUGHT_TIP_GAP_PX;
    // A cloud's ink reaches 4px past its white; keep 3px between that ink and the first dot.
    const available = gap.distance - end - sizes[0] - 7;
    const spacing = Math.max(0, ...sizes.slice(1).map((radius, i) => radius + sizes[i] + 2));
    if (available < spacing * (count - 1)) continue;
    const span = Math.min(available, 15.9 * (count - 1));
    return sizes.map((r, i) => {
      const distance = end + (count === 1 ? 0 : span * (1 - i / (count - 1)));
      return { x: gap.to.x + dx * distance, y: gap.to.y + dy * distance, r };
    });
  }
  return [];
}
