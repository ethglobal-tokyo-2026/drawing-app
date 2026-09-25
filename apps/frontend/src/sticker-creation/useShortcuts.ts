import { useEffect, useLayoutEffect, useRef } from "react";
import type { Tool } from "./canvas/types";

interface Shortcuts {
  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
  adjustSize: (delta: number) => void;
}

export function useShortcuts(shortcuts: Shortcuts): void {
  const ref = useRef(shortcuts);
  useLayoutEffect(() => {
    ref.current = shortcuts;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type !== "range") return;
      const s = ref.current;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        s.redo();
      } else if (mod || e.altKey) {
        return;
      } else if (key === "b") {
        s.setTool("brush");
      } else if (key === "e") {
        s.setTool("eraser");
      } else if (key === "g") {
        s.setTool("bucket");
      } else if (key === "[") {
        s.adjustSize(-1);
      } else if (key === "]") {
        s.adjustSize(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
