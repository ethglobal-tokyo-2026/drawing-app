/**
 * The sticker tray's grip nudge: on a person's first few visits, a moment after the Zipper has opened
 * the tray, the front sheet lifts a few pixels toward the board at its tear strip and settles back,
 * to show the sheet pulls out. Once a visit; a hand on the tray, or reduced motion, spares it.
 */
import { EASE_OUT } from "../../ui/easing";
import type { Tray } from "./trayModel";
import type { TrayPaging } from "./trayPaging";
import type { TraySheets } from "./traySheets";

/** How long the nudge waits once the Zipper's slider reaches its far stop: the mouth has stopped moving and been looked at. */
export const NUDGE_AFTER = 1400;
/** The sheet rises, and turns about its foot, which swings its grip toward the board. */
const NUDGE = { rise: -2, turn: -1, ms: 640 };

/**
 * `early` is whether this visit is one of the first few, by the same count the pull's idle tug is
 * rationed on.
 */
export function createTrayNudge(
  tray: Tray,
  traySheets: TraySheets,
  trayPaging: TrayPaging,
  { early }: { early: boolean },
) {
  const { doc, zip, root, ui, reduced, listen, later, cancel } = tray;
  const { restAt } = traySheets;
  const { topSheet } = trayPaging;
  /** It has played, or a hand has been on the open tray: not again this visit. */
  let spent = !early;
  let timer = 0;
  let playing: Animation | null = null;

  /** Calls off a nudge that's waiting or under way, as a closing tray or a hand does. */
  function stop() {
    cancel(timer);
    playing?.cancel();
    playing = null;
  }
  function play() {
    const front = topSheet();
    if (spent || !front || reduced() || doc.hidden || !zip.isOpen) return;
    // Something else is under way, or no sticker is there for a pulled-out sheet to hold.
    if (ui.g || ui.busy || ui.drop || ui.pulled || ui.spreadOpen) return;
    if (ui.model.slots.length === 0) return;
    spent = true;
    playing = front.animate(
      [
        { transform: restAt(0), easing: EASE_OUT },
        { transform: restAt(0, NUDGE.rise, NUDGE.turn), offset: 0.35, easing: EASE_OUT },
        { transform: restAt(0) },
      ],
      { duration: NUDGE.ms },
    );
  }

  zip.on("opened", () => {
    if (spent) return;
    cancel(timer);
    timer = later(play, NUDGE_AFTER);
  });
  zip.on("commit", stop);
  // The touch that opens the tray comes before it's open, so only a hand on the open tray spends it.
  listen(root, "pointerdown", () => {
    if (!zip.isOpen) return;
    spent = true;
    stop();
  });
}
