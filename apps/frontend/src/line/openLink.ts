import liff from "@line/liff";
import type { MouseEvent } from "react";

/**
 * A link's click inside LINE's app: LINE's own browser opens it over the app, where a new tab would
 * leave LINE. Anywhere else the link opens as it would.
 */
export function openLinkInLine(e: MouseEvent<HTMLAnchorElement>) {
  if (!liff.isInClient()) return;
  e.preventDefault();
  liff.openWindow({ url: e.currentTarget.href, external: false });
}
