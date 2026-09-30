/** A handle split round where a search matched it. */
export interface HandleMatch {
  before: string;
  match: string;
  after: string;
}

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Where `query` sits in `handle`, in any case, or null. It matches the handle itself, so the indexes
 * are the handle's own, which a lowercased copy's aren't for letters whose lowercase is longer.
 */
export function matchIn(handle: string, query: string): HandleMatch | null {
  const found = new RegExp(escaped(query), "iu").exec(handle);
  if (!found) return null;
  const end = found.index + found[0].length;
  return { before: handle.slice(0, found.index), match: found[0], after: handle.slice(end) };
}
