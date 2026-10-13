import { once } from "node:events";
import { onTestFinished } from "vitest";
import { createAuthHttpServer } from "../../src/auth-http.js";

/** Starts the auth server on a free port for the current test, recording the errors it logs. */
export async function startAuthServer(
  options: Omit<Parameters<typeof createAuthHttpServer>[0], "logger">,
) {
  const errors: unknown[] = [];
  const server = createAuthHttpServer({
    ...options,
    logger: { error: (_message, details) => errors.push(details.error) },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  onTestFinished(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no TCP address");
  return { url: `http://127.0.0.1:${address.port}`, errors };
}
