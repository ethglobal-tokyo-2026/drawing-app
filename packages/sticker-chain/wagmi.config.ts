import { readFileSync } from "node:fs";
import { defineConfig } from "@wagmi/cli";
import type { Abi } from "viem";

interface ContractArtifact {
  abi: Abi;
}

function readArtifact(name: string) {
  return JSON.parse(readFileSync(new URL(`./dist/${name}.json`, import.meta.url), "utf8")) as ContractArtifact;
}

export default defineConfig({
  out: "src/generated/contracts.ts",
  contracts: [
    { name: "stickerNft", abi: readArtifact("StickerNFT").abi },
    { name: "stickerGiftEscrow", abi: readArtifact("StickerGiftEscrow").abi },
  ],
});
