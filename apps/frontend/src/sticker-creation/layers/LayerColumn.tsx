import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { NewLayerIcon, X } from "../../icons";
import { useTranslation } from "../../i18n/react";
import { deviceSetting } from "../../ui/deviceSetting";
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
  /** Closes options when their chip scrolls out of view or Escape leaves their controls. */
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

/** Opening options or dismissing their introduction retires the hint on this device. */
const optionsLearned = deviceSetting<boolean>("draw.layerOptionsLearned", {
  parse: (text) => text === "1",
  serialize: (learned) => (learned ? "1" : null),
  name: "The layer options hint",
});

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
  const hintId = useId();
  const maximumId = useId();
  const root = useRef<HTMLDivElement>(null);
  const optionsBox = useRef<HTMLDivElement>(null);
  const hintBox = useRef<HTMLDivElement>(null);
  const learned = useSyncExternalStore(optionsLearned.subscribe, optionsLearned.get);
  const [hiddenCurrent, setHiddenCurrent] = useState<LayerId | null>(null);
  // The chip focused by the arrow keys holds the Tab stop until focus leaves the list.
  const [focused, setFocused] = useState<LayerId | null>(null);
  const stop = chips.some((chip) => chip.id === focused) ? focused : current;
  const showOptions = optionsOpen && options !== undefined;
  const showHint =
    !learned &&
    !optionsOpen &&
    current !== hiddenCurrent &&
    chips.length > 1 &&
    chips.some((chip) => chip.id === current && !chip.inked);

  useEffect(() => {
    if (optionsOpen && !learned) optionsLearned.set(true);
  }, [optionsOpen, learned]);

  /** Keeps the open paper beside its chip, within the screen and above the column's foot. */
  const placePaper = () => {
    const paper = optionsBox.current ?? hintBox.current;
    const chip = chipAt(root.current, current);
    if (!root.current || !paper || !chip) return;
    const columnBox = root.current.getBoundingClientRect();
    const screenBox =
      root.current.closest(".drawing-screen")?.getBoundingClientRect() ??
      new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    const lower = Math.min(
      columnBox.height > 0 ? columnBox.bottom : screenBox.bottom,
      screenBox.bottom - 8,
    );
    const addBottom =
      root.current.querySelector(".layer-add")?.getBoundingClientRect().bottom ?? columnBox.top;
    const upper = Math.max(
      screenBox.top + 8,
      paper === hintBox.current ? addBottom + 8 : screenBox.top + 8,
    );
    const room =
      edge === "left"
        ? screenBox.right - columnBox.right - 16
        : columnBox.left - screenBox.left - 16;
    paper.style.maxWidth = `${Math.max(0, room)}px`;
    const heightAvailable = Math.max(0, lower - upper);
    paper.style.maxHeight = `${heightAvailable}px`;
    paper.style.overflowY = paper.scrollHeight > heightAvailable ? "auto" : "visible";
    const chipBox = chip.getBoundingClientRect();
    const height = paper.getBoundingClientRect().height;
    const desired = chipBox.top + chipBox.height / 2 - height / 2;
    const top = Math.max(upper, Math.min(desired, lower - height));
    paper.style.top = `${top - columnBox.top}px`;
  };

  useLayoutEffect(() => {
    if (!showOptions && !showHint) return;
    placePaper();
    if (typeof ResizeObserver === "undefined") return;
    const paper = optionsBox.current ?? hintBox.current;
    if (!paper || !root.current) return;
    const observer = new ResizeObserver(placePaper);
    observer.observe(root.current);
    observer.observe(paper);
    const screen = root.current.closest(".drawing-screen");
    if (screen) observer.observe(screen);
    return () => observer.disconnect();
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
        aria-describedby={!canAdd ? maximumId : undefined}
        disabled={!canAdd}
        onClick={onAdd}
      >
        <NewLayerIcon size={18} weight="bold" />
      </button>
      {!canAdd && (
        <span id={maximumId} className="layer-maximum">
          {t(($) => $.stickerCreation.layers.maximum, { count: chips.length })}
        </span>
      )}
      <div className="layer-body">
        <div
          ref={listRef}
          className="layer-list"
          role="listbox"
          aria-label={t(($) => $.stickerCreation.layers.label)}
          aria-orientation="vertical"
          onKeyDown={moveFocus}
          onScroll={(e) => {
            const list = e.currentTarget;
            const chip = chipAt(list, current);
            if (!chip) return;
            const chipBox = chip.getBoundingClientRect();
            const top = list.getBoundingClientRect().top + list.clientTop;
            const bottom = top + list.clientHeight;
            const visible = chipBox.bottom > top && chipBox.top < bottom;
            setHiddenCurrent(visible ? null : current);
            if (!visible && showOptions) onCloseOptions();
            else if (visible) placePaper();
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
                describedBy={isCurrent && showHint ? hintId : undefined}
                onPress={press}
                onFocus={setFocused}
              />
            );
          })}
        </div>
        {/* Next after the chips in the Tab order, though it's laid out over the sheet. */}
        {showOptions && (
          <div
            ref={optionsBox}
            id={optionsId}
            className="layer-options"
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              chipAt(root.current, current)?.focus({ preventScroll: true });
              onCloseOptions();
            }}
          >
            {options}
          </div>
        )}
        {showHint && (
          <div ref={hintBox} id={hintId} className="layer-options-hint">
            <span>{t(($) => $.stickerCreation.layers.optionsHint)}</span>
            <button
              type="button"
              aria-label={t(($) => $.stickerCreation.layers.dismissOptionsHint)}
              onClick={() => {
                chipAt(root.current, current)?.focus();
                optionsLearned.set(true);
              }}
            >
              <X size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
        )}
        {slider && <div className="layer-slider">{slider}</div>}
      </div>
    </div>
  );
}
