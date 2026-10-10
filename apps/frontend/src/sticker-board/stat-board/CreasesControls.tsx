import { useState } from "react";
import { useTranslation } from "../../i18n/react";
import { ErrorLine } from "../../ui/ErrorLine";
import { keepCreasesShown, useCreasesShown } from "../useCreases";
import "./developer-slip.css";

/** Creases' switch, on the stat board's developer slip: they show only on a device that switches them on. */
export function CreasesControls() {
  const { t } = useTranslation();
  const shown = useCreasesShown();
  // The device refused to keep the choice, which then lasts only until the app reloads.
  const [unkept, setUnkept] = useState(false);
  return (
    <div className="dev-slip__section">
      <h3 className="fine dev-slip__h">{t(($) => $.stickerBoard.developer.creases.title)}</h3>
      <label className="dev-slip__checkbox">
        <input
          type="checkbox"
          checked={shown}
          onChange={(e) => setUnkept(!keepCreasesShown(e.target.checked))}
        />
        {t(($) => $.stickerBoard.developer.creases.show)}
      </label>
      {unkept && <ErrorLine>{t(($) => $.stickerBoard.developer.creases.unkept)}</ErrorLine>}
    </div>
  );
}
