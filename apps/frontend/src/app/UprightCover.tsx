import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { DeviceRotate } from "../icons";
import { useTranslation } from "../i18n/react";
import "./upright-cover.css";

/**
 * Over the whole app while the phone is on its side (ui/sideways.ts), asking for it upright again; App
 * makes everything under it inert. It takes focus, so a screen reader reads it, and hands focus back
 * once the phone is upright.
 */
export function UprightCover() {
  const { t } = useTranslation();
  const line = useId();
  const cover = useRef<HTMLDivElement>(null);
  const before = useRef<Element | null>(null);
  useLayoutEffect(() => {
    before.current = document.activeElement;
    cover.current?.focus({ preventScroll: true });
  }, []);
  // After the commit that takes the cover away, when the app under it takes focus again.
  useEffect(
    () => () => {
      const was = before.current;
      if (was instanceof HTMLElement && was.isConnected) was.focus({ preventScroll: true });
    },
    [],
  );
  return (
    <div
      ref={cover}
      className="upright-cover"
      role="dialog"
      aria-modal="true"
      aria-labelledby={line}
      tabIndex={-1}
    >
      <DeviceRotate className="upright-cover__icon" size={64} />
      <p id={line} className="upright-cover__line title-label">
        {t(($) => $.app.upright.turn)}
      </p>
    </div>
  );
}
