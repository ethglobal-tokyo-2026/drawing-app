# Sticker chain package

This package contains the first backend and contract boundaries for sealing stickers on Ethereum Sepolia.

## Behavior

- `StickerNFT.sol` creates one ERC-721 NFT for each sealed sticker.
- `StickerGiftEscrow.sol` lets an artist complete Giving before the recipient has an account.
- The artist's Ethereum Sepolia smart account receives the NFT when the sticker is sealed.
- The original artist, content hash, and metadata URI remain immutable after later ownership transfers.
- The backend reconciles repeat requests against the existing NFT instead of creating another NFT.
- The LINE authentication server verifies the LIFF ID token with LINE before issuing a five-minute Privy Custom Auth JWT.
- The same server switches a returning user's LINE chat menu: `POST /v1/auth/line-menu` verifies the ID token, looks the person up in Privy, and links the returning-user rich menu when they have an account.

The API persists application records and sticker assets. Privy smart-wallet sponsorship is configured separately.

## Sealing confirmation

`POST /api/stickers` saves the drawing and uses the authenticated artist's Privy smart account as the mint recipient. The funded sealer signs `sealSticker`; the artist does not sign or pay mint gas. Before returning success, the backend waits for the receipt and verifies the NFT data and the mint's ERC-721 `Transfer` event to the artist.

If minting cannot be confirmed, the live API returns `503 mint_failed`. The saved drawing and its ticket remain available for a retry on the same ticket. A retry reconciles an existing NFT instead of creating another. The frontend only completes Sealing once both a token ID and mint transaction hash are returned.

## Giving and receiving

`createGiftClaim` generates an opaque gift ID and one-time gift claim token. Persist only the claim commitment with the pending gift and put the gift claim token in the gift message's link.

`prepareGiftTransfer` creates the transaction that the artist's sponsored smart account sends while Giving. It transfers the sticker directly into the escrow with the gift ID, claim commitment, and expiration encoded in the ERC-721 receiver data. The recipient does not need an account at this point.

After the recipient authenticates with LINE, the API resolves their Ethereum Sepolia smart account, calls `authorizeClaim`, and relays `claimGift`. The authorization binds the gift ID, recipient smart account, escrow contract, chain ID, and a deadline. The escrow accepts only signatures from `CLAIM_SIGNER_ROLE`. Rejection uses the same restricted authorization pattern, while anyone can return an expired gift to its sender.

Receiving requests carry the Gift Claim Token so the API can validate it before authorizing a claim. The sender can take a pending sticker out with `prepareGiftTakeOut`; the escrow verifies the caller is that gift's sender, so taking out needs no backend signature or claim token.

The escrow never receives approval for stickers that remain in an artist's wallet and cannot transfer them. Raw LINE IDs and gift claim tokens are not stored onchain.

## Commands

```sh
git submodule update --init --recursive
pnpm --filter @drawing-app/sticker-chain test
pnpm --filter @drawing-app/sticker-chain generate-types
pnpm --filter @drawing-app/api exec vitest run src/routes/stickers.chain.test.ts
```

## Deploy to Ethereum Sepolia

The deployment account remains the contracts' administrator. The account derived from
`STICKER_SEALER_PRIVATE_KEY` receives permission to mint sealed stickers, authorize Receiving, and
relay claims.

```sh
export ETHEREUM_SEPOLIA_RPC_URL=https://your-sepolia-rpc.example
export DEPLOYER_PRIVATE_KEY=0x...
export STICKER_SEALER_PRIVATE_KEY=0x...

forge script script/DeployStickerContracts.s.sol:DeployStickerContracts \
  --rpc-url "$ETHEREUM_SEPOLIA_RPC_URL" \
  --broadcast
```

Copy the two printed contract addresses into the API and frontend environments. The sealer address
must be derived from the API's `STICKER_SEALER_PRIVATE_KEY`.

Install Foundry before running these commands. `forge test` covers the contracts, while the TypeScript integration tests run against Anvil and consume the same Forge artifacts. Wagmi CLI reads the artifacts in `out/` and generates typed ABIs in `src/generated/contracts.ts`; application code imports these instead of maintaining handwritten ABI fragments. Configure Privy Custom Authentication with the deployed app's `/.well-known/jwks.json`, use `sub` as the user ID claim, and keep the P-256 private key outside the repository.

The API chain integration test submits PNGs through Sealing, checks on-chain ownership and public metadata, and recovers a mint whose database update was lost. It uses local Anvil and mocked identity providers; it does not validate production LINE or Privy configuration.

## Deploy to Ethereum Sepolia

Set `DEPLOYER_PRIVATE_KEY`, `STICKER_SEALER_PRIVATE_KEY`, and `ETHEREUM_SEPOLIA_RPC_URL` in the gitignored `deploy/.env`, then run `bash deploy/deploy-contracts.sh` from the repository root. The deployer remains the administrator; the sealer receives mint and claim-signing permissions. Record both contract addresses in `STICKER_NFT_ADDRESS` and `STICKER_GIFT_ESCROW_ADDRESS`.

`deploy/deploy-api.sh` installs chain configuration in a private `chain.env` on the server. It preserves existing values when local values are omitted and can reuse `PRIVY_APP_SECRET` from the auth service. Incomplete configuration aborts before publishing the API. The sealer pays backend mint and Receiving gas; sponsored smart-wallet transactions cover Giving and taking out. Run the installer tests with `node --test deploy/install-chain-env.test.mjs`.

`deploy/deploy.sh` validates the chain credentials, deploys the API, and then publishes the frontend with `VITE_STICKER_ESCROW_ADDRESS`. Set `DEPLOY_TARGET` to the server's SSH destination. `DEPLOY_ENV_FILE` can select an existing private environment file. The optional `VITE_STICKER_RPC_URL` must be safe to publish in the browser; the backend RPC URL is never copied into it.

For Safe smart accounts, configure Sepolia's bundler and paymaster under Privy's **Advanced → Smart wallets** settings. The separate Fee sponsorship switch does not replace this paymaster configuration. Use the stat board's **Check sponsored gas** action from a wallet with no ETH, then test Giving and taking out against the configured contracts.

## Required integration checks

1. Persist immutable `artistId`, `sealedAt`, `contentHash`, and `metadataUri` values before minting.
2. Store and verify the artist's Ethereum Sepolia smart account address. Do not mint to its Privy signer EOA.
3. Configure an Ethereum Sepolia bundler and funded paymaster, then verify a transfer from a zero-balance artist wallet.
4. Wait for Sealing's transaction receipt before adding the sticker to the tray; retry using the same ticket if the response is interrupted.
5. Keep ENS updates optional until their contract flow is finalized.

References:

- https://docs.privy.io/wallets/using-wallets/evm-smart-wallets/overview
- https://docs.privy.io/authentication/user-authentication/jwt-based-auth/usage
- https://developers.line.biz/en/docs/line-login/verify-id-token/
