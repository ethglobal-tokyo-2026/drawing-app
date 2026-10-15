import type { LiftOrigin } from "../sticker-board/detailLift";

/** How far a throw has turned a sticker from its spot, as usePilePlay's transform turns it. */
const spunOf = (item: HTMLElement) =>
  Number(/rotate\((-?[\d.]+)deg\)/.exec(item.style.transform)?.[1] ?? 0);

/**
 * Where a sticker sits in Explore's pile, for the lifted view to fly it from and back to: its box
 * before its turn, inside the button that holds it, and the turn, with however far a throw spun it.
 */
export function pileOrigin(id: string): LiftOrigin | null {
  const item = document.querySelector<HTMLElement>(
    `.pile-sticker[data-pile-id="${CSS.escape(id)}"]`,
  );
  const el = item?.querySelector<HTMLElement>(".pile-sticker__drop");
  return item && el ? { el, turn: Number(item.dataset.turn ?? 0) + spunOf(item) } : null;
}
