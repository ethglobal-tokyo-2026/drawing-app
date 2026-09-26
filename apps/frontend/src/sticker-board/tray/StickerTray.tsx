import { useImperativeHandle, useLayoutEffect, useRef, type Ref } from "react";
import type { StickerGiftStatus } from "../../giving/stickerGifts";
import type { BoardSticker } from "../boardSticker";
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
  stickers: readonly BoardSticker[];
  gifts: ReadonlyMap<string, StickerGiftStatus>;
  /** The board's owner: you. A sticker someone else drew is a received gift. */
  ownerId: string | null;
  api: TrayBoard;
  ref?: Ref<StickerTrayHandle>;
}

/** Every sticker in its slot, with what the tray draws it from. */
function trayStickers(
  stickers: readonly BoardSticker[],
  gifts: ReadonlyMap<string, StickerGiftStatus>,
  ownerId: string | null,
): TraySticker[] {
  const byId = new Map(stickers.map((s) => [s.id, s]));
  return traySlots(stickers, gifts).flatMap((slot) => {
    const s = byId.get(slot.id);
    if (!s) return [];
    const sticker: TraySticker = {
      ...slot,
      no: s.no,
      width: s.width,
      height: s.height,
      urls: s.urls,
      gift: ownerId !== null && s.artist.id !== ownerId,
    };
    if (s.outline !== undefined) sticker.outline = s.outline;
    return [sticker];
  });
}

/** The sticker tray on the board: its engine, fed the board's stickers and asked through `ref`. */
export function StickerTray({ board, stickers, gifts, ownerId, api, ref }: Props) {
  const engine = useRef<TrayEngine | null>(null);
  const latest = useRef({ stickers, gifts, ownerId, api });
  useLayoutEffect(() => {
    latest.current = { stickers, gifts, ownerId, api };
  });

  // Before the engine's own effect, so a new engine doesn't redraw what it has just drawn.
  useLayoutEffect(() => {
    engine.current?.refresh();
  }, [stickers, gifts, ownerId]);

  useLayoutEffect(() => {
    if (!board) return;
    // The board's side is read when it's called, so it's always the board's latest.
    const side: TrayBoard = {
      stickerRect: (id) => latest.current.api.stickerRect(id),
      sizeFor: (id) => latest.current.api.sizeFor(id),
      place: (id, at) => latest.current.api.place(id, at),
      remove: (id) => latest.current.api.remove(id),
      pulse: (id) => latest.current.api.pulse(id),
      markSeen: (ids) => latest.current.api.markSeen(ids),
    };
    const tray = createTrayEngine(board, {
      slots: () => {
        const { stickers: all, gifts: open, ownerId: owner } = latest.current;
        return trayStickers(all, open, owner);
      },
      api: side,
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
