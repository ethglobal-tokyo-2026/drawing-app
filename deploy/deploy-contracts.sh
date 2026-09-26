#!/usr/bin/env bash
# deploy/deploy-contracts.sh: deploy StickerNFT and StickerGiftEscrow to Ethereum Sepolia.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$ROOT/deploy/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$ROOT/deploy/.env"
  set +a
fi

: "${ETHEREUM_SEPOLIA_RPC_URL:?set ETHEREUM_SEPOLIA_RPC_URL in deploy/.env}"
: "${DEPLOYER_PRIVATE_KEY:?set DEPLOYER_PRIVATE_KEY in deploy/.env}"
: "${STICKER_SEALER_PRIVATE_KEY:?set STICKER_SEALER_PRIVATE_KEY in deploy/.env}"

cd "$ROOT/packages/sticker-chain"
forge script script/DeployStickerContracts.s.sol:DeployStickerContracts \
  --rpc-url "$ETHEREUM_SEPOLIA_RPC_URL" \
  --broadcast

echo "Copy StickerNFT and StickerGiftEscrow into deploy/.env, then run ./deploy/deploy.sh."
