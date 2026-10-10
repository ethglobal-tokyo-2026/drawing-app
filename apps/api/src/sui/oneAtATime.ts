/** Each key's last call, which the next call waits for. */
const lastCalls = new Map<string, Promise<unknown>>();

/**
 * Runs `fn` once every earlier call with the same key has settled, so a flow reads, sponsors,
 * submits and settles a sticker's, gift's or payer's transactions with no other flow in between.
 * Keys are `sticker:<id>`, `gift:<id>` and `payer:<sui address>`; `nsfw-mark:<sticker id>` for a
 * sticker's 18+ marks and their removal, `cdn-purge:<content hash>` for a drawing's CDN purges,
 * and `chat-menu:<user id>` for linking a person's chat menu.
 */
export function oneAtATime<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (lastCalls.get(key) ?? Promise.resolve()).then(fn);
  // The next call waits for this one to settle either way; its rejection reaches its own caller.
  const settled = run.then(
    () => undefined,
    () => undefined,
  );
  lastCalls.set(key, settled);
  void settled.then(() => {
    if (lastCalls.get(key) === settled) lastCalls.delete(key);
  });
  return run;
}
