import { useId, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowsMerge,
  CaretDown,
  CaretUp,
  ClipToLayerBelowIcon,
  LockTransparentPixelsIcon,
  Question,
  Trash,
  X,
} from "../../icons";
import { useTranslation } from "../../i18n/react";
import type { LayerId } from "../canvas/ops";
import { MAX_LAYERS, type mergeDownTarget } from "./layerState";
import { OpacitySlider } from "./OpacitySlider";
import "./LayerOptionsBar.css";

interface Props {
  id: LayerId;
  locked: boolean;
  clipped: boolean;
  clipBase: LayerId | null;
  opacity: number;
  count: number;
  canMoveBack: boolean;
  canMoveForward: boolean;
  canDelete: boolean;
  mergeTarget: ReturnType<typeof mergeDownTarget>;
  onLock: (on: boolean) => void;
  onClip: (on: boolean) => void;
  onMoveBack: () => void;
  onMoveForward: () => void;
  onDelete: () => void;
  onMerge: () => void;
  onClose: () => void;
  onPreviewOpacity: (value: number) => void;
  onCommitOpacity: (value: number) => void;
  onHoldOpacity: (holding: boolean) => void;
}

/** Compact nonmodal settings. Every control is reachable by Tab; Help holds the explanations. */
export function LayerOptionsBar(props: Props) {
  const { t } = useTranslation();
  const {
    id,
    locked,
    clipped,
    clipBase,
    opacity,
    count,
    canMoveBack,
    canMoveForward,
    canDelete,
    mergeTarget,
  } = props;
  const panel = useRef<HTMLDivElement>(null);
  const [help, setHelp] = useState(false);
  const helpId = useId();
  const mergeReason =
    "reason" in mergeTarget
      ? t(($) =>
          mergeTarget.reason === "no-lower-layer"
            ? $.stickerCreation.layers.mergeNoLower
            : $.stickerCreation.layers.mergeClippedAbove,
        )
      : null;
  useLayoutEffect(() => {
    panel.current?.querySelector("input")?.focus({ preventScroll: true });
  }, [id]);
  const unavailable = () => setHelp(true);
  return (
    <div
      ref={panel}
      className="layer-options-bar"
      role="dialog"
      aria-modal="false"
      aria-label={t(($) => $.stickerCreation.layers.options, { number: id })}
    >
      <div className="layer-options-heading">
        <strong>{t(($) => $.stickerCreation.layers.chip, { number: id })}</strong>
        <div className="layer-options-heading-actions">
          <button
            type="button"
            aria-label={t(($) => $.stickerCreation.layers.help)}
            aria-expanded={help}
            aria-controls={helpId}
            onClick={() => setHelp(!help)}
          >
            <Question size={18} weight="bold" />
          </button>
          <button
            type="button"
            aria-label={t(($) => $.stickerCreation.layers.close)}
            onClick={props.onClose}
          >
            <X size={18} weight="bold" />
          </button>
        </div>
      </div>
      <div className="layer-options-help" id={helpId} hidden={!help}>
        <p>
          <strong>{t(($) => $.stickerCreation.layers.lock)}</strong>{" "}
          <span id={`${helpId}-lock`}>
            {t(($) =>
              locked ? $.stickerCreation.layers.lockedHelp : $.stickerCreation.layers.lockHelp,
            )}
          </span>
        </p>
        <p>
          <strong>{t(($) => $.stickerCreation.layers.clip)}</strong>{" "}
          <span id={`${helpId}-clip`}>
            {clipBase === null
              ? t(($) => $.stickerCreation.layers.clipUnavailable)
              : t(($) => $.stickerCreation.layers.clipHelp, { base: clipBase })}
          </span>
        </p>
        {mergeReason && <p id={`${helpId}-merge`}>{mergeReason}</p>}
        {!canDelete && (
          <p id={`${helpId}-delete`}>{t(($) => $.stickerCreation.layers.deleteUnavailable)}</p>
        )}
      </div>
      {count >= MAX_LAYERS && (
        <p className="layer-options-maximum">
          {t(($) => $.stickerCreation.layers.maximum, { count })}
        </p>
      )}
      <OpacitySlider
        value={opacity}
        onPreview={props.onPreviewOpacity}
        onCommit={props.onCommitOpacity}
        onHold={props.onHoldOpacity}
      />
      <button
        type="button"
        className="layer-option-toggle"
        aria-label={t(($) => $.stickerCreation.layers.lock)}
        aria-pressed={locked}
        aria-describedby={`${helpId}-lock`}
        onClick={() => props.onLock(!locked)}
      >
        <LockTransparentPixelsIcon size={22} weight={locked ? "fill" : "bold"} />
        <span>{t(($) => $.stickerCreation.layers.lock)}</span>
        <span className="layer-toggle-switch" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="layer-option-toggle"
        aria-label={t(($) => $.stickerCreation.layers.clip)}
        aria-pressed={clipped}
        aria-disabled={clipBase === null || undefined}
        aria-describedby={`${helpId}-clip`}
        onClick={() => (clipBase === null ? unavailable() : props.onClip(!clipped))}
      >
        <ClipToLayerBelowIcon size={22} weight={clipped ? "fill" : "bold"} />
        <span>{t(($) => $.stickerCreation.layers.clip)}</span>
        <span className="layer-toggle-switch" aria-hidden="true" />
      </button>
      <div className="layer-reorder">
        <button
          type="button"
          aria-label={t(($) => $.stickerCreation.layers.moveForward)}
          title={t(($) => $.stickerCreation.layers.moveForward)}
          aria-disabled={!canMoveForward || undefined}
          onClick={() => {
            if (canMoveForward) props.onMoveForward();
          }}
        >
          <CaretUp size={18} weight="bold" />
        </button>
        <button
          type="button"
          aria-label={t(($) => $.stickerCreation.layers.moveBack)}
          title={t(($) => $.stickerCreation.layers.moveBack)}
          aria-disabled={!canMoveBack || undefined}
          onClick={() => {
            if (canMoveBack) props.onMoveBack();
          }}
        >
          <CaretDown size={18} weight="bold" />
        </button>
        <button
          type="button"
          className="layer-merge"
          aria-label={
            "into" in mergeTarget
              ? t(($) => $.stickerCreation.layers.mergeInto, { number: mergeTarget.into })
              : t(($) => $.stickerCreation.layers.merge)
          }
          aria-disabled={!!mergeReason || undefined}
          aria-describedby={mergeReason ? `${helpId}-merge` : undefined}
          onClick={() => (mergeReason ? unavailable() : props.onMerge())}
        >
          <ArrowsMerge size={20} weight="bold" />
          <span>{t(($) => $.stickerCreation.layers.merge)}</span>
        </button>
      </div>
      <button
        type="button"
        className="layer-delete"
        aria-label={t(($) => $.stickerCreation.layers.delete)}
        aria-disabled={!canDelete || undefined}
        aria-describedby={!canDelete ? `${helpId}-delete` : undefined}
        onClick={() => (canDelete ? props.onDelete() : unavailable())}
      >
        <Trash size={21} weight="bold" />
        <span>{t(($) => $.stickerCreation.layers.delete)}</span>
      </button>
    </div>
  );
}
