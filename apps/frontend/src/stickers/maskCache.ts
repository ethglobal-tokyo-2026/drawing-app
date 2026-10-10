/**
 * The crease worker's masks, each loaded once and kept while it's among the `most` used last, so the
 * boards visited long ago let theirs go. One let go isn't closed: a bake in flight may still draw it.
 * A load that fails is let go at once, so the next bake tries again.
 */
export function maskCache<T>(
  load: (url: string) => Promise<T>,
  most: number,
): (url: string) => Promise<T> {
  // A Map keeps the order its keys went in, so the one used longest ago comes first.
  const kept = new Map<string, Promise<T>>();
  return (url) => {
    const known = kept.get(url);
    const mask = known ?? load(url);
    kept.delete(url);
    kept.set(url, mask);
    if (!known) {
      mask.catch(() => {
        if (kept.get(url) === mask) kept.delete(url);
      });
    }
    for (const oldest of kept.keys()) {
      if (kept.size <= most) break;
      kept.delete(oldest);
    }
    return mask;
  };
}
