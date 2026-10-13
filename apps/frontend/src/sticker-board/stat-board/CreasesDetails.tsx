import { useTranslation } from "../../i18n/react";
import { ErrorLine } from "../../ui/ErrorLine";
import { creasesCanBake } from "../useCreases";
import "./developer-slip.css";

/** The developer slip's crease diagnosis when this browser can't paint in a worker. */
export function CreasesDetails() {
  const { t } = useTranslation();
  if (creasesCanBake()) return null;
  return (
    <div className="dev-slip__section">
      <h3 className="fine dev-slip__h">{t(($) => $.stickerBoard.developer.creases.title)}</h3>
      <ErrorLine>{t(($) => $.stickerBoard.developer.creases.cantBake)}</ErrorLine>
    </div>
  );
}
