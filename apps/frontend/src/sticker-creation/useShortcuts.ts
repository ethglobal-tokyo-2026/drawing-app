import { useEffect, useEffectEvent } from "react";
import type { Tool } from "./canvas/ops";

interface Shortcuts {
  /** Off while the drawing screen is covered or takes no input. */
  enabled: boolean;
  undo: () => void;
  redo: () => void;
  setTool: (tool: Tool) => void;
  stepSize: (direction: 1 | -1) => void;
  closePanel: () => void;
}

const TOOL_KEYS: Partial<Record<string, Tool>> = { b: "brush", e: "eraser", g: "fill" };

/** The drawing screen's keys: ⌘Z and ⇧⌘Z (or ⌘Y), B, E and G for the tools, [ and ] for the size, Escape. */
export function useShortcuts(shortcuts: Shortcuts): void {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const s = shortcuts;
    if (!s.enabled) return;
    if (e.target instanceof HTMLInputElement && e.target.type !== "range") return;
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    const tool = TOOL_KEYS[key];
    if (mod && key === "z") {
      e.preventDefault();
      if (e.shiftKey) s.redo();
      else s.undo();
    } else if (mod && key === "y") {
      e.preventDefault();
      s.redo();
    } else if (mod || e.altKey) {
      return;
    } else if (key === "escape") {
      s.closePanel();
    } else if (tool) {
      s.setTool(tool);
    } else if (key === "[" || key === "]") {
      s.stepSize(key === "]" ? 1 : -1);
    }
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}
