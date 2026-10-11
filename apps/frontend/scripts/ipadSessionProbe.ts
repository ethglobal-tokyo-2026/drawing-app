import { createHash } from "node:crypto";
import type { ServerOptions } from "node:https";
import { createE2eServerConfig } from "../e2e/serverConfig";

const fingerprint = (cookie: string) => createHash("sha256").update(cookie).digest("hex");

/** Compare the browser's exact session cookie without returning or logging its signed value. */
export function createIpadSessionObservation() {
  const issued = new Map<string, { httpOnly: boolean; secure: boolean }>();
  return {
    observe(headers: string[] | undefined) {
      for (const header of headers ?? []) {
        const [cookie, ...attributes] = header.split(";").map((part) => part.trim());
        if (!cookie.startsWith("session=")) continue;
        const flags = attributes.map((part) => part.toLowerCase());
        issued.set(fingerprint(cookie), {
          httpOnly: flags.includes("httponly"),
          secure: flags.includes("secure"),
        });
      }
    },
    read(header: string | undefined) {
      const cookie = header
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("session="));
      const digest = cookie ? fingerprint(cookie) : "";
      return { cookie: digest, ...(issued.get(digest) ?? { httpOnly: false, secure: false }) };
    },
  };
}

/** Safari's cookie enumeration is unreliable; observe its real requests in this test server. */
export function createIpadSafariServerConfig(options: { https: ServerOptions }) {
  const config = createE2eServerConfig(options);
  const api = config.server?.proxy?.["/api"];
  if (!api || typeof api === "string")
    throw new Error("The iPad session probe needs the API proxy");
  const observation = createIpadSessionObservation();
  const configure = api.configure;
  api.configure = (proxy, proxyOptions) => {
    configure?.(proxy, proxyOptions);
    proxy.on("proxyRes", (response, request) => {
      if (
        request.method === "POST" &&
        new URL(request.url ?? "/", "https://localhost").pathname === "/api/session"
      ) {
        observation.observe(response.headers["set-cookie"]);
      }
    });
  };
  config.plugins = [
    ...(config.plugins ?? []),
    {
      name: "ipad-session-cookie-probe",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (new URL(req.url ?? "/", "https://localhost").pathname !== "/api/__e2e/ipad-session") {
            next();
            return;
          }
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(observation.read(req.headers.cookie)));
        });
      },
    },
  ];
  return config;
}
