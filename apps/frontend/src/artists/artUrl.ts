import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ART, type ArtKey } from "./art";
import type { ArtistAvatar } from "./demoArtists";

/** The art's own box; board stickers and pictures size from it. */
export const ART_SIZE = 100;

const svgUrl = (markup: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

// A white die-cut border: the art's silhouette dilated, flooded white, under the art.
const DIE_CUT = createElement(
  "filter",
  { id: "cut", x: "-10%", y: "-10%", width: "120%", height: "120%" },
  createElement("feMorphology", { in: "SourceAlpha", operator: "dilate", radius: 3, result: "d" }),
  createElement("feFlood", { floodColor: "#fff" }),
  createElement("feComposite", { in2: "d", operator: "in", result: "w" }),
  createElement(
    "feMerge",
    null,
    createElement("feMergeNode", { in: "w" }),
    createElement("feMergeNode", { in: "SourceGraphic" }),
  ),
);

const cache = new Map<string, string>();

function cached(key: string, make: () => string) {
  let url = cache.get(key);
  if (!url) {
    url = make();
    cache.set(key, url);
  }
  return url;
}

/** A demo sticker as an image, with its white die-cut border, for the board's sticker figure. */
export const stickerArtUrl = (art: ArtKey) =>
  cached(`sticker:${art}`, () =>
    svgUrl(
      renderToStaticMarkup(
        createElement(
          "svg",
          {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "-6 -6 112 112",
            width: 224,
            height: 224,
          },
          createElement("defs", null, DIE_CUT),
          createElement("g", { filter: "url(#cut)" }, ART[art]),
        ),
      ),
    ),
  );

/** A demo artist's picture as an image: their art on their color, standing in for a LINE picture. */
export const avatarUrl = (avatar: ArtistAvatar) =>
  cached(`avatar:${avatar.art}:${avatar.bg}`, () =>
    svgUrl(
      renderToStaticMarkup(
        createElement(
          "svg",
          { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 100 100", width: 200, height: 200 },
          createElement("rect", { width: 100, height: 100, fill: avatar.bg }),
          createElement("g", { transform: "translate(12 12) scale(.76)" }, ART[avatar.art]),
        ),
      ),
    ),
  );
