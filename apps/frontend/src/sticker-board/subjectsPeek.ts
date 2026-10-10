import { useState } from "react";
import { lazyWithPreload } from "../ui/lazyWithPreload";

/** The peek's layer, loaded once a board holds a sticker drawn in Kyoto Seika Practice Mode. */
export const ThoughtLayer = lazyWithPreload("the subjects' peek", () =>
  import("./ThoughtLayer").then((m) => m.ThoughtLayer),
);

/**
 * A board's peek at the subjects of the sticker drawn in Kyoto Seika Practice Mode that a tap just
 * selected, each tap its own peek (`n` keys it).
 */
export function useSubjectsPeek() {
  const [peek, setPeek] = useState<{ id: string; n: number } | null>(null);
  return {
    /** A tap selected `id`, a sticker drawn in Kyoto Seika Practice Mode. */
    start: (id: string) => setPeek((was) => ({ id, n: (was?.n ?? 0) + 1 })),
    end: () => setPeek(null),
    /** The peek this render shows: it ends at once when the selection moves off its sticker or `ends`. */
    shown: (selected: string | null, ends: boolean) => {
      if (!peek || (peek.id === selected && !ends)) return peek;
      setPeek(null);
      return null;
    },
  };
}
