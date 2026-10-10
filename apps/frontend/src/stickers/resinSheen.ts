/** The band a sticker's live resin sweeps its sheen with, inside `host`. */
export const sheenIn = (host: ParentNode) => host.querySelector(".live-resin__sheen > b");

/** How far a band of the light leans from upright as it sweeps, its top ahead: the top left lights first. */
export const SHEEN_LEAN_DEG = 16;

/** A sheen sweeps across a sticker's live resin: as it lands, as it's picked up, as the phone tilts. */
export function sweepSheen(sheen: Element, duration = 760) {
  const lean = `skewX(${-SHEEN_LEAN_DEG}deg)`;
  sheen.animate(
    [
      { transform: `translateX(-140%) ${lean}`, opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { opacity: 1, offset: 0.75 },
      { transform: `translateX(260%) ${lean}`, opacity: 0 },
    ],
    { duration, easing: "cubic-bezier(0.3, 0.6, 0.2, 1)" },
  );
}
