/** The band a sticker's live resin sweeps its sheen with, inside `host`. */
export const sheenIn = (host: ParentNode) => host.querySelector(".live-resin__sheen > b");

/** A sheen sweeps across a sticker's live resin: as it lands, as it's picked up, as the phone tilts. */
export function sweepSheen(sheen: Element, duration = 760) {
  sheen.animate(
    [
      { transform: "translateX(-140%) skewX(-16deg)", opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { opacity: 1, offset: 0.75 },
      { transform: "translateX(260%) skewX(-16deg)", opacity: 0 },
    ],
    { duration, easing: "cubic-bezier(0.3, 0.6, 0.2, 1)" },
  );
}
