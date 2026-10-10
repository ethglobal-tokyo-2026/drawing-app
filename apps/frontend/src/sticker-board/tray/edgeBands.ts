import { DEPTH_GAP } from "./trayModel";

/** A stretch of the screen from `top` to `bottom`. */
interface Span {
  top: number;
  bottom: number;
}

/**
 * Which dated edge a press at height `y` means: 0 for the one just behind the front sheet, or null
 * for none. The edges are strips one PEEK tall, too thin to hit alone, so the front sheet's own foot,
 * the edges and the gap under the last, above the +N button, are shared out evenly among them.
 */
export function edgeAt(y: number, frontFoot: Span, edges: readonly Span[]): number | null {
  const last = edges.at(-1);
  if (!last) return null;
  const top = frontFoot.top;
  const bottom = last.bottom + DEPTH_GAP;
  if (y < top || y >= bottom) return null;
  return Math.min(edges.length - 1, Math.floor(((y - top) / (bottom - top)) * edges.length));
}
