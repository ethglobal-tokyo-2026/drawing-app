import { useTranslation } from "../../i18n/react";

interface Props {
  onShow: (keyboard: boolean) => void;
  onOpenOptions?: () => void;
}

/** The same explanation and recovery in the timed hint and permanent hidden-layer settings. */
export function HiddenLayerRecovery({ onShow, onOpenOptions }: Props) {
  const { t } = useTranslation();
  return (
    <div className={onOpenOptions ? "layer-hidden-recovery" : "layer-hidden-options"}>
      <p>{t(($) => $.stickerCreation.layers.hiddenRecovery)}</p>
      <div>
        {onOpenOptions && (
          <button type="button" onClick={onOpenOptions}>
            {t(($) => $.stickerCreation.layers.openOptions)}
          </button>
        )}
        <button type="button" onClick={(event) => onShow(event.detail === 0)}>
          {t(($) => $.stickerCreation.layers.showLayer)}
        </button>
      </div>
    </div>
  );
}
