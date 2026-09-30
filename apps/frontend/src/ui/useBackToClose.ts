import { useEffect, useLayoutEffect, useRef } from "react";

/** Marks this app's overlay entries in history.state; the value is the overlay's id. */
const KEY = "drawingAppOverlay";

/**
 * How long a closed overlay's step back waits: a Back pressed as it closed, still on its way from the
 * browser, lands first and takes the entry itself, where stepping back as well would take two.
 */
const STEP_BACK_HOLD_MS = 250;

interface BackWindow {
  history: Pick<History, "state" | "pushState" | "replaceState" | "back">;
  addEventListener: (type: "popstate", listener: (e: { state: unknown }) => void) => void;
}

interface Overlay {
  id: string;
  /** Returns false when the overlay can't close yet; it keeps an entry, so Back can try again. */
  close: () => boolean | void;
  state: "waiting" | "pushed" | "closed";
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const markerOf = (state: unknown) => (isRecord(state) ? state[KEY] : undefined);

/**
 * A stack of overlays, each with its own history entry, marked in history.state, never a new URL:
 * Android's Back and LINE's Back pop the top entry, and the overlay on it closes. An overlay closed
 * any other way takes its entry off too, so Back never lands on a closed overlay. Entries that
 * aren't marked belong to the rest of the app, which may have been there first.
 */
export function createBackStack(win: BackWindow) {
  // Ids differ between page loads, so an entry left marked from before a reload is never taken for a live one.
  const run = Math.random().toString(36).slice(2, 8);
  let made = 0;
  /** Overlays with an entry in history, bottom first. A closed one stays until Back passes its entry. */
  const stack: Overlay[] = [];
  /** Ids whose entries this stack went back past: Forward onto one goes back again. */
  const gone = new Set<string>();
  /** history.back() calls of ours whose popstate hasn't come yet. Pushes wait for them. */
  let ownPops = 0;
  const waiting: Overlay[] = [];
  /** A closed overlay's step back, held STEP_BACK_HOLD_MS while its entry is the current one. */
  let pending: { id: string; timer: ReturnType<typeof setTimeout> } | null = null;

  const flush = () => {
    if (ownPops === 0) for (const overlay of waiting.splice(0)) push(overlay);
  };

  function push(overlay: Overlay) {
    overlay.id = `${run}-${++made}`;
    if (ownPops > 0) {
      overlay.state = "waiting";
      waiting.push(overlay);
      return;
    }
    const state: unknown = win.history.state;
    const marked = { ...(isRecord(state) ? state : {}), [KEY]: overlay.id };
    // An overlay opening as another closes takes the closed one's entry, with no step back to race.
    if (pending) {
      clearTimeout(pending.timer);
      pending = null;
      win.history.replaceState(marked, "");
    } else win.history.pushState(marked, "");
    overlay.state = "pushed";
    stack.push(overlay);
  }

  function goBack() {
    ownPops++;
    win.history.back();
  }

  win.addEventListener("popstate", (e) => {
    const at = markerOf(e.state);
    // A Back beat a close's held step to the entry: the entry's gone, so the step is too.
    if (pending && at !== pending.id) {
      clearTimeout(pending.timer);
      pending = null;
    }
    if (ownPops > 0) ownPops--;
    else if (typeof at === "string" && gone.has(at)) {
      goBack();
      return;
    } else {
      // Everything above the entry Back landed on closes, top first.
      const keep = stack.findIndex((o) => o.id === at) + 1;
      for (const overlay of stack.splice(keep).reverse()) {
        gone.add(overlay.id);
        if (overlay.state === "closed") continue;
        overlay.state = "closed";
        if (overlay.close() === false) push(overlay);
      }
    }
    // Landed on the entry of an overlay closed while another sat above it: step past it too.
    const top = stack.at(-1);
    if (top?.state === "closed" && top.id === markerOf(win.history.state)) {
      stack.pop();
      gone.add(top.id);
      goBack();
      return;
    }
    flush();
  });

  return {
    open(close: Overlay["close"]): Overlay {
      const overlay: Overlay = { id: "", close, state: "waiting" };
      push(overlay);
      return overlay;
    },
    /** The overlay closed on its own: its entry comes off if it's on top, else when Back passes it. */
    release(overlay: Overlay) {
      if (overlay.state === "waiting") waiting.splice(waiting.indexOf(overlay), 1);
      const wasPushed = overlay.state === "pushed";
      overlay.state = "closed";
      if (!wasPushed || markerOf(win.history.state) !== overlay.id) return;
      stack.splice(stack.indexOf(overlay), 1);
      gone.add(overlay.id);
      const id = overlay.id;
      pending = {
        id,
        timer: setTimeout(() => {
          pending = null;
          if (markerOf(win.history.state) === id) goBack();
          else flush();
        }, STEP_BACK_HOLD_MS),
      };
    },
  };
}

let appStack: ReturnType<typeof createBackStack> | null = null;

/**
 * While `open`, Back closes this overlay by calling `close`, instead of leaving the app. `close`
 * returns false when the overlay can't close yet.
 */
export function useBackToClose(open: boolean, close: () => boolean | void) {
  const latest = useRef(close);
  useLayoutEffect(() => {
    latest.current = close;
  });
  useEffect(() => {
    if (!open) return;
    appStack ??= createBackStack(window);
    const stack = appStack;
    const overlay = stack.open(() => latest.current());
    return () => stack.release(overlay);
  }, [open]);
}
