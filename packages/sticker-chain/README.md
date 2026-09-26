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
- `contracts/ens/` names people, stickers and pending gifts under croquis.eth on ENSv2. The design is `docs/superpowers/specs/2026-09-26-ens-names-design.md`.

The API persists application records and sticker assets. Privy smart-wallet sponsorship is configured separately.

## Authentication recovery

The frontend starts Privy only after LINE and the app session are ready, and enables JWT synchronization only after Privy's wallet connection is ready. A loading flag alone does not delay the SDK's initial synchronization.

`POST /v1/auth/privy-jwt` distinguishes invalid requests (`400 invalid_request`), rejected LINE credentials (`401 line_auth_failed`), unavailable LINE verification (`502 line_unavailable`), and internal JWT issuance failures (`500 auth_unavailable`). Only an explicit LINE credential rejection offers LINE reconnection; service failures retry the exchange without restarting LINE authentication. JWT issuance diagnostics keep fixed failure reasons without tokens or raw provider responses.

## Sealing confirmation

`POST /api/stickers` saves the drawing and uses the authenticated artist's Privy smart account as the mint recipient. The funded sealer signs `sealSticker`; the artist does not sign or pay mint gas. Before returning success, the backend waits for the receipt and verifies the NFT data and the mint's ERC-721 `Transfer` event to the artist.

If minting cannot be confirmed, the live API returns `503 mint_failed`. The saved drawing and its ticket remain available for a retry on the same ticket. A retry reconciles an existing NFT instead of creating another. The frontend only completes Sealing once both a token ID and mint transaction hash are returned.

## Diagnosing Sealing, Giving, and Receiving

The browser logs `NFT API request` entries for these operations, including the route, elapsed time, HTTP status, and the API's `X-Request-ID` response header. Match that request ID to the backend's JSON console logs. A network failure has no response ID; use its route and time to find the server request, if it reached the API.

On the server, follow the API service logs while reproducing one failure:

```sh
journalctl -u drawing-api -f -o cat
```

Backend events distinguish image storage, Privy wallet lookup, contract simulation, transaction submission, receipt waiting, verification, and database completion. A submitted transaction hash is logged immediately, so a later timeout can be investigated separately from a transaction that was never submitted. Failure events include sanitized error causes and provider error codes; `api.refused` records an expected API refusal such as `not_minted`.

Logs exclude request bodies, Gift Claim Tokens, signatures, authentication headers, and credential-bearing URLs. Public transaction hashes and contract addresses are kept in named fields. These diagnostics do not change transaction or retry behavior, and both the frontend and API need the updated build before browser-to-server correlation is available.

## Giving and receiving

`createGiftClaim` generates an opaque gift ID and one-time gift claim token. Persist only the claim commitment with the pending gift and put the gift claim token in the gift message's link.

`prepareGiftTransfer` creates the transaction that the artist's sponsored smart account sends while Giving. It transfers the sticker directly into the escrow with the gift ID, claim commitment, and expiration encoded in the ERC-721 receiver data. The recipient does not need an account at this point.

After the recipient authenticates with LINE, the API resolves their Ethereum Sepolia smart account, calls `authorizeClaim`, and relays `claimGift`. The authorization binds the gift ID, recipient smart account, escrow contract, chain ID, and a deadline. The escrow accepts only signatures from `CLAIM_SIGNER_ROLE`. Rejection uses the same restricted authorization pattern, while anyone can return an expired gift to its sender.

Receiving requests carry the Gift Claim Token so the API can validate it before authorizing a claim. The sender can take a pending sticker out with `prepareGiftTakeOut`; the escrow verifies the caller is that gift's sender, so taking out needs no backend signature or claim token.

The escrow never receives approval for stickers that remain in an artist's wallet and cannot transfer them. Raw LINE IDs and gift claim tokens are not stored onchain.

## ENS names

ENSv2 is vendored at the commit deployed to Sepolia (`lib/ens-contracts-v2`, 71a3b73). Our contracts call it through the interfaces in `contracts/ens/EnsV2.sol`; the Forge tests build a local ENS from ENSv2's own contracts (`test/foundry/CroquisFixture.sol`).

