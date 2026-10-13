import { useRef } from "react";
import { useTranslation } from "../../i18n/react";
import { LabelButton } from "../../ui/LabelButton";

interface Props {
  onShow: (keyboard: boolean) => void;
  onOpenOptions?: () => void;
}

/** The same explanation and recovery in the timed hint and permanent hidden-layer settings. */
export function HiddenLayerRecovery({ onShow, onOpenOptions }: Props) {
  const { t } = useTranslation();
  const pointer = useRef(false);
  return (
    <div className={onOpenOptions ? "layer-hidden-recovery" : "layer-hidden-options"}>
      <p>{t(($) => $.stickerCreation.layers.hiddenRecovery)}</p>
      <div>
        {onOpenOptions && (
          <LabelButton size="sm" onClick={onOpenOptions}>
            {t(($) => $.stickerCreation.layers.openOptions)}
          </LabelButton>
        )}
        <LabelButton
          size="sm"
          tone="ink"
          onPointerDown={() => (pointer.current = true)}
          onPointerCancel={() => (pointer.current = false)}
          onKeyDown={() => (pointer.current = false)}
          onClick={(event) => {
            // The shared press dispatches a click with no detail for pointers too.
            onShow(event.detail === 0 && !pointer.current);
            pointer.current = false;
          }}
        >
          {t(($) => $.stickerCreation.layers.showLayer)}
        </LabelButton>
      </div>
    </div>
  );
}
