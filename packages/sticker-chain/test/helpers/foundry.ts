import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import type { Abi, Hex } from "viem";
import { mnemonicToAccount, type HDAccount } from "viem/accounts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const mnemonic = "test test test test test test test test test test test junk";

// Anvil can answer a sent transaction before mining it, so a receipt may need a second poll; viem's default
// 4 s between polls suits a real chain's blocks, not a test's time limit.
export const anvilPollingInterval = 50;

interface FoundryArtifact {
  abi: Abi;
  bytecode: { object: Hex };
}

export interface AnvilInstance {
  accounts: HDAccount[];
  close: () => Promise<void>;
  rpcUrl: string;
}

// forge writes the artifact; this checks the parts the tests use before trusting its shape.
const isFoundryArtifact = (value: unknown): value is FoundryArtifact => {
  if (typeof value !== "object" || value === null) return false;
  const abi: unknown = Reflect.get(value, "abi");
  const bytecode: unknown = Reflect.get(value, "bytecode");
  if (!Array.isArray(abi) || typeof bytecode !== "object" || bytecode === null) return false;
  const object: unknown = Reflect.get(bytecode, "object");
  return typeof object === "string" && object.startsWith("0x");
};

export function readFoundryArtifact(sourceName: string, contractName: string) {
  const artifactPath = resolve(projectRoot, "out", `${sourceName}.sol`, `${contractName}.json`);
  const artifact: unknown = JSON.parse(readFileSync(artifactPath, "utf8"));
  if (!isFoundryArtifact(artifact)) {
    throw new Error(`${contractName} artifact at ${artifactPath} has no ABI or valid bytecode`);
  }
  return { abi: artifact.abi, bytecode: artifact.bytecode.object };
}

async function reservePort() {
  const server = createServer();
  await new Promise<void>((resolveListening, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListening);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not reserve a port for Anvil");
  }
  await new Promise<void>((resolveClosed, reject) => {
    server.close((error) => (error ? reject(error) : resolveClosed()));
  });
  return address.port;
}

async function stopAnvil(process: ChildProcessWithoutNullStreams) {
  if (process.exitCode !== null) return;
  process.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolveExit) => process.once("exit", () => resolveExit())),
    delay(1_000).then(() => undefined),
  ]);
  if (process.exitCode === null) process.kill("SIGKILL");
}

export async function startAnvil(chainId: number): Promise<AnvilInstance> {
  const port = await reservePort();
  const rpcUrl = `http://127.0.0.1:${port}`;
  const process = spawn(
    "anvil",
    [
      "--silent",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--chain-id",
      String(chainId),
      "--mnemonic",
      mnemonic,
      "--accounts",
      "8",
    ],
    { cwd: projectRoot },
  );
  let processError: Error | undefined;
  let stderr = "";
  process.once("error", (error) => {
    processError = error;
  });
  process.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (processError) throw processError;
    if (process.exitCode !== null) {
      throw new Error(`Anvil exited before becoming ready: ${stderr.trim()}`);
    }
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      if (response.ok) {
        return {
          accounts: Array.from({ length: 8 }, (_, addressIndex) =>
            mnemonicToAccount(mnemonic, { addressIndex }),
          ),
          close: () => stopAnvil(process),
          rpcUrl,
        };
      }
    } catch {
      // Anvil has not started listening yet.
    }
    await delay(25);
  }

  await stopAnvil(process);
  throw new Error(`Anvil did not become ready: ${stderr.trim()}`);
}
