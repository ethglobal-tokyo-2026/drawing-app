import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Plus } from "../../icons";
import { useTranslation } from "../../i18n/react";
import type { LayerId } from "../canvas/ops";
import { LayerChip } from "./LayerChip";
import type { LayerChipView, ThumbnailSource } from "./layerView";
import "./LayerColumn.css";

export interface LayerColumnProps {
  /** Back to front; shown front on top. */
  chips: readonly LayerChipView[];
  current: LayerId;
  canAdd: boolean;
  thumbnails: ThumbnailSource;
  optionsOpen: boolean;
  /** The screen edge the column sits on; the options bar flies toward the other side. */
  edge: "left" | "right";
  onAdd: () => void;
  /** A tap on a chip that isn't current. */
  onSelect: (id: LayerId) => void;
  /** A tap on the current chip: opens or closes its options bar. */
  onToggleOptions: () => void;
  /** Closes options when their chip scrolls out of view. */
  onCloseOptions: () => void;
  /** The options bar, shown beside the current chip while optionsOpen. */
  options?: ReactNode;
  /** The opacity slider, laid beside the chips. */
  slider?: ReactNode;
  /** The chips' list element, for the drag and pen-hover hooks. */
  listRef?: Ref<HTMLDivElement>;
}

/** Up and Down move focus between the chips, front to back as they're shown, and stop at the ends. */
const STEPS: Partial<Record<string, number>> = { ArrowUp: -1, ArrowDown: 1 };

const chipAt = (scope: HTMLElement | null, id: LayerId) =>
  scope?.querySelector<HTMLElement>(`[data-layer-chip="${id}"]`) ?? null;

/**
 * The layers as a column of chips at the screen edge away from the drawing hand, front on top, with
 * + over it. A tap on a chip makes its layer current; a tap on the current chip opens or closes its
 * options bar, which flies out beside it toward the sheet. The chips are a listbox: one Tab stop,
 * which lands on the current chip, and Up and Down between them. The list scrolls once the chips
 * outgrow the room the parent gives the column.
 */
export function LayerColumn({
  chips,
  current,
  canAdd,
  thumbnails,
  optionsOpen,
  edge,
  onAdd,
  onSelect,
  onToggleOptions,
  onCloseOptions,
  options,
  slider,
  listRef,
}: LayerColumnProps) {
  const { t } = useTranslation();
  const optionsId = useId();
  const root = useRef<HTMLDivElement>(null);
  const optionsBox = useRef<HTMLDivElement>(null);
  // The chip focused by the arrow keys holds the Tab stop until focus leaves the list.
  const [focused, setFocused] = useState<LayerId | null>(null);
  const stop = chips.some((chip) => chip.id === focused) ? focused : current;
  const showOptions = optionsOpen && options !== undefined;

  /** Sets the options bar level with the current chip, wherever the list is scrolled. */
  const placeOptions = () => {
    const chip = chipAt(root.current, current);
    if (!root.current || !optionsBox.current || !chip) return;
    const chipBox = chip.getBoundingClientRect();
    const top = chipBox.top + chipBox.height / 2 - root.current.getBoundingClientRect().top;
    optionsBox.current.style.top = `${top}px`;
  };

  useLayoutEffect(() => {
    if (showOptions) placeOptions();
  });

  // A layer made current, by + among others, is brought into view. Only the list scrolls, where
  // scrollIntoView would scroll every box round it, the drawing screen's too.
  useLayoutEffect(() => {
    const list = root.current?.querySelector<HTMLElement>(".layer-list") ?? null;
    const chip = chipAt(list, current);
    if (!list || !chip) return;
    const { paddingTop, paddingBottom } = getComputedStyle(list);
    const above = chip.offsetTop - parseFloat(paddingTop);
    const below =
      chip.offsetTop + chip.offsetHeight + parseFloat(paddingBottom) - list.clientHeight;
    if (list.scrollTop > above) list.scrollTop = above;
    else if (list.scrollTop < below) list.scrollTop = below;
  }, [current]);

  const press = (id: LayerId) => (id === current ? onToggleOptions() : onSelect(id));

  const moveFocus = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = STEPS[e.key];
    if (!step) return;
    e.preventDefault();
    const shown = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-layer-chip]")];
    const at = shown.findIndex((chip) => chip === document.activeElement);
    shown[at + step]?.focus();
  };

  return (
    <div ref={root} className="layer-column" data-edge={edge}>
      <button
        type="button"
        className="layer-add"
        aria-label={t(($) => $.stickerCreation.layers.add)}
        disabled={!canAdd}
        onClick={onAdd}
      >
        <Plus size={18} weight="bold" />
      </button>
      <div className="layer-body">
        <div
          ref={listRef}
          className="layer-list"
          role="listbox"
          aria-label={t(($) => $.stickerCreation.layers.label)}
          aria-orientation="vertical"
          onKeyDown={moveFocus}
          onScroll={(e) => {
            if (!showOptions) return;
            const list = e.currentTarget;
            const chip = chipAt(list, current);
            if (!chip) return;
            const chipBox = chip.getBoundingClientRect();
            const top = list.getBoundingClientRect().top + list.clientTop;
            const bottom = top + list.clientHeight;
            if (chipBox.bottom <= top || chipBox.top >= bottom) onCloseOptions();
            else placeOptions();
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setFocused(null);
          }}
        >
          {chips.toReversed().map((chip) => {
            const isCurrent = chip.id === current;
            return (
              <LayerChip
                key={chip.id}
                chip={chip}
                current={isCurrent}
                thumbnails={thumbnails}
                tabStop={chip.id === stop}
                expanded={isCurrent ? showOptions : undefined}
                controls={isCurrent && showOptions ? optionsId : undefined}
                onPress={press}
                onFocus={setFocused}
              />
            );
          })}
        </div>
        {/* Next after the chips in the Tab order, though it's laid out over the sheet. */}
        {showOptions && (
          <div ref={optionsBox} id={optionsId} className="layer-options">
            {options}
          </div>
        )}
        {slider && <div className="layer-slider">{slider}</div>}
      </div>
    </div>
  );
}
