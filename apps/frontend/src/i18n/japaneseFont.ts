/**
 * Zen Kaku Gothic New, the Japanese face, from Google Fonts. Its stylesheet alone is 242 @font-face
 * rules, so the page asks for it only once the app is in Japanese. In English, the odd Japanese glyph
 * falls back to the phone's own Japanese face (Hiragino Sans on an iPhone).
 */
export const JAPANESE_FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700&display=swap";

/**
 * Adds the Japanese face's stylesheet to the page, once. Like index.html's Dela Gothic One, it's fetched as a
 * preload and applied when it arrives, so it never holds up a paint.
 */
export function requestJapaneseFont(doc: Document = document): void {
  const asked = [...doc.head.querySelectorAll("link")].some((l) => l.href === JAPANESE_FONT_CSS);
  if (asked) return;
  const link = doc.createElement("link");
  link.rel = "preload";
  link.as = "style";
  link.href = JAPANESE_FONT_CSS;
  link.addEventListener("load", () => (link.rel = "stylesheet"), { once: true });
  doc.head.append(link);
}
