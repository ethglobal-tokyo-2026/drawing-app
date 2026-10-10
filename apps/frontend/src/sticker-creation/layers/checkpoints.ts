import { isOp, type LayerId, type Step } from "../canvas/ops";

/** A checkpoint is taken once the steps since the last one cost this much to replay, in strokes. */
export const CHECKPOINT_COST = 24;

/** How many of the newest checkpoints at or before the head thinning spares, so shallow undos stay short. */
export const HEAD_WINDOW = 3;

/** What the eviction rule weighs. Checkpoints are named by how many steps they hold the layers after. */
export interface CheckpointTrim {
  kept: readonly number[];
  /** How many steps are done. */
  head: number;
  /** The summed replay cost of the first `steps` steps, up to the head. */
  costTo: (steps: number) => number;
  /** The copies dropping this checkpoint alone would free. */
  copiesFreed: (at: number) => number;
  copiesHeld: number;
  budget: number;
  /** The checkpoint the step just recorded took, if it took one. */
  justTaken: number | null;
}

/**
 * The checkpoint to drop next, or null when none needs to go. Checkpoints go while their copies
 * exceed the budget, and at a budget of 0 while any is kept, in this order: those past the head,
 * farthest first; those older than the head window, by the least replay saved per copy freed; the
 * window's oldest. The one just taken goes last of all, and only at a budget of 0.
 */
export function checkpointToDrop(trim: CheckpointTrim): number | null {
  const { kept, head, budget, justTaken } = trim;
  if (budget > 0 && trim.copiesHeld <= budget) return null;
  let pastHead: number | null = null;
  for (const at of kept) if (at > head && (pastHead === null || at > pastHead)) pastHead = at;
  if (pastHead !== null) return pastHead;
  const behind = kept.filter((at) => at <= head).toSorted((a, b) => b - a);
  if (behind.length > HEAD_WINDOW) return thinnest(trim, behind);
  const spared = budget > 0 ? justTaken : null;
  return behind.findLast((at) => at !== spared) ?? null;
}

/**
 * Of the checkpoints older than the window, the one whose loss adds the least replay, weighed by how
 * far back that replay sits and divided by the copies it frees. `behind` runs nearest the head first.
 */
function thinnest(
  { head, costTo, copiesFreed }: CheckpointTrim,
  behind: readonly number[],
): number {
  const older = behind.slice(HEAD_WINDOW);
  const freed = older.map(copiesFreed);
  // One that frees nothing alone can share its copies with another, so thinning goes on by gap.
  const anyFrees = freed.some((copies) => copies > 0);
  let drop = older[0];
  let lowest = Infinity;
  older.forEach((at, j) => {
    if (anyFrees && freed[j] === 0) return;
    const i = HEAD_WINDOW + j;
    const nearer = i > 0 ? behind[i - 1] : head;
    const farther = i + 1 < behind.length ? behind[i + 1] : 0;
    const gap = costTo(nearer) - costTo(farther);
    const back = costTo(head) - costTo(nearer) + CHECKPOINT_COST;
    const score = gap / back / (anyFrees ? freed[j] : 1);
    // On a tie the older one goes, so gaps widen with distance back.
    if (score <= lowest) {
      lowest = score;
      drop = at;
    }
  });
  return drop;
}

/**
 * The step counts a load takes checkpoints at: those the eviction rule still keeps after the last
 * step, found by running it over step costs and a model of layer versions, so a load copies nothing
 * it then drops. A layer's version is the step that last wrote it; a hold owns a copy once its
 * version is written over, cleared or deleted, and holds of one version share it.
 */
export function planCheckpoints(
  steps: readonly Step[],
  cost: (step: Step) => number,
  copyBudgetFor: (inkedLayers: number) => number,
): number[] {
  const costTo = [0];
  /** Each inked layer's version. Versions are step indexes, so no two layers share one. */
  const live = new Map<LayerId, number>();
  /** The versions each kept checkpoint holds, by its step count. */
  const kept = new Map<number, readonly number[]>();
  let liveVersions = new Set<number>();
  const isOwned = (version: number) => !liveVersions.has(version);
  const heldElsewhere = (version: number, at: number) =>
    [...kept].some(([other, versions]) => other !== at && versions.includes(version));
  const copiesHeld = () => new Set([...kept.values()].flat().filter(isOwned)).size;
  const copiesFreed = (at: number) =>
    (kept.get(at) ?? []).filter((v) => isOwned(v) && !heldElsewhere(v, at)).length;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const head = i + 1;
    costTo.push(costTo[i] + cost(step));
    if (isOp(step)) live.set(step.layer, i);
    else if (step.tool === "clear" || step.tool === "delete") live.delete(step.layer);
    liveVersions = new Set(live.values());
    let justTaken: number | null = null;
    const latest = Math.max(0, ...kept.keys());
    if (costTo[head] - costTo[latest] >= CHECKPOINT_COST) {
      kept.set(head, [...live.values()]);
      justTaken = head;
    }
    const budget = copyBudgetFor(live.size);
    for (;;) {
      const at = checkpointToDrop({
        kept: [...kept.keys()],
        head,
        costTo: (n) => costTo[n],
        copiesFreed,
        copiesHeld: copiesHeld(),
        budget,
        justTaken,
      });
      if (at === null) break;
      kept.delete(at);
    }
  }
  return [...kept.keys()].toSorted((a, b) => a - b);
}
