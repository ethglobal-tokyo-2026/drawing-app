# Sticker chain package

This package contains the first backend and contract boundaries for sealing stickers on World Chain.

## Behavior

- `StickerNFT.sol` creates one ERC-721 NFT for each sealed sticker.
- `StickerGiftEscrow.sol` lets an artist complete Giving before the recipient has an account.
- The artist's World Chain smart account receives the NFT when the sticker is sealed.
- The original artist, content hash, and metadata URI remain immutable after later ownership transfers.
- The backend reconciles repeat requests against the existing NFT instead of creating another NFT.
- The LINE authentication server verifies the LIFF ID token with LINE before issuing a five-minute Privy Custom Auth JWT.

The package does not deploy the contracts, persist application records, upload sticker assets, configure Privy, or fund a paymaster.

## Giving and receiving

`createGiftClaim` generates an opaque gift ID and one-time claim token. Persist only the claim commitment with the pending gift and put the claim token in the LINE gift link.

`prepareGiftTransfer` creates the transaction that the artist's sponsored smart account sends while Giving. It transfers the sticker directly into the escrow with the gift ID, claim commitment, and expiration encoded in the ERC-721 receiver data. The recipient does not need an account at this point.

After the recipient authenticates with LINE, resolve their World Chain smart account and call `authorizeClaim`. The authorization binds the gift ID, recipient smart account, escrow contract, chain ID, and a deadline. Any relayer can submit it, but the escrow accepts only signatures from `CLAIM_SIGNER_ROLE`. Rejection uses the same restricted authorization pattern, while anyone can return an expired gift to its sender.

The escrow never receives approval for stickers that remain in an artist's wallet and cannot transfer them. Raw LINE IDs and claim tokens are not stored onchain.

## Commands

```sh
git submodule update --init --recursive
pnpm --filter @drawing-app/sticker-chain test
pnpm --filter @drawing-app/sticker-chain generate-types
```

Install Foundry before running these commands. `forge test` covers the contracts, while the TypeScript integration tests run against Anvil and consume the same Forge artifacts. Wagmi CLI reads the artifacts in `out/` and generates typed ABIs in `src/generated/contracts.ts`; application code imports these instead of maintaining handwritten ABI fragments. Configure Privy Custom Authentication with the deployed app's `/.well-known/jwks.json`, use `sub` as the user ID claim, and keep the P-256 private key outside the repository.

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
