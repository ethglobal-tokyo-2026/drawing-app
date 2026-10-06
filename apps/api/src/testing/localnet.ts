import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requestSuiFromFaucetV2 } from "@mysten/sui/faucet";
import { SuiGrpcClient } from "@mysten/sui/grpc";

/** How long `sui start` may take to make a genesis and answer at its faucet. */
export const LOCALNET_START_TIMEOUT_MS = 60_000;
/** How long the faucet's transfer may take to show on the fullnode. */
const FUNDING_TIMEOUT_MS = 30_000;
/** How long a stopping localnet may take to exit before it's killed. */
const STOP_TIMEOUT_MS = 10_000;
/** How often the faucet is asked whether it's up. */
const POLL_MS = 250;
/** Longer than any test, so no epoch change pauses one. */
const EPOCH_MS = 60 * 60_000;

/**
 * Runs `sui start` with the arguments after the script. Sui keeps its whole network under TMPDIR,
 * which the wrapper deletes once sui exits. A watcher stops sui when the test process's end of
 * stdin closes, which happens however that process ends, so no localnet outlives its test. The
 * watcher reads stdin through fd 3, since a background job's own stdin is /dev/null. Once sui has
 * the pipes, the wrapper's own notices go to /dev/null: written to a dead test's pipe, the notice
 * that sui was stopped would kill the wrapper before it deletes TMPDIR.
 */
const WRAPPER = `
exec 3<&0
sui start "$@" </dev/null &
sui_pid=$!
trap '' PIPE
exec 2>/dev/null
(while read -r _ <&3; do :; done; kill "$sui_pid") &
wait "$sui_pid"
status=$?
rm -rf "$TMPDIR"
exit "$status"
`;

/** Ports nothing on this machine listens on now, held together so they differ. */
async function freePorts(count: number): Promise<number[]> {
  const servers: Server[] = [];
  try {
    for (let i = 0; i < count; i++) {
      const server = createServer();
      servers.push(server);
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
    }
    return servers.map((server) => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        throw new Error("A port listened on 127.0.0.1 has no port number");
      }
      return address.port;
    });
  } finally {
    await Promise.all(
      servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
    );
  }
}

export interface Localnet {
  /** The fullnode, which answers gRPC. */
  client: SuiGrpcClient;
  rpcUrl: string;
  faucetUrl: string;
  /** Where the network keeps its state, which stopping deletes. */
  stateDir: string;
  /** Has the faucet send `recipient` SUI, and answers the IDs of the coins it sent. */
  fund: (recipient: string) => Promise<string[]>;
  /** Stops the network and deletes everything it wrote. */
  stop: () => Promise<void>;
}

/**
 * A Sui network of its own on this machine: `sui start --force-regenesis` with a faucet, on ports
 * free when it starts. Resolves once the faucet and the fullnode answer; rejects with sui's output
 * when it exits first or LOCALNET_START_TIMEOUT_MS runs out.
 */
export async function startLocalnet(): Promise<Localnet> {
  const dir = await mkdtemp(join(tmpdir(), "croquis-localnet-"));
  const [rpcPort, faucetPort] = await freePorts(2);
  const rpcUrl = `http://127.0.0.1:${rpcPort}`;
  const faucetUrl = `http://127.0.0.1:${faucetPort}`;
  const args = [
    "--force-regenesis",
    `--with-faucet=127.0.0.1:${faucetPort}`,
    `--fullnode-rpc-port=${rpcPort}`,
    `--epoch-duration-ms=${EPOCH_MS}`,
  ];
  const started = performance.now();
  process.stderr.write(`localnet: starting sui on ${rpcUrl}, faucet ${faucetUrl}\n`);
  const child = spawn("/bin/sh", ["-c", WRAPPER, "localnet", ...args], {
    env: { ...process.env, TMPDIR: dir },
    stdio: ["pipe", "pipe", "pipe"],
    // Its own process group, so a localnet that won't stop can be killed with its wrapper.
    detached: true,
  });
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
  child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
  // Closing stdin once the wrapper has exited can fail with EPIPE, and only means it's gone.
  child.stdin.on("error", () => undefined);
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  const spawning: { failure?: Error } = {};
  child.once("error", (error) => (spawning.failure = error));
  const running = () => child.exitCode === null && child.signalCode === null;

  const stop = async () => {
    child.stdin.end();
    if (running()) {
      const timer = setTimeout(() => {
        try {
          if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
        } catch {
          // ESRCH: the group exited between the check and the kill, which is what was wanted.
        }
      }, STOP_TIMEOUT_MS);
      await exited;
      clearTimeout(timer);
    }
    await rm(dir, { recursive: true, force: true });
  };

  const client = new SuiGrpcClient({ network: "localnet", baseUrl: rpcUrl });
  const deadline = Date.now() + LOCALNET_START_TIMEOUT_MS;
  try {
    for (;;) {
      if (spawning.failure) throw spawning.failure;
      if (!running()) {
        throw new Error(`sui start exited before its faucet answered:\n${output || "(no output)"}`);
      }
      if (Date.now() > deadline) {
        throw new Error(
          `sui start's faucet didn't answer within ${LOCALNET_START_TIMEOUT_MS} ms:\n${output || "(no output)"}`,
        );
      }
      const up = await fetch(`${faucetUrl}/`, { signal: AbortSignal.timeout(POLL_MS * 4) }).then(
        (response) => response.ok,
        () => false,
      );
      if (up) break;
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
    await client.getReferenceGasPrice();
  } catch (error) {
    await stop();
    throw error;
  }
  process.stderr.write(
    `localnet: up in ${Math.round(performance.now() - started)} ms, its state in ${dir}\n`,
  );

  return {
    client,
    rpcUrl,
    faucetUrl,
    stateDir: dir,
    fund: async (recipient) => {
      const answer = await requestSuiFromFaucetV2({ host: faucetUrl, recipient });
      if (answer.status !== "Success" || !answer.coins_sent) {
        throw new Error(`The localnet faucet didn't fund ${recipient}: ${JSON.stringify(answer)}`);
      }
      const transfers = new Set(answer.coins_sent.map((coin) => coin.transferTxDigest));
      await Promise.all(
        [...transfers].map((digest) =>
          client.waitForTransaction({ digest, timeout: FUNDING_TIMEOUT_MS }),
        ),
      );
      return answer.coins_sent.map((coin) => coin.id);
    },
    stop,
  };
}
