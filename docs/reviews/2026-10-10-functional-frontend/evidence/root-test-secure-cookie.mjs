// Retain until the iPad Safari runner preserves the API's cookie flags on its HTTPS server.
// Run with the frontend's tsx loader, as documented in root-test-session.md.
import e2e from "../../../../apps/frontend/e2e/vite.config.ts";

// The same shallow server copy created by ipadSafari.ts; HTTPS does not remove proxy callbacks.
const simulator = { ...e2e, server: { ...e2e.server, https: {} } };
let onResponse;
simulator.server.proxy["/api"].configure({
  on(event, callback) {
    if (event === "proxyRes") onResponse = callback;
  },
});
const response = {
  headers: { "set-cookie": ["session=review; Path=/; HttpOnly; Secure; SameSite=Lax"] },
};
if (!onResponse) throw new Error("No API proxy response handler");
onResponse(response);
console.log(response.headers["set-cookie"][0]);
if (/;\s*Secure(?:;|$)/i.test(response.headers["set-cookie"][0])) {
  throw new Error("The reproduction no longer observes the Secure flag removal");
}
