#!/usr/bin/env bash
# deploy/deploy-contracts.sh: deploy the names under ENS_PARENT_LABEL.eth and StickerGiftEscrow to
# Ethereum Sepolia, keeping the StickerNFT at STICKER_NFT_ADDRESS when it is set.
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
: "${ENS_GATEWAY_PRIVATE_KEY:?set ENS_GATEWAY_PRIVATE_KEY in deploy/.env}"
: "${ENS_GATEWAY_URL:?set ENS_GATEWAY_URL in deploy/.env}"
: "${ENS_PARENT_LABEL:?set ENS_PARENT_LABEL in deploy/.env}"

cd "$ROOT/packages/sticker-chain"
# Forge takes one RPC: the first of a comma-separated list, which the REST API tries in turn.
forge script script/DeployStickerContracts.s.sol:DeployStickerContracts \
  --rpc-url "${ETHEREUM_SEPOLIA_RPC_URL%%,*}" \
  --broadcast

echo "Copy the printed STICKER_NFT_ADDRESS, STICKER_GIFT_ESCROW_ADDRESS, CROQUIS_NAMES_ADDRESS and"
echo "CROQUIS_RESOLVER_ADDRESS into deploy/.env, then run ./deploy/deploy.sh."
