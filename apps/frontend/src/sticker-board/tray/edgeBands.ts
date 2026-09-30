/** A stretch of the screen from `top` to `bottom`. */
interface Span {
  top: number;
  bottom: number;
}

/** The gap between the last dated edge and the +N button, which still counts as the last edge. */
export const EDGE_TAIL = 3;

/**
 * Which dated edge a press at height `y` means: 0 for the one just behind the front sheet, or null
 * for none. The edges are strips 15px tall, too thin to hit alone, so the front sheet's own foot,
 * the edges and the gap under the last are shared out evenly among them.
 */
export function edgeAt(y: number, frontFoot: Span, edges: readonly Span[]): number | null {
  const last = edges.at(-1);
  if (!last) return null;
  const top = frontFoot.top;
  const bottom = last.bottom + EDGE_TAIL;
  if (y < top || y >= bottom) return null;
  return Math.min(edges.length - 1, Math.floor(((y - top) / (bottom - top)) * edges.length));
}
