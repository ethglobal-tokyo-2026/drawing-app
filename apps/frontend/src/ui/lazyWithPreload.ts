import { createElement, lazy, useState, type ComponentType } from "react";
import { LazyScreenBoundary } from "./LazyScreenBoundary";
import { LoadFailure } from "./loadFailure";

/**
 * A component whose code loads in its own chunk, which `preload` starts early. Unlike `React.lazy`,
 * it renders at once when its code is already in, rather than suspending and waiting out React's
 * throttled reveal. Until then it suspends, so it sits in a Suspense boundary. Code that doesn't load
 * shows a note with Reload, and leaves the rest of the app up.
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
  const Lazy = lazy(() =>
    preload().then(
      (component) => ({ default: component }),
      (cause: unknown) => {
        throw new LoadFailure(name, cause);
      },
    ),
  );
  function Preloaded(props: P) {
    // Picked once per mount, so one that mounted while its code loaded never remounts once it's in.
    const [Component] = useState(() => loaded ?? Lazy);
    return createElement(LazyScreenBoundary, null, createElement(Component, props));
  }
  return Object.assign(Preloaded, { preload });
}
