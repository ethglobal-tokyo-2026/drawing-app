import {
  useCallback,
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
import { LabelButton } from "../../ui/LabelButton";
import { deviceSetting } from "../../ui/deviceSetting";
import type { LayerId } from "../canvas/ops";
import { LayerChip } from "./LayerChip";
import { NewLayerMenu } from "./NewLayerMenu";
import type { LayerChipView, ThumbnailSource } from "./layerView";
import "./LayerColumn.css";

export interface LayerColumnProps {
  /** Back to front; shown front on top. */
  chips: readonly LayerChipView[];
  current: LayerId;
  canAdd: boolean;
  thumbnails: ThumbnailSource;
  optionsOpen: boolean;
  addOpen: boolean;
  onToggleAdd: () => void;
  onCloseAdd: () => void;
  /** A lifted chip keeps its options available while the list scrolls under it. */
  reordering?: boolean;
  dragEnabled?: boolean;
  /** The screen edge the column sits on; the options bar flies toward the other side. */
  edge: "left" | "right";
  onAdd: (position: "above" | "below") => void;
  /** A tap on a chip that isn't current. */
  onSelect: (id: LayerId) => void;
  /** A tap on the current chip: opens or closes its options bar. */
  onToggleOptions: () => void;
  /** Closes options when their chip scrolls out of view or Escape leaves their controls. */
  onCloseOptions: () => void;
  /** The options bar, shown beside the current chip while optionsOpen. */
  options?: ReactNode;
  /** Recovery after a blocked attempt, positioned beside the selected chip. */
  recovery?: ReactNode;
  recoveryLeaving?: boolean;
  onRecoveryHidden?: () => void;
  onRecoveryHover?: (hovered: boolean) => void;
  onRecoveryFocus?: (focused: boolean) => void;
  /** The chips' list element, for holding and dragging a layer. */
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
 * New layer over it opens an above/below choice. A tap on a chip makes its layer current; a tap on
 * the current chip opens or closes its options bar, which flies out beside it toward the sheet.
 * The chips are a listbox: one Tab stop,
 * which lands on the current chip, and Up and Down between them. The list scrolls once the chips
 * outgrow the room the parent gives the column.
 */
export function LayerColumn({
  chips,
  current,
  canAdd,
  thumbnails,
  optionsOpen,
  addOpen,
  onToggleAdd,
  onCloseAdd,
  reordering = false,
  dragEnabled = true,
  edge,
  onAdd,
  onSelect,
  onToggleOptions,
  onCloseOptions,
  options,
  recovery,
  recoveryLeaving,
  onRecoveryHidden,
  onRecoveryHover,
  onRecoveryFocus,
  listRef,
}: LayerColumnProps) {
  const { t } = useTranslation();
  const orderKey = chips.map((chip) => chip.id).join(",");
  const optionsId = useId();
  const addMenuId = useId();
  const dragHintId = useId();
  const hintId = useId();
  const maximumId = useId();
  const overflowId = useId();
  const root = useRef<HTMLDivElement>(null);
  const optionsBox = useRef<HTMLDivElement>(null);
  const addBox = useRef<HTMLDivElement>(null);
  const focusAfterAdd = useRef(false);
  const hintBox = useRef<HTMLDivElement>(null);
  const recoveryBox = useRef<HTMLDivElement>(null);
  const learned = useSyncExternalStore(optionsLearned.subscribe, optionsLearned.get);
  const [scroll, setScroll] = useState({ position: 0, portion: 1 });
  const measureScroll = useCallback(() => {
    const list = root.current?.querySelector<HTMLElement>(".layer-list");
    if (!list) return;
    const distance = list.scrollHeight - list.clientHeight;
    const position = distance > 0 ? Math.max(0, Math.min(1, list.scrollTop / distance)) : 0;
    const portion = distance > 0 ? list.clientHeight / list.scrollHeight : 1;
    setScroll((before) =>
      before.position === position && before.portion === portion ? before : { position, portion },
    );
  }, []);
  const overflowing = scroll.portion < 1;
  const moreAbove = overflowing && scroll.position > 0;
  const moreBelow = overflowing && scroll.position < 1;
  const [hiddenCurrent, setHiddenCurrent] = useState<LayerId | null>(null);
  if (hiddenCurrent !== null && hiddenCurrent !== current) setHiddenCurrent(null);
  // The chip focused by the arrow keys holds the Tab stop until focus leaves the list.
  const [focused, setFocused] = useState<LayerId | null>(null);
  const stop = chips.some((chip) => chip.id === focused) ? focused : current;
  const showAdd = addOpen && canAdd;
  const showOptions = !showAdd && optionsOpen && options !== undefined;
  const showRecovery =
    !showAdd && !optionsOpen && current !== hiddenCurrent && recovery !== undefined;
  const showHint =
    !showAdd &&
    !learned &&
    !optionsOpen &&
    !showRecovery &&
    current !== hiddenCurrent &&
    chips.length > 1 &&
    chips.some((chip) => chip.id === current && !chip.inked);

  useEffect(() => {
    if (optionsOpen && !learned) optionsLearned.set(true);
  }, [optionsOpen, learned]);

  /** Keeps the open paper beside its chip, within the screen and above the column's foot. */
  const placePaper = () => {
    const paper = addBox.current ?? optionsBox.current ?? recoveryBox.current ?? hintBox.current;
    const chip = addBox.current
      ? root.current?.querySelector<HTMLElement>(".layer-add")
      : chipAt(root.current, current);
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
    const desired = addBox.current ? chipBox.top : chipBox.top + chipBox.height / 2 - height / 2;
    const top = Math.max(upper, Math.min(desired, lower - height));
    paper.style.top = `${top - columnBox.top}px`;
  };

  useLayoutEffect(() => {
    if (!showAdd && !showOptions && !showHint && !showRecovery) return;
    placePaper();
    if (typeof ResizeObserver === "undefined") return;
    const paper = addBox.current ?? optionsBox.current ?? recoveryBox.current ?? hintBox.current;
    if (!paper || !root.current) return;
    const observer = new ResizeObserver(placePaper);
    observer.observe(root.current);
    observer.observe(paper);
    const screen = root.current.closest(".drawing-screen");
    if (screen) observer.observe(screen);
    return () => observer.disconnect();
  });

  useLayoutEffect(() => {
    if (showAdd || !focusAfterAdd.current) return;
    focusAfterAdd.current = false;
    chipAt(root.current, current)?.focus({ preventScroll: true });
  });

  // A layer made current or reordered is brought into view. Only the list scrolls, where
  // scrollIntoView would scroll every box round it, the drawing screen's too.
  useLayoutEffect(() => {
    const list = root.current?.querySelector<HTMLElement>(".layer-list") ?? null;
    const chip = chipAt(list, current);
    if (!list || !chip) return;
    const { paddingTop, paddingBottom } = getComputedStyle(chip.parentElement ?? list);
    const above = chip.offsetTop - parseFloat(paddingTop);
    const below =
      chip.offsetTop + chip.offsetHeight + parseFloat(paddingBottom) - list.clientHeight;
    if (list.scrollTop > above) list.scrollTop = above;
    else if (list.scrollTop < below) list.scrollTop = below;
  }, [current, orderKey]);

  // Recheck content changes and automatic selection scrolling before paint, then follow resizes.
  useLayoutEffect(measureScroll);
  useLayoutEffect(() => {
    const list = root.current?.querySelector<HTMLElement>(".layer-list");
    if (!list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measureScroll);
    observer.observe(list);
    return () => observer.disconnect();
  }, [measureScroll]);

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
      <LabelButton
        className="layer-add"
        aria-label={t(($) => $.stickerCreation.layers.add)}
        aria-describedby={!canAdd ? maximumId : undefined}
        aria-haspopup="menu"
        aria-expanded={showAdd}
        aria-controls={showAdd ? addMenuId : undefined}
        disabled={!canAdd}
        onClick={onToggleAdd}
      >
        <NewLayerIcon size={34} weight="bold" />
      </LabelButton>
      {showAdd && (
        <div
          ref={addBox}
          id={addMenuId}
          className="layer-add-menu"
          role="menu"
          aria-label={t(($) => $.stickerCreation.layers.addMenu, { number: current })}
        >
          <NewLayerMenu
            onAdd={(position) => {
              focusAfterAdd.current = true;
              onAdd(position);
            }}
            onClose={() => {
              root.current
                ?.querySelector<HTMLElement>(".layer-add")
                ?.focus({ preventScroll: true });
              onCloseAdd();
            }}
          />
        </div>
      )}
      {!canAdd && (
        <span id={maximumId} className="layer-maximum">
          {t(($) => $.stickerCreation.layers.maximum, { count: chips.length })}
        </span>
      )}
      <div className="layer-body">
        <div
          className="layer-scroll-well"
          data-overflow={overflowing || undefined}
          data-more-above={moreAbove || undefined}
          data-more-below={moreBelow || undefined}
        >
          <div
            ref={listRef}
            className="layer-list"
            role="listbox"
            aria-label={t(($) => $.stickerCreation.layers.label)}
            aria-orientation="vertical"
            aria-describedby={overflowing ? overflowId : undefined}
            onKeyDown={moveFocus}
            onScroll={(e) => {
              measureScroll();
              const list = e.currentTarget;
              const chip = chipAt(list, current);
              if (!chip) return;
              const chipBox = chip.getBoundingClientRect();
              const top = list.getBoundingClientRect().top + list.clientTop;
              const bottom = top + list.clientHeight;
              const visible = chipBox.bottom > top && chipBox.top < bottom;
              setHiddenCurrent(visible ? null : current);
              if (!visible && showOptions && !reordering) onCloseOptions();
              if (!visible && showRecovery) onRecoveryHidden?.();
              else if (visible) placePaper();
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setFocused(null);
            }}
          >
            <div className="layer-chips">
              {chips.toReversed().map((chip) => {
                const isCurrent = chip.id === current;
                return (
                  <LayerChip
                    key={chip.id}
                    chip={chip}
                    current={isCurrent}
                    thumbnails={thumbnails}
                    dragReady={isCurrent && dragEnabled && chips.length > 1}
                    tabStop={chip.id === stop}
                    expanded={isCurrent ? showOptions : undefined}
                    controls={isCurrent && showOptions ? optionsId : undefined}
                    describedBy={
                      isCurrent && chips.length > 1 ? (showHint ? hintId : dragHintId) : undefined
                    }
                    onPress={press}
                    onFocus={setFocused}
                  />
                );
              })}
            </div>
          </div>
          <span id={dragHintId} className="visually-hidden">
            {t(($) => $.stickerCreation.layers.dragHint)}
          </span>
          {overflowing && (
            <span id={overflowId} className="visually-hidden layer-overflow-description">
              {t(($) =>
                moreAbove
                  ? moreBelow
                    ? $.stickerCreation.layers.moreAboveAndBelow
                    : $.stickerCreation.layers.moreAbove
                  : $.stickerCreation.layers.moreBelow,
              )}
            </span>
          )}
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
        {showRecovery && (
          <div
            ref={recoveryBox}
            className="layer-recovery-paper"
            data-leaving={recoveryLeaving || undefined}
            onMouseEnter={() => onRecoveryHover?.(true)}
            onMouseLeave={() => onRecoveryHover?.(false)}
            onFocus={() => onRecoveryFocus?.(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) onRecoveryFocus?.(false);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              chipAt(root.current, current)?.focus({ preventScroll: true });
              onRecoveryHidden?.();
            }}
          >
            {recovery}
          </div>
        )}
      </div>
    </div>
  );
}
