# Sticker chain package

This package contains the first backend and contract boundaries for sealing stickers on World Chain.

## Behavior

- `StickerNFT.sol` creates one ERC-721 NFT for each sealed sticker.
- The artist's World Chain smart account receives the NFT when the sticker is sealed.
- The original artist, content hash, and metadata URI remain immutable after later ownership transfers.
- The backend reconciles repeat requests against the existing NFT instead of creating another NFT.
- The LINE authentication server verifies the LIFF ID token with LINE before issuing a five-minute Privy Custom Auth JWT.

The package does not deploy the contract, persist application records, upload sticker assets, configure Privy, or fund a paymaster. Giving and receiving stickers are separate flows.

## Commands

```sh
pnpm --filter @drawing-app/sticker-chain test
pnpm --filter @drawing-app/sticker-chain compile
```

The compiler writes `dist/StickerNFT.json`. Configure Privy Custom Authentication with the deployed app's `/.well-known/jwks.json`, use `sub` as the user ID claim, and keep the P-256 private key outside the repository.

## Required integration checks

1. Persist immutable `artistId`, `sealedAt`, `contentHash`, and `metadataUri` values before minting.
2. Store and verify the artist's World Chain smart account address. Do not mint to its Privy signer EOA.
3. Configure a World Chain Sepolia bundler and funded paymaster, then verify a transfer from a zero-balance artist wallet.
4. Submit sealing through a durable backend job and add the sticker to the sticker tray only after a successful transaction receipt.
5. Keep ENS updates asynchronous and optional because ENS and World Chain transactions cannot be atomic.

References:

- https://docs.world.org/world-chain/quick-start/info
- https://docs.world.org/world-chain/providers/paymasters
- https://docs.privy.io/wallets/using-wallets/evm-smart-wallets/overview
- https://docs.privy.io/authentication/user-authentication/jwt-based-auth/usage
- https://developers.line.biz/en/docs/line-login/verify-id-token/
