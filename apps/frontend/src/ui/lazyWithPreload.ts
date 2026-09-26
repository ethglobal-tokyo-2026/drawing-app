import { createElement, lazy, useEffect, useState, type ComponentType } from "react";

interface Preloadable {
  preload: () => Promise<unknown>;
}

/**
 * A component whose code loads in its own chunk, which `preload` starts early. Unlike `React.lazy`,
 * it renders at once when its code is already in, rather than suspending and waiting out React's
 * throttled reveal. Until then it suspends, so it sits in a Suspense boundary.
 */
export function lazyWithPreload<P extends object>(
  name: string,
  load: () => Promise<ComponentType<P>>,
) {
  let loaded: ComponentType<P> | undefined;
  let loading: Promise<ComponentType<P>> | undefined;
  const preload = () => {
    if (!loading) {
      const started = load().then((component) => (loaded = component));
      loading = started;
      started.catch((error: unknown) => {
        console.error(`The code for ${name} didn't load`, error);
        // Forgotten, so opening it again loads it again.
        if (loading === started) loading = undefined;
      });
    }
    return loading;
  };
  const Lazy = lazy(async () => ({ default: await preload() }));
  function Preloaded(props: P) {
    // Picked once per mount, so one that mounted while its code loaded never remounts once it's in.
    const [Component] = useState(() => loaded ?? Lazy);
    return createElement(Component, props);
  }
  return Object.assign(Preloaded, { preload });
}

/** Once the page is idle after the first paint, starts loading the parts' code; true from then on. */
export function usePreloadWhenIdle(parts: readonly Preloadable[]) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const run = () => {
      setIdle(true);
      for (const part of parts) void part.preload();
    };
    // Safari has no requestIdleCallback.
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(run, 1000);
    return () => clearTimeout(id);
  }, [parts]);
  return idle;
}
