import { memo, useImperativeHandle, useLayoutEffect, useMemo, useRef, type Ref } from "react";
import { useTranslation } from "../../i18n/react";
import { formatHandle, handleOf } from "../../stickers/format";
import { useMyNsfwOptIn, veiledFor } from "../../stickers/nsfw";
import type { BoardStickerView } from "../boardSticker";
import {
  createTrayEngine,
  type TrayBoard,
  type TrayDrag,
  type TrayEngine,
  type TraySticker,
} from "./trayEngine";
import type { TrayProblem } from "./trayProblem";
import { traySlots } from "./traySlots";

/** What the board asks of its sticker tray, all in board pixels. */
export interface StickerTrayHandle {
  readonly isOpen: boolean;
  open: () => Promise<boolean>;
  close: () => Promise<boolean>;
  /** Each move of a board sticker being dragged; null when the tray doesn't hold it. */
  boardDrag: (id: string, at: { x: number; y: number }) => TrayDrag | null;
  /** A dragged board sticker let go: true when it went back into its used sticker silhouette. */
  boardDrop: (id: string, at: { x: number; y: number }) => Promise<boolean>;
  /** A dragged board sticker that won't be let go over the tray: it became a pinch, or the system took it. */
  boardDragEnd: (id: string) => void;
  /** Closes the spread, else the tray; whether it did anything. */
  escape: () => boolean;
  /** Where the pouch ends, as the board's y; null before the tray has laid out. */
  pouchFoot: () => number | null;
  /** Puts focus on the Zipper. */
  focusZipper: () => void;
}

interface Props {
  /** The board it runs down the right edge of. */
  board: HTMLElement | null;
  stickers: readonly BoardStickerView[];
  /** The board's owner: a sticker someone else drew is a gift. */
  ownerId: string;
  api: TrayBoard;
  /** Stickers the open tray showed, which are NEW no longer. */
  onSeen: (ids: readonly string[]) => void;
  /** Something the tray couldn't do, which the board says. */
  onProblem: (problem: TrayProblem) => void;
  ref?: Ref<StickerTrayHandle>;
}

/** Every sticker in its slot, with what the tray draws it from. */
function trayStickers(
  stickers: readonly BoardStickerView[],
  ownerId: string,
  optedIn: boolean,
): TraySticker[] {
  const byId = new Map(stickers.map((s) => [s.id, s]));
  return traySlots(stickers).flatMap((slot) => {
    const s = byId.get(slot.id);
    if (!s) return [];
    const sticker: TraySticker = {
      ...slot,
      no: s.no,
      width: s.width,
      height: s.height,
      urls: s.urls,
      gift: s.artist.id !== ownerId,
      nsfw: s.nsfw,
      kyotoSeika: s.kyotoSeikaSubjects !== null,
      veiled: veiledFor(s, optedIn),
      seen: s.seenAt !== null,
    };
    if (s.outline !== undefined) sticker.outline = s.outline;
    if (!s.held && s.givenTo) sticker.givenTo = handleOf(s.givenTo.receiver);
    if (slot.state === "onItsWay" && s.openGift?.to)
      sticker.onItsWayTo = formatHandle(s.openGift.to);
    return [sticker];
  });
}

/**
 * The sticker tray on the board: its engine, fed the board's stickers and asked through `ref`. It
 * renders only when its props change, so the board hands it callbacks that never do.
 */
export const StickerTray = memo(function StickerTray({
  board,
  stickers,
  ownerId,
  api,
  onSeen,
  onProblem,
  ref,
}: Props) {
  const engine = useRef<TrayEngine | null>(null);
  const { i18n } = useTranslation();
  /** What this visit's trays have shown, so a tray rebuilt for a new language shows none of it as NEW. */
  const seen = useRef(new Set<string>());
  const optedIn = useMyNsfwOptIn();
  const latest = useRef({ stickers, ownerId, optedIn, api, onSeen, onProblem });
  useLayoutEffect(() => {
    latest.current = { stickers, ownerId, optedIn, api, onSeen, onProblem };
  });

  // What the sheets show: a sticker moved, raised or dropped on the board leaves it as it was, so the
  // tray doesn't repack and redraw for it.
  const shown = useMemo(
    () => JSON.stringify(trayStickers(stickers, ownerId, optedIn)),
    [stickers, ownerId, optedIn],
  );
  // Before the engine's own effect, so a new engine doesn't redraw what it has just drawn.
  useLayoutEffect(() => {
    engine.current?.refresh();
  }, [shown]);

  useLayoutEffect(() => {
    if (!board) return;
    // The board's side is read when it's called, so it's always the board's latest.
    const side: TrayBoard = {
      stickerRect: (id) => latest.current.api.stickerRect(id),
      sizeFor: (id) => latest.current.api.sizeFor(id),
      place: (id, at) => latest.current.api.place(id, at),
      remove: (id) => latest.current.api.remove(id),
      pulse: (id) => latest.current.api.pulse(id),
      openGiven: (id) => latest.current.api.openGiven(id),
      openYours: (id) => latest.current.api.openYours(id),
    };
    const tray = createTrayEngine(board, {
      slots: () => {
        const { stickers: list, ownerId: owner, optedIn: viewerOptedIn } = latest.current;
        return trayStickers(list, owner, viewerOptedIn);
      },
      api: side,
      markSeen: (ids) => latest.current.onSeen(ids),
      problem: (p) => latest.current.onProblem(p),
      seen: seen.current,
    });
    engine.current = tray;
    return () => {
      tray.destroy();
      engine.current = null;
    };
    // The engine reads its words once, so a new language builds a new one.
  }, [board, i18n.language]);

  useImperativeHandle(
    ref,
    () => ({
      get isOpen() {
        return engine.current?.isOpen ?? false;
      },
      open: () => engine.current?.open() ?? Promise.resolve(false),
      close: () => engine.current?.close() ?? Promise.resolve(false),
      boardDrag: (id, at) => engine.current?.boardDrag(id, at) ?? null,
      boardDrop: (id, at) => engine.current?.boardDrop(id, at) ?? Promise.resolve(false),
      boardDragEnd: (id) => engine.current?.boardDragEnd(id),
      escape: () => engine.current?.escape() ?? false,
      pouchFoot: () => engine.current?.pouchFoot() ?? null,
      focusZipper: () => engine.current?.focusZipper(),
    }),
    [],
  );
  return null;
});
