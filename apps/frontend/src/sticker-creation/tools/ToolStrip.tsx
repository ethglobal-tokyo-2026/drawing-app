import {
  Circle,
  Eraser,
  PaintBrush,
  PaintBucket,
  WaveSine,
  type Icon,
} from "@phosphor-icons/react";
import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "../../i18n/react";
import type { Tool } from "../canvas/ops";
import "./ToolStrip.css";

export type Panel = "color" | "smoothing" | null;

const TOOLS: { tool: Tool; Icon: Icon }[] = [
  { tool: "brush", Icon: PaintBrush },
  { tool: "eraser", Icon: Eraser },
  { tool: "fill", Icon: PaintBucket },
];
const COLOR_TILE = TOOLS.length;
const SMOOTHING_TILE = TOOLS.length + 1;

interface Props {
  tool: Tool;
  panel: Panel;
  colorSheetId: string;
  smoothingBarId: string;
  onTool: (tool: Tool) => void;
  onPanel: (panel: Panel) => void;
}

/** Arrow keys move between the tiles, as in any toolbar. */
function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
  const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (!step) return;
  const tiles = [...e.currentTarget.querySelectorAll("button")];
  const at = tiles.findIndex((tile) => tile === document.activeElement);
  if (at < 0) return;
  e.preventDefault();
  tiles[(at + step + tiles.length) % tiles.length].focus();
}

/**
 * The tools: brush, eraser and fill, the color, and smoothing, as one flat label strip. The current
 * tool, or the open panel's tile, is reversed out of Ink with the fill-weight icon. The strip is one
 * Tab stop, on the tile focused last, or the current tool.
 */
export function ToolStrip({ tool, panel, colorSheetId, smoothingBarId, onTool, onPanel }: Props) {
  const { t } = useTranslation();
  const [lastFocused, setLastFocused] = useState<number | null>(null);
  const stop = lastFocused ?? TOOLS.findIndex((each) => each.tool === tool);
  const tile = (i: number) => ({
    type: "button" as const,
    tabIndex: i === stop ? 0 : -1,
    onFocus: () => setLastFocused(i),
  });
  const toggle = (p: Exclude<Panel, null>) => onPanel(panel === p ? null : p);
  return (
    <div
      className="tool-strip"
      role="toolbar"
      aria-label={t(($) => $.stickerCreation.tools.label)}
      onKeyDown={moveFocus}
    >
      {TOOLS.map(({ tool: each, Icon }, i) => (
        <button
          key={each}
          {...tile(i)}
          className="tool-tile"
          aria-label={t(($) => $.stickerCreation.tools[each])}
          aria-pressed={tool === each}
          onClick={() => onTool(each)}
        >
          <Icon size={22} weight={tool === each ? "fill" : "bold"} />
        </button>
      ))}
      <button
        {...tile(COLOR_TILE)}
        className="tool-tile tool-color"
        aria-label={t(($) => $.stickerCreation.tools.color)}
        aria-expanded={panel === "color"}
        aria-controls={colorSheetId}
        onClick={() => toggle("color")}
      >
        <span className="tool-color-dot">
          <Circle size={26} weight="fill" />
        </span>
      </button>
      <button
        {...tile(SMOOTHING_TILE)}
        className="tool-tile"
        aria-label={t(($) => $.stickerCreation.tools.smoothing)}
        aria-expanded={panel === "smoothing"}
        aria-controls={smoothingBarId}
        onClick={() => toggle("smoothing")}
      >
        <WaveSine size={22} weight={panel === "smoothing" ? "fill" : "bold"} />
      </button>
    </div>
  );
}
