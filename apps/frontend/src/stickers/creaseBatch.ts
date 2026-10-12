import type { CreaseBatch, CreaseJob, CreaseReply } from "./creaseWorker";

interface Bake {
  (board: string, job: CreaseJob): Promise<CreaseReply>;
}

interface Entry {
  key: string;
  pending?: Promise<CreaseReply>;
  posted: boolean;
}

interface Board {
  batch: number;
  entries: Map<string, Entry>;
}

/**
 * Runs each board's latest batch in order. A still-wanted job shares its pending or completed bake
 * across batches; a removed or changed key starts afresh and its old answer is discarded.
 */
export function createCreaseBatchHandler(bake: Bake, post: (reply: CreaseReply) => void) {
  const boards = new Map<string, Board>();
  return ({ board, batch, jobs, start }: CreaseBatch) => {
    if (!jobs.length) {
      boards.delete(board);
      return;
    }
    const state = boards.get(board) ?? { batch, entries: new Map<string, Entry>() };
    boards.set(board, state);
    state.batch = batch;
    const wanted = new Map(jobs.map((job) => [job.id, job.key]));
    for (const [id, entry] of state.entries) {
      if (wanted.get(id) !== entry.key) state.entries.delete(id);
    }
    void (async () => {
      for (const job of jobs) {
        if (boards.get(board) !== state || state.batch !== batch) return;
        let entry = state.entries.get(job.id);
        if (!entry) {
          if (!start) continue;
          const pending = Promise.resolve()
            .then(() => bake(board, job))
            .catch((error: unknown): CreaseReply => ({
              ok: false,
              board,
              id: job.id,
              key: job.key,
              error: error instanceof Error ? error.message : String(error),
            }));
          entry = { key: job.key, pending, posted: false };
          state.entries.set(job.id, entry);
        }
        if (entry.posted || !entry.pending) continue;
        const reply = await entry.pending;
        if (
          boards.get(board) !== state ||
          state.batch !== batch ||
          state.entries.get(job.id) !== entry
        )
          return;
        if (!entry.posted) {
          try {
            post(reply);
          } catch (error) {
            try {
              post({
                ok: false,
                board,
                id: job.id,
                key: job.key,
                error: error instanceof Error ? error.message : String(error),
              });
            } catch (failureError) {
              console.error(
                `Posting sticker ${job.id}'s crease failure failed`,
                error,
                failureError,
              );
            }
          } finally {
            entry.posted = true;
            entry.pending = undefined;
          }
        }
      }
    })();
  };
}
