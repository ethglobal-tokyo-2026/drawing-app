import { readStored, writeStored } from "./deviceStorage";

/** How a setting reads storage's text (null: nothing kept), writes it (null: keep nothing), and is named in the log. */
interface Format<T> {
  parse: (text: string | null) => T;
  serialize: (value: T) => string | null;
  name: string;
}

/**
 * A setting this device keeps under `key`, which every screen reading it follows at once. A value
 * storage refuses still holds until the page goes, so the app does what the person chose; `set` says
 * whether it was kept. For primitives: `get` parses afresh each call, which `useSyncExternalStore`
 * would take as a change for an object.
 */
export function deviceSetting<T>(key: string, { parse, serialize, name }: Format<T>) {
  const listeners = new Set<() => void>();
  /** A value storage refused, which holds for this page. */
  let unkept: { value: T } | null = null;
  return {
    get: (): T =>
      unkept ? unkept.value : parse(readStored(key, `${name} can't be read on this device`).text),
    set: (value: T): boolean => {
      const kept = writeStored(key, serialize(value), `${name} can't be kept on this device`);
      unkept = kept ? null : { value };
      for (const listener of listeners) listener();
      return kept;
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
