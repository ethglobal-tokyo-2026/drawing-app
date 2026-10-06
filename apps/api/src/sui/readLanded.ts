/**
 * How long reading a transaction from Sui may take in all, well inside the app's own request
 * timeout; also how long each request of a paged read may take.
 */
export const SUI_READ_TIMEOUT_MS = 10_000;
/** How soon a transaction Sui doesn't show yet is asked for again. */
export const NOT_LANDED_RETRY_MS = 1_000;

/**
 * Reads a transaction with `read`, which answers null while Sui doesn't show it, asking again until
 * SUI_READ_TIMEOUT_MS runs out; null if Sui never showed it by then. The public fullnode is
 * load-balanced, so the node that answers can be behind one that just ran the transaction. A failure
 * to reach Sui rejects at once rather than passing for a transaction Sui doesn't have; a read the
 * time running out cuts off rejects too, unless an earlier one has already answered that Sui doesn't
 * show it.
 */
export async function readLanded<T>(
  read: (signal: AbortSignal) => Promise<T | null>,
): Promise<T | null> {
  const signal = AbortSignal.timeout(SUI_READ_TIMEOUT_MS);
  const deadline = Date.now() + SUI_READ_TIMEOUT_MS;
  let answered = false;
  for (;;) {
    let found: T | null;
    try {
      found = await read(signal);
    } catch (error) {
      if (answered && signal.aborted) return null;
      throw error;
    }
    if (found !== null) return found;
    answered = true;
    if (deadline - Date.now() <= NOT_LANDED_RETRY_MS) return null;
    await new Promise((resolve) => setTimeout(resolve, NOT_LANDED_RETRY_MS));
  }
}
