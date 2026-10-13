import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { CaretDown, CaretUp } from "../../icons";
import { useTranslation } from "../../i18n/react";

/** A two-choice menu; arrow keys wrap between its actions, and Escape returns to New layer. */
export function NewLayerMenu({
  onAdd,
  onClose,
}: {
  onAdd: (position: "above" | "below") => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const first = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => first.current?.focus({ preventScroll: true }), []);
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const index = items.findIndex((item) => item === document.activeElement);
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % items.length
        : event.key === "ArrowUp"
          ? (index + items.length - 1) % items.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    items[next]?.focus();
  };
  return (
    <div className="new-layer-menu" onKeyDown={navigate}>
      <button ref={first} type="button" role="menuitem" onClick={() => onAdd("above")}>
        <CaretUp size={18} weight="bold" aria-hidden="true" />
        {t(($) => $.stickerCreation.layers.createAbove)}
      </button>
      <button type="button" role="menuitem" onClick={() => onAdd("below")}>
        <CaretDown size={18} weight="bold" aria-hidden="true" />
        {t(($) => $.stickerCreation.layers.createBelow)}
      </button>
    </div>
  );
}
