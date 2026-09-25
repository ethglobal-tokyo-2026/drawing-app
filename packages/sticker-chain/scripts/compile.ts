import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";
import type { Abi } from "viem";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = "contracts/StickerNFT.sol";

interface SolcOutput {
  contracts?: Record<string, Record<string, {
    abi: Abi;
    evm: { bytecode: { object: string } };
  }>>;
  errors?: Array<{ severity: string; formattedMessage: string }>;
}

export function compileSticker() {
  const source = readFileSync(path.join(root, contractPath), "utf8");
  const input = {
    language: "Solidity",
    sources: { [contractPath]: { content: source } },
    settings: {
      evmVersion: "shanghai",
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input), {
    import: (importPath: string) => {
      if (!importPath.startsWith("@openzeppelin/contracts/")) {
        return { error: `Import denied: ${importPath}` };
      }
      const dependencyPath = path.join(root, "node_modules", importPath);
      return existsSync(dependencyPath)
        ? { contents: readFileSync(dependencyPath, "utf8") }
        : { error: `Import not found: ${importPath}` };
    },
  })) as SolcOutput;
  const errors = (output.errors ?? []).filter(({ severity }) => severity === "error");
  if (errors.length > 0) {
    throw new Error(errors.map(({ formattedMessage }) => formattedMessage).join("\n"));
  }
  const compiled = output.contracts?.[contractPath]?.StickerNFT;
  if (!compiled) throw new Error("Solidity compiler returned no StickerNFT artifact");
  return { abi: compiled.abi, bytecode: `0x${compiled.evm.bytecode.object}` as const };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const artifact = compileSticker();
  const outputPath = path.join(root, "dist", "StickerNFT.json");
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(artifact, null, 2));
  process.stdout.write(`Compiled StickerNFT to ${outputPath}\n`);
}
