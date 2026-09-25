import { Eraser, PaintBrush, PaintBucket, WaveSine, type Icon } from "@phosphor-icons/react";
import type { Tool } from "../canvas/types";

export type Drawer = "color" | "smooth" | null;

interface Props {
  tool: Tool;
  color: string;
  drawer: Drawer;
  disabled: boolean;
  onTool: (tool: Tool) => void;
  onDrawer: (drawer: Drawer) => void;
}

const TOOLS: { tool: Tool; label: string; Icon: Icon }[] = [
  { tool: "brush", label: "Brush", Icon: PaintBrush },
  { tool: "eraser", label: "Eraser", Icon: Eraser },
  { tool: "bucket", label: "Fill", Icon: PaintBucket },
];

export function ToolPill({ tool, color, drawer, disabled, onTool, onDrawer }: Props) {
  const toggle = (d: Drawer) => onDrawer(drawer === d ? null : d);
  return (
    <div className={`tool-pill ${disabled ? "disabled" : ""}`} role="toolbar">
      {TOOLS.map(({ tool: t, label, Icon }) => (
        <button
          key={t}
          className={`tool ${tool === t ? "on" : ""}`}
          onClick={() => onTool(t)}
          aria-label={label}
          disabled={disabled}
        >
          <Icon size={22} weight={tool === t ? "fill" : "bold"} />
        </button>
      ))}
      <button
        className={`tool ${drawer === "color" ? "open" : ""}`}
        onClick={() => toggle("color")}
        aria-label="Color"
        disabled={disabled}
      >
        <span className="color-swatch" style={{ background: color }} />
      </button>
      <button
        className={`tool ${drawer === "smooth" ? "open" : ""}`}
        onClick={() => toggle("smooth")}
        aria-label="Smoothness"
        disabled={disabled}
      >
        <WaveSine size={22} />
      </button>
    </div>
  );
}
