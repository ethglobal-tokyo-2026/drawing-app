import { useEffect, useState } from "react";
import { listKeptStickers, type StickerRecord } from "./stickerStorage";

export interface KeptSticker extends StickerRecord {
  url: string;
}

/** Your stickers still on your board, newest first, each with an object URL for its image. */
export function useKeptStickers() {
  const [stickers, setStickers] = useState<KeptSticker[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let urls: string[] = [];
    listKeptStickers().then(
      (records) => {
        if (cancelled) return;
        const kept = records.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) }));
        urls = kept.map((k) => k.url);
        setStickers(kept);
      },
      (e: unknown) => {
        console.error("Your stickers failed to load", e);
        if (!cancelled)
          setError(`Couldn’t load your stickers: ${e instanceof Error ? e.message : String(e)}`);
      },
    );
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return { stickers, error };
}
