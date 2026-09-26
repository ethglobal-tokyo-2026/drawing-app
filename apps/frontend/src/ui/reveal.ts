import "./reveal.css";

/** The class that makes content rise into place as it mounts, once what it shows has loaded. */
export const REVEAL = "reveal";

/**
 * A ref for an image in a `reveal-img` element: marks `target` (the image itself unless given) loaded
 * once the image has, so it fades in whole. A broken image shows too, so nothing stays hidden.
 */
export function revealOnLoad(img: HTMLImageElement | null, target: Element | null = img) {
  if (!img || !target) return;
  const show = () => target.setAttribute("data-loaded", "");
  if (img.complete) return show();
  img.addEventListener("load", show, { once: true });
  img.addEventListener("error", show, { once: true });
}
