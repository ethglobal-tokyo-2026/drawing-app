import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  CaretDown,
  CaretUp,
  ClipToLayerBelowIcon,
  LockTransparentPixelsIcon,
  Trash,
} from "../../icons";
import { useTranslation } from "../../i18n/react";
import type { LayerId } from "../canvas/ops";
import { MAX_LAYERS } from "./layerState";
import "./LayerOptionsBar.css";

interface Props {
  /** The layer it sets: the current one. */
  id: LayerId;
  locked: boolean;
  clipped: boolean;
  /** The nearest unclipped layer below, even before clipping is enabled. */
  clipBase: LayerId | null;
  opacity: number;
  inked: boolean;
  count: number;
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
  help?: string;
}

/** Arrow keys move between the tiles, as in any toolbar. */
function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
  const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 }[e.key];
  if (!step) return;
  const tiles = [...e.currentTarget.querySelectorAll("button")];
  const at = tiles.findIndex((tile) => tile === document.activeElement);
  if (at < 0) return;
  e.preventDefault();
  tiles[(at + step + tiles.length) % tiles.length].focus();
}

/**
 * The current layer's options beside its chip. Each toggle explains its effect; labeled actions
 * stay together below. One Tab stop, on the button focused last; arrow keys reach every action.
 */
export function LayerOptionsBar({
  id,
  locked,
  clipped,
  clipBase,
  opacity,
  inked,
  count,
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
  const descriptionId = useId();
  const tiles: Tile[] = [
    {
      label: t(($) => $.stickerCreation.layers.lock),
      icon: <LockTransparentPixelsIcon size={22} weight={locked ? "fill" : "bold"} />,
      enabled: inked || locked,
      run: () => onLock(!locked),
      pressed: locked,
      help: t(($) =>
        inked
          ? $.stickerCreation.layers.lockHelp
          : locked
            ? $.stickerCreation.layers.unlockEmpty
            : $.stickerCreation.layers.lockUnavailable,
      ),
    },
    {
      label: t(($) => $.stickerCreation.layers.clip),
      icon: <ClipToLayerBelowIcon size={22} weight={clipped ? "fill" : "bold"} />,
      enabled: clipBase !== null,
      run: () => onClip(!clipped),
      pressed: clipped,
      help:
        clipBase === null
          ? t(($) => $.stickerCreation.layers.clipUnavailable)
          : t(($) => $.stickerCreation.layers.clipHelp, { base: clipBase }),
    },
    {
      label: t(($) => $.stickerCreation.layers.moveBack),
      icon: <CaretDown size={22} weight="bold" />,
      enabled: canMoveBack,
      run: onMoveBack,
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
    },
  ];
  return (
    <div
      className="layer-options-bar"
      role="toolbar"
      aria-label={t(($) => $.stickerCreation.layers.options, { number: id })}
      onKeyDown={moveFocus}
    >
      <div className="layer-options-heading" aria-hidden="true">
        <strong>{t(($) => $.stickerCreation.layers.chip, { number: id })}</strong>
        <span>{t(($) => $.stickerCreation.opacitySlider.readout, { value: opacity })}</span>
      </div>
      {count >= MAX_LAYERS && (
        <p className="layer-options-maximum">
          {t(($) => $.stickerCreation.layers.maximum, { count })}
        </p>
      )}
      {tiles.map(({ label, icon, enabled, run, pressed, help }, i) => (
        <button
          key={label}
          type="button"
          className={help ? "layer-option-toggle" : "layer-option-action"}
          tabIndex={i === stop ? 0 : -1}
          aria-label={label}
          aria-pressed={pressed}
          aria-describedby={
            help ? `${descriptionId}-${i}` : i === 4 ? `${descriptionId}-delete` : undefined
          }
          // Dimmed rather than disabled, so it keeps its place among the arrow keys' stops.
          aria-disabled={!enabled || undefined}
          onFocus={() => setStop(i)}
          onClick={() => {
            if (enabled) run();
          }}
        >
          {icon}
          <span className="layer-option-copy">
            <span className="layer-option-name">{label}</span>
            {help && (
              <span className="layer-option-explanation" id={`${descriptionId}-${i}`}>
                {help}
              </span>
            )}
          </span>
        </button>
      ))}
      <p className="layer-options-help" id={`${descriptionId}-delete`}>
        {t(($) =>
          canDelete
            ? $.stickerCreation.layers.deleteHelp
            : $.stickerCreation.layers.deleteUnavailable,
        )}
      </p>
    </div>
  );
}
