import { randomUUID } from "node:crypto";
import type { ServerOptions } from "node:https";
import { defineConfig, mergeConfig, type Plugin, type UserConfig } from "vite";
import appConfig from "../vite.config.ts";
import { E2E_API_PORT, E2E_APP_PORT } from "./ports.ts";

const PROBE_COOKIE = "e2e_session_probe";

function probeFromCookie(header: string | undefined) {
  return header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PROBE_COOKIE}=`))
    ?.slice(PROBE_COOKIE.length + 1);
}

/** Count only session creations from the browser that owns each independent probe cookie. */
function sessionProbe(https: boolean): {
  plugin: Plugin;
  count: (cookie: string | undefined) => void;
} {
  const probes = new Map<string, number>();
  const attributes = `HttpOnly; SameSite=Lax; Path=/${https ? "; Secure" : ""}`;
  return {
    plugin: {
      name: "e2e-session-probe",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const path = new URL(req.url ?? "/", "http://localhost").pathname;
          if (path !== "/__e2e/session-probe" && path !== "/__e2e/session-requests") {
            next();
            return;
          }
          res.setHeader("Cache-Control", "no-store");
          const existing = probeFromCookie(req.headers.cookie);
          if (path === "/__e2e/session-probe" && req.method === "POST") {
            if (existing) probes.delete(existing);
            const probe = randomUUID();
            probes.set(probe, 0);
            res.setHeader("Set-Cookie", `${PROBE_COOKIE}=${probe}; Max-Age=600; ${attributes}`);
            res.statusCode = 204;
            res.end();
            return;
          }
          if (!existing || !probes.has(existing)) {
            res.statusCode = 400;
            res.end("Session probe missing");
            return;
          }
          if (path === "/__e2e/session-requests" && req.method === "GET") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ created: probes.get(existing) }));
            return;
          }
          if (path === "/__e2e/session-probe" && req.method === "DELETE") {
            probes.delete(existing);
            res.setHeader("Set-Cookie", `${PROBE_COOKIE}=; Max-Age=0; ${attributes}`);
            res.statusCode = 204;
            res.end();
            return;
          }
          res.statusCode = 405;
          res.end("Session probe method not allowed");
        });
      },
    },
    count(cookie) {
      const probe = probeFromCookie(cookie);
      if (probe === undefined) return;
      const created = probes.get(probe);
      if (created !== undefined) probes.set(probe, created + 1);
    },
  };
}

/** The browser suite uses HTTP; the iPad Safari script passes its certificate for HTTPS. */
export function createE2eServerConfig(options: { https?: ServerOptions } = {}): UserConfig {
  const https = options.https !== undefined;
  const probe = sessionProbe(https);
  return mergeConfig(
    appConfig,
    defineConfig({
      plugins: [probe.plugin],
      server: {
        port: E2E_APP_PORT,
        strictPort: true,
        ...(https ? { https: options.https } : {}),
        proxy: {
          "/api": {
            target: `http://127.0.0.1:${E2E_API_PORT}`,
            configure: (proxy) => {
              proxy.on("proxyReq", (_proxyReq, req) => {
                if (
                  req.method === "POST" &&
                  new URL(req.url ?? "/", "http://localhost").pathname === "/api/session"
                ) {
                  probe.count(req.headers.cookie);
                }
              });
              if (!https) {
                proxy.on("proxyRes", (res) => {
                  res.headers["set-cookie"] = res.headers["set-cookie"]?.map((cookie) =>
                    cookie.replace(/;\s*secure(?=;|$)/gi, ""),
                  );
                });
              }
            },
          },
        },
      },
    }),
  );
}
