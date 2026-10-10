import type { LayerId } from "../canvas/ops";

/** Every chip in the layer list, in the order the column shows them: front layer first. */
export const chipsIn = (list: HTMLElement): HTMLElement[] =>
  Array.from(list.querySelectorAll<HTMLElement>("[data-layer-chip]"));

/** The layer a chip shows. */
export const layerOf = (chip: HTMLElement): LayerId => Number(chip.dataset.layerChip);

/** A chip at rest: where its center is, in client px, and how tall it is. */
export interface Rest {
  chip: HTMLElement;
  center: number;
  height: number;
}

/**
 * Where each chip rests. The lift and the pen's magnifier both leave a transform and a transition on
 * chips, and a transformed chip's box is not where it rests, so both are cleared first, instantly.
 */
export function measureRests(chips: readonly HTMLElement[]): Rest[] {
  for (const chip of chips) {
    chip.style.transition = "none";
    chip.style.transform = "";
  }
  return chips.map((chip) => {
    const box = chip.getBoundingClientRect();
    return { chip, center: box.top + box.height / 2, height: box.height };
  });
}

/** What one slot is worth in px: the distance between chip centers, averaged. */
export function pitchOf(rests: readonly Rest[]): number {
  const first = rests.at(0);
  const last = rests.at(-1);
  if (!first || !last) return 0;
  return rests.length > 1 ? (last.center - first.center) / (rests.length - 1) : first.height;
}

/** The chips back at rest at once, with nothing the hooks put on them left. */
export function snap(chips: Iterable<HTMLElement>, list: HTMLElement) {
  const all = Array.from(chips);
  for (const { style } of all) {
    style.transition = "none";
    style.transform = "";
    style.transformOrigin = "";
    style.boxShadow = "";
    style.zIndex = "";
  }
  // The change commits while transitions are off, which is what makes it instant.
  void list.offsetHeight;
  for (const { style } of all) style.transition = "";
}

/** A vertical shift as a CSS length. */
export const px = (n: number): string => `${n.toFixed(2)}px`;
