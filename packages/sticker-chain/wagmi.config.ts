import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "src/generated/contracts.ts",
  plugins: [
    foundry({
      project: ".",
      include: [
        "StickerNFT.json",
        "StickerGiftEscrow.json",
        "CroquisNames.json",
        "CroquisResolver.json",
      ],
      forge: { build: false },
    }),
  ],
});