- `CroquisNames` gives a person `<label>.croquis.eth`, forever and non-transferable, with their own registry and PermissionedResolver. It names a sealed sticker `<number>.<artist>.croquis.eth`, and `syncSticker` keeps that name with whoever holds the NFT.
- `CroquisResolver` answers sticker and gift names from `StickerNFT` and the escrow, and everyone else under croquis.eth through CCIP-Read: the API's gateway answers with `src/ens-gateway.ts`.
- `StickerGiftEscrow` registers `g-<gift ID>.gifts.croquis.eth` while a gift waits, removes it when the gift ends, and syncs the sticker's name whenever the sticker leaves.
- `src/croquis-names.ts` writes names from the relayer. Each call reads the chain first, so a retry after a timeout does nothing when the first attempt landed.

## Commands

```sh
git submodule update --init packages/sticker-chain/lib/forge-std packages/sticker-chain/lib/ens-contracts-v2
git -C packages/sticker-chain/lib/ens-contracts-v2 submodule update --init --depth 1 \
  contracts/lib/openzeppelin-contracts contracts/lib/openzeppelin-contracts-upgradeable \
  contracts/lib/verifiable-factory contracts/lib/ens-contracts
pnpm --filter @drawing-app/sticker-chain test
pnpm --filter @drawing-app/sticker-chain generate-types
pnpm --filter @drawing-app/api exec vitest run src/routes/stickers.chain.test.ts
```

Install Foundry before running these commands. `forge test` covers the contracts, while the TypeScript integration tests run against Anvil and consume the same Forge artifacts. Wagmi CLI reads the artifacts in `out/` and generates typed ABIs in `src/generated/contracts.ts`; application code imports these instead of maintaining handwritten ABI fragments. Configure Privy Custom Authentication with the deployed app's `/.well-known/jwks.json`, use `sub` as the user ID claim, and keep the P-256 private key outside the repository.

The API chain integration test submits PNGs through Sealing, checks on-chain ownership and public metadata, and recovers a mint whose database update was lost. It uses local Anvil and mocked identity providers; it does not validate production LINE or Privy configuration.

## Deploy to Ethereum Sepolia

Set `DEPLOYER_PRIVATE_KEY`, `STICKER_SEALER_PRIVATE_KEY`, `ENS_GATEWAY_PRIVATE_KEY`, `ENS_GATEWAY_URL` and `ETHEREUM_SEPOLIA_RPC_URL` in the gitignored `deploy/.env`, then run `bash deploy/deploy-contracts.sh` from the repository root. With `STICKER_NFT_ADDRESS` set it keeps that StickerNFT; otherwise it deploys one. The deployer remains the administrator; the sealer receives mint, claim-signing and naming permissions, and the gateway key's address is the only signer `CroquisResolver` trusts. When the deployer owns croquis.eth, the script points croquis.eth at its registry and resolver; otherwise it prints the two addresses croquis.eth's owner sets. Record the printed addresses in `deploy/.env`.

`deploy/deploy-api.sh` installs chain configuration in a private `chain.env` on the server. It preserves existing values when local values are omitted and can reuse `PRIVY_APP_SECRET` from the auth service. Incomplete configuration aborts before publishing the API. The sealer pays backend mint and Receiving gas; sponsored smart-wallet transactions cover Giving and taking out. Run the installer tests with `node --test deploy/install-chain-env.test.mjs`.

`deploy/deploy.sh` validates the chain credentials, deploys the API, and then publishes the frontend with `VITE_STICKER_ESCROW_ADDRESS`. Set `DEPLOY_TARGET` to the server's SSH destination. `DEPLOY_ENV_FILE` can select an existing private environment file. The optional `VITE_STICKER_RPC_URL` must be safe to publish in the browser; the backend RPC URL is never copied into it.

For Safe smart accounts, configure Sepolia's bundler and paymaster under Privy's **Advanced → Smart wallets** settings. The separate Fee sponsorship switch does not replace this paymaster configuration. Use the stat board's **Check sponsored gas** action from a wallet with no ETH, then test Giving and taking out against the configured contracts.

## Required integration checks

1. Persist immutable `artistId`, `sealedAt`, `contentHash`, and `metadataUri` values before minting.
2. Store and verify the artist's Ethereum Sepolia smart account address. Do not mint to its Privy signer EOA.
3. Configure an Ethereum Sepolia bundler and funded paymaster, then verify a transfer from a zero-balance artist wallet.
4. Wait for Sealing's transaction receipt before adding the sticker to the tray; retry using the same ticket if the response is interrupted.
5. Names are minted to smart accounts as ERC-1155 tokens, so the smart account must accept them (Safe does, through its fallback handler).

References:

- https://docs.privy.io/wallets/using-wallets/evm-smart-wallets/overview
- https://docs.privy.io/authentication/user-authentication/jwt-based-auth/usage
- https://developers.line.biz/en/docs/line-login/verify-id-token/
