import { Fragment, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  CaretDown,
  CaretUp,
  ClipToLayerBelowIcon,
  LockTransparentPixelsIcon,
  Trash,
} from "../../icons";
import { useTranslation } from "../../i18n/react";
import type { LayerId } from "../canvas/ops";
import "../tools/ToolStrip.css";
import "./LayerOptionsBar.css";

interface Props {
  /** The layer it sets: the current one. */
  id: LayerId;
  locked: boolean;
  clipped: boolean;
  /** False on the bottom layer, which has nothing below it to clip to. */
  canClip: boolean;
  canMoveBack: boolean;
  canMoveForward: boolean;
  /** False on the last layer, which can't be deleted. */
  canDelete: boolean;
  onLock: (on: boolean) => void;
  onClip: (on: boolean) => void;
  onMoveBack: () => void;
  onMoveForward: () => void;
  onDelete: () => void;
}

interface Tile {
  label: string;
  icon: ReactNode;
  enabled: boolean;
  run: () => void;
  /** A toggle's state; undefined on an action. */
  pressed?: boolean;
  /** Set apart from the tiles before it by a hairline. */
  apart?: boolean;
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
 * The current layer's options, out beside its chip: Lock transparent pixels and Clip to layer below,
 * then Move back and Move forward, then Delete layer, each group set apart by a hairline. The tool
 * strip's flat tiles: a pressed toggle is reversed out of Ink with its icon's fill weight, and an
 * action the layer can't take now is dimmed. One Tab stop, on the tile focused last.
 */
export function LayerOptionsBar({
  id,
  locked,
  clipped,
  canClip,
  canMoveBack,
  canMoveForward,
  canDelete,
  onLock,
  onClip,
  onMoveBack,
  onMoveForward,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const [stop, setStop] = useState(0);
  const tiles: Tile[] = [
    {
      label: t(($) => $.stickerCreation.layers.lock),
      icon: <LockTransparentPixelsIcon size={22} weight={locked ? "fill" : "bold"} />,
      enabled: true,
      run: () => onLock(!locked),
      pressed: locked,
    },
    {
      label: t(($) => $.stickerCreation.layers.clip),
      icon: <ClipToLayerBelowIcon size={22} weight={clipped ? "fill" : "bold"} />,
      enabled: canClip,
      run: () => onClip(!clipped),
      pressed: clipped,
    },
    {
      label: t(($) => $.stickerCreation.layers.moveBack),
      icon: <CaretDown size={22} weight="bold" />,
      enabled: canMoveBack,
      run: onMoveBack,
      apart: true,
    },
    {
      label: t(($) => $.stickerCreation.layers.moveForward),
      icon: <CaretUp size={22} weight="bold" />,
      enabled: canMoveForward,
      run: onMoveForward,
    },
    {
      label: t(($) => $.stickerCreation.layers.delete),
      icon: <Trash size={22} weight="bold" />,
      enabled: canDelete,
      run: onDelete,
      apart: true,
    },
  ];
  return (
    <div
      className="layer-options-bar"
      role="toolbar"
      aria-label={t(($) => $.stickerCreation.layers.options, { number: id })}
      onKeyDown={moveFocus}
    >
      {tiles.map(({ label, icon, enabled, run, pressed, apart }, i) => (
        <Fragment key={label}>
          {apart && <span className="tool-rule" aria-hidden="true" />}
          <button
            type="button"
            className="tool-tile"
            tabIndex={i === stop ? 0 : -1}
            aria-label={label}
            aria-pressed={pressed}
            // Dimmed rather than disabled, so it keeps its place among the arrow keys' stops.
            aria-disabled={!enabled || undefined}
            onFocus={() => setStop(i)}
            onClick={() => {
              if (enabled) run();
            }}
          >
            {icon}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
