import { useImperativeHandle, useLayoutEffect, useRef, type Ref } from "react";
import type { BoardStickerView } from "../boardSticker";
import {
  createTrayEngine,
  type TrayBoard,
  type TrayDrag,
  type TrayEngine,
  type TraySticker,
} from "./trayEngine";
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
  /** Closes the spread, else the tray; whether it did anything. */
  escape: () => boolean;
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
  ref?: Ref<StickerTrayHandle>;
}

/** Every sticker in its slot, with what the tray draws it from. */
function trayStickers(stickers: readonly BoardStickerView[], ownerId: string): TraySticker[] {
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
      seen: s.seenAt !== null,
    };
    if (s.outline !== undefined) sticker.outline = s.outline;
    return [sticker];
  });
}

/** The sticker tray on the board: its engine, fed the board's stickers and asked through `ref`. */
export function StickerTray({ board, stickers, ownerId, api, onSeen, ref }: Props) {
  const engine = useRef<TrayEngine | null>(null);
  const latest = useRef({ stickers, ownerId, api, onSeen });
  useLayoutEffect(() => {
    latest.current = { stickers, ownerId, api, onSeen };
  });

  // Before the engine's own effect, so a new engine doesn't redraw what it has just drawn.
  useLayoutEffect(() => {
    engine.current?.refresh();
  }, [stickers]);

  useLayoutEffect(() => {
    if (!board) return;
    // The board's side is read when it's called, so it's always the board's latest.
    const side: TrayBoard = {
      stickerRect: (id) => latest.current.api.stickerRect(id),
      sizeFor: (id) => latest.current.api.sizeFor(id),
      place: (id, at) => latest.current.api.place(id, at),
      remove: (id) => latest.current.api.remove(id),
      pulse: (id) => latest.current.api.pulse(id),
    };
    const tray = createTrayEngine(board, {
      slots: () => {
        const { stickers: list, ownerId: owner } = latest.current;
        return trayStickers(list, owner);
      },
      api: side,
      markSeen: (ids) => latest.current.onSeen(ids),
    });
    engine.current = tray;
    return () => {
      tray.destroy();
      engine.current = null;
    };
  }, [board]);

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
      escape: () => engine.current?.escape() ?? false,
    }),
    [],
  );
  return null;
}
