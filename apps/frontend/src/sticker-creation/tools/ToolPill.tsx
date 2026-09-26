import { BrushIcon } from "../../icons/BrushIcon";
import { BucketIcon } from "../../icons/BucketIcon";
import { EraserIcon } from "../../icons/EraserIcon";
import { WaveIcon } from "../../icons/WaveIcon";
import type { IconProps, IconWeight } from "../../icons/IconSvg";
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

type ToolIcon = (props: IconProps & { weight?: IconWeight }) => React.ReactNode;

const TOOLS: { tool: Tool; label: string; Icon: ToolIcon }[] = [
  { tool: "brush", label: "Brush", Icon: BrushIcon },
  { tool: "eraser", label: "Eraser", Icon: EraserIcon },
  { tool: "bucket", label: "Fill", Icon: BucketIcon },
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
          {/* The current tool takes the fill weight. */}
          <Icon weight={tool === t ? "fill" : "bold"} />
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
        aria-label="Smoothing"
        disabled={disabled}
      >
        <WaveIcon weight={drawer === "smooth" ? "fill" : "bold"} />
      </button>
    </div>
  );
}
