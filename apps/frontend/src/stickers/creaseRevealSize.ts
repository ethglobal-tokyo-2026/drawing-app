/** Size the fixed diagonal feather while its content keeps the sticker's position. */
export function setCreaseRevealSize(el: HTMLElement, width: number, height: number) {
  if (
    el.style.getPropertyValue("--crease-width") === `${width}px` &&
    el.style.getPropertyValue("--crease-height") === `${height}px`
  )
    return;
  el.style.setProperty("--crease-width", `${width}px`);
  el.style.setProperty("--crease-height", `${height}px`);
  el.style.setProperty("--crease-diagonal", `${(width + height) * Math.SQRT1_2}px`);
  el.style.setProperty("--crease-distance", `${(width + height) * 0.6}px`);
}
