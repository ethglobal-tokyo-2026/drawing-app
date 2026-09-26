import { useId, type ReactNode } from "react";
import { useTranslation } from "../i18n/react";

export interface ShelfItem {
  id: string;
  name: string;
  /** The item shown on its swatch. */
  preview: ReactNode;
}

interface Props {
  title: string;
  /** One line on what the things on it are. */
  lead: string;
  /** The first is the one you have now. */
  items: readonly ShelfItem[];
  /** "white" for swatches you draw on; stickers sit on label stock. */
  swatch?: "label" | "white";
}

/**
 * A shelf of things coming to the Shop: a row of swatches that scrolls sideways, led by the one you
 * have now. Nothing on it is for sale yet, so it has no prices and nothing to tap.
 */
export function ComingSoonShelf({ title, lead, items, swatch = "label" }: Props) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <section className="shelf" aria-labelledby={`${id}-title`}>
      <header className="shelf__head">
        <h2 className="shelf__title" id={`${id}-title`}>
          {title}
        </h2>
        <span className="shelf__soon fine">{t(($) => $.shop.comingSoon)}</span>
      </header>
      <p className="shelf__lead">{lead}</p>
      <ul className="shelf__row">
        {items.map((item, i) => (
          <li key={item.id} className="shelf-item">
            <span className={`shelf-item__swatch shelf-item__swatch--${swatch}`}>
              {item.preview}
            </span>
            <span className="shelf-item__name">{item.name}</span>
            {i === 0 && <span className="shelf-item__yours fine">{t(($) => $.shop.yours)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
