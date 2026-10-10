import {
  Circle,
  ClearSheetIcon,
  Eraser,
  PaintBrush,
  PaintBucket,
  PencilOnlyIcon,
  WaveSine,
  type Icon,
} from "../../icons";
import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "../../i18n/react";
import type { InputMode } from "../canvas/inkEngine";
import type { Tool } from "../canvas/ops";
import "./ToolStrip.css";

/** What's open over the drawing: one of the tool strip's panels, or the current layer's options bar. */
export type Panel = "color" | "smoothing" | "clear" | "layer" | null;

const TOOLS: { tool: Tool; Icon: Icon }[] = [
  { tool: "brush", Icon: PaintBrush },
  { tool: "eraser", Icon: Eraser },
  { tool: "fill", Icon: PaintBucket },
];
const COLOR_TILE = TOOLS.length;
const SMOOTHING_TILE = TOOLS.length + 1;
const CLEAR_TILE = TOOLS.length + 2;
const INPUT_TILE = TOOLS.length + 3;

interface Props {
  tool: Tool;
  panel: Panel;
  /** The current layer has ink to clear: until it has, the clear tile is dimmed and does nothing. */
  canClear: boolean;
  colorSheetId: string;
  smoothingBarId: string;
  clearBarId: string;
  onTool: (tool: Tool) => void;
  onPanel: (panel: Panel) => void;
  /** The sheet's input mode, or null before a pen has drawn on this device, when there's no tile. */
  inputMode: InputMode | null;
  /** The tile switches the sheet between Pencil only and Pencil and finger. */
  onInputMode: (mode: InputMode) => void;
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
 * The tools: brush, eraser and fill, the color, and Smoothing, as one flat label strip, with the clear
 * tile past a rule at its end, since clearing isn't drawing. The current tool, or the open panel's
 * tile, is reversed out of Ink with the fill-weight icon. The strip is one Tab stop, on the tile
 * focused last, or the current tool. Once a pen has drawn on the device, the Pencil only tile leads
 * the strip past a rule.
 */
export function ToolStrip({
  tool,
  panel,
  canClear,
  colorSheetId,
  smoothingBarId,
  clearBarId,
  onTool,
  onPanel,
  inputMode,
  onInputMode,
}: Props) {
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
      {inputMode && (
        <>
          <button
            {...tile(INPUT_TILE)}
            className="tool-tile"
            aria-label={t(($) => $.stickerCreation.tools.pencilOnly)}
            aria-pressed={inputMode === "pencilOnly"}
            onClick={() =>
              onInputMode(inputMode === "pencilOnly" ? "pencilAndFinger" : "pencilOnly")
            }
          >
            <PencilOnlyIcon size={22} weight={inputMode === "pencilOnly" ? "fill" : "bold"} />
          </button>
          {/* How the sheet takes input isn't a drawing tool: a hairline sets the tile apart. */}
          <span className="tool-rule" aria-hidden="true" />
        </>
      )}
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
      <span className="tool-rule" aria-hidden="true" />
      <button
        {...tile(CLEAR_TILE)}
        className="tool-tile"
        aria-label={t(($) => $.stickerCreation.tools.clear)}
        aria-expanded={panel === "clear"}
        aria-controls={clearBarId}
        // Dimmed rather than disabled, so it keeps its place among the arrow keys' stops.
        aria-disabled={!canClear || undefined}
        onClick={() => {
          if (canClear) toggle("clear");
        }}
      >
        <ClearSheetIcon size={22} weight={panel === "clear" ? "fill" : "bold"} />
      </button>
    </div>
  );
}
