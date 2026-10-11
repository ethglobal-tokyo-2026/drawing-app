import { spawn } from "node:child_process";
import { once } from "node:events";
import { expect, it } from "vitest";
import { describeIpadServerCleanupFailure, stopIpadServers } from "./ipadServers";

it("waits for every server to exit before simulator cleanup can start", async () => {
  const child = spawn(process.execPath, [
    "-e",
    `
    process.on("SIGTERM", () => setTimeout(() => process.exit(0), 100));
    setInterval(() => {}, 1000);
    console.log("ready");
  `,
  ]);
  await once(child.stdout, "data");
  try {
    await stopIpadServers([child]);
    expect(child.exitCode).toBe(0);
    await stopIpadServers([child]);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, "close");
      child.kill("SIGKILL");
      await closed;
    }
  }
});

it("includes every failed server PID and its underlying reason in the cleanup diagnostic", () => {
  const failure = new AggregateError(
    [
      new Error("Could not stop iPad test server PID 42", {
        cause: new Error("The operation was aborted", {
          cause: new DOMException("The operation was aborted due to timeout", "TimeoutError"),
        }),
      }),
      new Error("Could not stop iPad test server PID 84", {
        cause: new Error("kill EPERM"),
      }),
    ],
    "iPad test servers did not stop",
  );
  expect(describeIpadServerCleanupFailure(failure)).toBe(
    "iPad test servers did not stop; Could not stop iPad test server PID 42; The operation was aborted; The operation was aborted due to timeout; Could not stop iPad test server PID 84; kill EPERM",
  );
});
