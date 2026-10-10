import { isOp, type FillOp, type LayerId, type Op, type Step } from "../canvas/ops";
import { CHECKPOINT_COST } from "./checkpoints";
import { applyLayerStep, FIRST_LAYERS, indexOf, isHidden, type LayerState } from "./layerState";
import type { LayerSurface } from "./layerSurface";

/** A hold in the fake: the list of tags it shares with its layer, or owns once the layer moves on. */
export interface TestHold {
  readonly layer: LayerId;
  readonly pixels: readonly string[];
  /** How many steps the surface had applied when the hold was taken. */
  readonly afterApplies: number;
  /** When it was taken and released, on one clock of holds and releases; null while it's kept. */
  readonly takenAt: number;
  releasedAt: number | null;
}

/** A short digest, so a fill's tag stays short however much it read. */
function digest(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

/** What a fill finds: its color and a digest of every visible layer's tags, back to front. */
export function fillRegion(
  op: FillOp,
  before: LayerState,
  pixelsOf: (layer: LayerId) => readonly string[],
): string {
  const shown = before.layers
    .filter((layer) => !isHidden(layer))
    .map(({ id }) => `${id}:${pixelsOf(id).join(",")}`);
  return `${op.color}@${digest(shown.join("|"))}`;
}

/** The tag an op leaves on its layer: what it painted or found, marked when a lock shaped its write. */
export function inkTag(op: Op, painted: string, before: LayerState): string {
  const locked = op.tool !== "eraser" && before.layers[indexOf(before, op.layer)].locked;
  return locked ? `${painted}:locked` : painted;
}

/**
 * A LayerSurface whose "pixels" are lists of op tags, a stroke's tag being its color. Lists are never
 * changed in place, so a hold shares its layer's list until the layer is written; then the hold owns
 * it. It records every apply, restore and copy, and throws on a hold used after its release.
 */
export class TestLayerSurface implements LayerSurface<TestHold> {
  /** The layers as the surface last showed or changed them. */
  shown: LayerState = FIRST_LAYERS;
  /** Every step applied, in order. */
  applied: Step[] = [];
  /** Every restore, in order: the layer, and the hold it came from or null for blank. */
  restored: { layer: LayerId; from: TestHold | null }[] = [];
  /** Layers written while held, each of which costs a copy. */
  copies = 0;
  /** Every hold taken, released ones included. */
  readonly taken: TestHold[] = [];
  private readonly pixels = new Map<LayerId, readonly string[]>();
  private readonly unreleased = new Set<TestHold>();
  private clock = 0;
  /** Each fill's region, found when it's first applied and reused when it's replayed. */
  private readonly regions = new WeakMap<FillOp, string>();
  private readonly budget: (inkedLayers: number) => number;

  constructor(budget: (inkedLayers: number) => number) {
    this.budget = budget;
  }

  pixelsOf(layer: LayerId): readonly string[] {
    return this.pixels.get(layer) ?? [];
  }

  /** Holds not yet released. */
  get holdsKept(): number {
    return this.unreleased.size;
  }

  /** Forgets what was applied and restored so far, to watch what comes next. */
  resetCounts(): void {
    this.applied = [];
    this.restored = [];
    this.copies = 0;
  }

  /** Blanks every layer, as a resize does. */
  wipe(): void {
    this.pixels.clear();
  }

  apply(step: Step, before: LayerState): void {
    this.applied.push(step);
    if (isOp(step)) {
      const painted = step.tool === "fill" ? this.regionOf(step, before) : step.color;
      if (this.isHeld(step.layer)) this.copies++;
      this.pixels.set(step.layer, [...this.pixelsOf(step.layer), inkTag(step, painted, before)]);
      return;
    }
    if (step.tool === "clear" || step.tool === "add") this.pixels.set(step.layer, []);
    else if (step.tool === "delete") this.pixels.delete(step.layer);
    this.shown = applyLayerStep(before, step);
  }

  rebuild(layer: LayerId, write: () => void): void {
    const pixels = this.pixelsOf(layer);
    try {
      write();
    } catch (error) {
      this.pixels.set(layer, pixels);
      throw error;
    }
  }

  show(state: LayerState): void {
    this.shown = state;
  }

  cost(step: Step): number {
    if (step.tool === "fill") return CHECKPOINT_COST;
    return isOp(step) ? 1 : 0;
  }

  hold(layer: LayerId): TestHold {
    const pixels = this.pixels.get(layer);
    if (!pixels?.length) throw new Error(`Held layer ${layer}, which has no ink`);
    const hold: TestHold = {
      layer,
      pixels,
      afterApplies: this.applied.length,
      takenAt: ++this.clock,
      releasedAt: null,
    };
    this.taken.push(hold);
    this.unreleased.add(hold);
    return hold;
  }

  restore(layer: LayerId, hold: TestHold | null): void {
    if (hold && hold.releasedAt !== null)
      throw new Error(`Restored layer ${layer} from a released hold`);
    if (hold && hold.layer !== layer)
      throw new Error(`Restored layer ${layer} from layer ${hold.layer}'s hold`);
    this.restored.push({ layer, from: hold });
    this.pixels.set(layer, hold ? hold.pixels : []);
  }

  release(hold: TestHold): void {
    if (hold.releasedAt !== null) throw new Error(`Released layer ${hold.layer}'s hold twice`);
    hold.releasedAt = ++this.clock;
    this.unreleased.delete(hold);
  }

  get copiesHeld(): number {
    return this.ownedLists([...this.unreleased]).size;
  }

  copiesFreedBy(holds: readonly TestHold[]): number {
    const dropping = new Set(holds);
    const stillHeld = new Set(
      [...this.unreleased].filter((hold) => !dropping.has(hold)).map((hold) => hold.pixels),
    );
    return [...this.ownedLists(holds)].filter((pixels) => !stillHeld.has(pixels)).length;
  }

  copyBudgetFor(inkedLayers: number): number {
    return this.budget(inkedLayers);
  }

  /** The lists these holds keep that no layer shows any more. */
  private ownedLists(holds: readonly TestHold[]): Set<readonly string[]> {
    return new Set(
      holds.filter((hold) => this.pixels.get(hold.layer) !== hold.pixels).map((h) => h.pixels),
    );
  }

  private isHeld(layer: LayerId): boolean {
    const pixels = this.pixels.get(layer);
    return [...this.unreleased].some((hold) => hold.pixels === pixels);
  }

  private regionOf(op: FillOp, before: LayerState): string {
    const kept = this.regions.get(op);
    if (kept !== undefined) return kept;
    const region = fillRegion(op, before, (layer) => this.pixelsOf(layer));
    this.regions.set(op, region);
    return region;
  }
}
