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
 * Loads once per `key`, and again on `retry` or `refresh`. An answer for a key that has moved on is
 * dropped; a refresh keeps the last data showing until the new data lands.
 */
export function useApiQuery<T>(key: string, load: (api: ApiClient) => Promise<T>): Query<T> {
  const api = useApi();
  const latest = useRef(load);
  useLayoutEffect(() => {
    latest.current = load;
  });
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);

  useEffect(() => {
    let current = true;
    latest.current(api).then(
      (data) => {
        if (current) setLoaded({ key, attempt, outcome: { ok: true, data } });
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
  }, [api, key, attempt]);

  const again = useCallback(() => setAttempt((n) => n + 1), []);

  if (!loaded || loaded.key !== key) return { state: "loading" };
  if (loaded.outcome.ok) return { state: "ready", data: loaded.outcome.data, refresh: again };
  if (loaded.attempt !== attempt) return { state: "loading" };
  return { state: "failed", error: loaded.outcome.error, retry: again };
}
