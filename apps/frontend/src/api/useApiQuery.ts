import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { apiError, type ApiClient, type ApiError } from "./apiClient";
import { useApi } from "./useApi";

export type Query<T> =
  | { state: "loading" }
  | { state: "failed"; error: ApiError; retry: () => void }
  | { state: "ready"; data: T; refresh: () => void };

interface Loaded<T> {
  key: string;
  attempt: number;
  outcome: { ok: true; data: T } | { ok: false; error: ApiError };
}

/**
 * The last answer to each key of one query, for each client. One held at module scope lets every
 * reader of that query show the last answer at once, from any of them, while it loads again.
 */
export class QueryAnswers<T> {
  private byClient = new WeakMap<ApiClient, Map<string, { data: T; keptAt: number }>>();
  /** Counts forgets, so the answer to a load that went out before one isn't kept. */
  private forgets = 0;
  private readonly freshMs: number;

  /**
   * With `freshMs`, an answer kept that recently is the answer: a reader shows it and loads nothing
   * until a retry or a refresh. Only for data the server rarely changes, and nothing forgets.
   */
  constructor({ freshMs = 0 }: { freshMs?: number } = {}) {
    this.freshMs = freshMs;
  }

  last(api: ApiClient, key: string): { data: T } | undefined {
    return this.byClient.get(api)?.get(key);
  }

  /** Whether `key`'s answer was kept within `freshMs`; the wall clock, so a phone asleep ages it. */
  fresh(api: ApiClient, key: string): boolean {
    const kept = this.byClient.get(api)?.get(key);
    if (!kept) return false;
    const age = Date.now() - kept.keptAt;
    return age >= 0 && age < this.freshMs;
  }

  /** Keeps the answer to a load going out now, unless the answers are forgotten before it lands. */
  keeper(api: ApiClient, key: string): (data: T) => void {
    const forgets = this.forgets;
    return (data) => {
      if (forgets !== this.forgets) return;
      const answers = this.byClient.get(api) ?? new Map<string, { data: T; keptAt: number }>();
      answers.set(key, { data, keptAt: Date.now() });
      this.byClient.set(api, answers);
    };
  }

  /** Forgets every answer kept, and any on its way: the server has changed in a way they miss. */
  forget(): void {
    this.forgets += 1;
    this.byClient = new WeakMap();
  }
}

/**
 * Loads `key` ahead of its readers and keeps the answer for them, unless a fresh one is kept; settles
 * once it's done either way. A failure is only logged: a reader then loads it itself, and shows its
 * own failure.
 */
export function preloadQuery<T>(
  api: ApiClient,
  key: string,
  load: (api: ApiClient) => Promise<T>,
  answers: QueryAnswers<T>,
): Promise<void> {
  if (answers.fresh(api, key)) return Promise.resolve();
  return load(api).then(answers.keeper(api, key), (error: unknown) => {
    console.error(`Loading ${key} ahead failed`, apiError(error));
  });
}

/**
 * Loads once per `key`, and again on `retry` or `refresh`. An answer for a key that has moved on is
 * dropped; a refresh keeps the last data showing until the new data lands. With `answers`, each
 * answer is kept for the query's other readers, and a mount shows the last one at once, loading
 * nothing while it's fresh, unless `ownLoadOnly`: for a reader whose own copy of the data holds
 * changes a kept answer lacks, or that must act only on data it loaded itself.
 */
export function useApiQuery<T>(
  key: string,
  load: (api: ApiClient) => Promise<T>,
  answers?: QueryAnswers<T>,
  { ownLoadOnly = false }: { ownLoadOnly?: boolean } = {},
): Query<T> {
  const api = useApi();
  const latest = useRef(load);
  useLayoutEffect(() => {
    latest.current = load;
  });
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);

  useEffect(() => {
    if (attempt === 0 && !ownLoadOnly && answers?.fresh(api, key)) return;
    let current = true;
    const keep = answers?.keeper(api, key);
    latest.current(api).then(
      (data) => {
        if (!current) return;
        keep?.(data);
        setLoaded({ key, attempt, outcome: { ok: true, data } });
      },
      (error: unknown) => {
        const failure = apiError(error);
        console.error(`Loading ${key} failed`, failure);
        if (current) setLoaded({ key, attempt, outcome: { ok: false, error: failure } });
      },
    );
    return () => {
      current = false;
    };
  }, [api, answers, key, attempt, ownLoadOnly]);

  const again = useCallback(() => setAttempt((n) => n + 1), []);

  if (!loaded || loaded.key !== key) {
    const last = ownLoadOnly ? undefined : answers?.last(api, key);
    return last ? { state: "ready", data: last.data, refresh: again } : { state: "loading" };
  }
  if (loaded.outcome.ok) return { state: "ready", data: loaded.outcome.data, refresh: again };
  if (loaded.attempt !== attempt) return { state: "loading" };
  return { state: "failed", error: loaded.outcome.error, retry: again };
}
