/**
 * Starts a module worker from its built script. A worker's script must come from the page's own origin, and the
 * build's files may be on the CDN, so a script elsewhere starts through a module of the page's own that imports it,
 * which the CDN's CORS headers allow. `stop` ends the worker and lets that module go.
 */
export function startWorker(script: string): { worker: Worker; stop: () => void } {
  const url = new URL(script, location.href);
  if (url.origin === location.origin) {
    const worker = new Worker(url, { type: "module" });
    return { worker, stop: () => worker.terminate() };
  }
  const boot = URL.createObjectURL(
    new Blob([`import ${JSON.stringify(url.href)};`], { type: "text/javascript" }),
  );
  try {
    const worker = new Worker(boot, { type: "module" });
    return {
      worker,
      stop: () => {
        worker.terminate();
        URL.revokeObjectURL(boot);
      },
    };
  } catch (error) {
    URL.revokeObjectURL(boot);
    throw error;
  }
}
