import { flushSync } from "react-dom";

/**
 * Changes the screen the soft way: the browser keeps a picture of the screen as it was, React draws
 * the next one at once, and the two cross-fade as the new one settles in (App.css). Without View
 * Transitions, as in older browsers, the screen changes at once.
 */
export function changeScreen(apply: () => void, doc: Document = document) {
  if (!doc.startViewTransition) return apply();
  doc.startViewTransition(() => flushSync(apply));
}
