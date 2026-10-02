# Sticker chain package

Croquis's contracts on Ethereum Sepolia, and the TypeScript the REST API and the LINE → Privy auth server use them with.

## Contracts

- `StickerNFT.sol` mints one ERC-721 NFT for each sealed sticker, to the artist's Ethereum Sepolia smart account. The Original Artist, content hash and metadata URI stay the same through every later transfer.
- `StickerGiftEscrow.sol` holds a sticker between Giving and Receiving, so the giver can finish Giving before the recipient has an account. It never gets approval for the stickers in an artist's wallet, and no raw LINE ID or Gift Claim Token is stored onchain.
- `contracts/ens/` names people, stickers and pending gifts under the parent name; see [ENS names](#ens-names).

## Exports

- `./seal-sticker`: `createStickerSealer` mints from the funded sealer, so the artist neither signs nor pays gas. It waits for the receipt and checks the NFT's data and the mint's ERC-721 `Transfer` to the artist; a retry reconciles against the existing NFT instead of minting another. Each stage reaches the host through `onProgress`.
- `./gift-sticker`: Giving and Receiving, below.
- `./croquis-names` and `./ens-gateway`: ENS names, below.
- `./line`: asks LINE who a LIFF ID token names, for the REST API's sign-in and the auth server; its failures are `./auth-error`'s `AuthError`.
- `./line-privy-jwt`: the Privy JWT the LINE → Privy auth server issues, below, and `privySubject`, which the REST API also finds smart wallets by.
- `./contracts`: typed ABIs that Wagmi CLI generates from Forge's artifacts in `out/`. Application code imports these instead of writing ABI fragments.
- `./bytes32`: the check that a value is a bytes32, for gift IDs, claim commitments and content hashes.

## Giving and Receiving

`createGiftClaim` makes an opaque gift ID and a one-time Gift Claim Token. Persist only the claim commitment with the pending gift, and put the Gift Claim Token in the Gift Message's link.

`prepareGiftTransfer` builds the transaction the giver's sponsored smart account sends while Giving. It transfers the sticker directly into the escrow, with the gift ID, claim commitment and expiry in the ERC-721 receiver data. The recipient needs no account yet.

After the recipient signs in with LINE, the API finds their Ethereum Sepolia smart account, signs the claim with `authorizeClaim`, and relays `claimGift`. The authorization binds the gift ID, the recipient's smart account, the escrow, the chain ID and a deadline; the escrow accepts only signatures from `CLAIM_SIGNER_ROLE`. Anyone can return an expired gift to its sender.

`authorizeClaim` checks the Gift Claim Token against the gift's claim commitment. A stopgap, until smart account permissions can authorize the receiver on chain: `authorizeClaimForNamedRecipient` signs without the token, for the person the API says a gift waits for. To take a pending sticker out, the app sends `takeOut` from the sender's smart account; the escrow checks the caller is that gift's sender, so taking out needs no backend signature or Gift Claim Token.

## LINE → Privy authentication

`src/start-auth-server.ts` runs the auth server. `POST /v1/auth/privy-jwt` verifies a LIFF ID token with LINE, then issues a short-lived Privy Custom Auth JWT (`PRIVY_JWT_LIFETIME_S`); `GET /.well-known/jwks.json` serves the key Privy checks it with. A failure answers `400 invalid_request`, `401 line_auth_failed` (LINE rejected the credential), `502 line_unavailable` or `500 auth_unavailable`, and logs fixed labels: never a token, an error's message or a provider's response.

Configure Privy Custom Authentication with the deployed app's `/.well-known/jwks.json`, use `sub` as the user ID claim, and keep the P-256 private key outside the repository.

## ENS names

ENSv2 is vendored at the commit deployed to Sepolia (`lib/ens-contracts-v2`, 71a3b73). Our contracts call it through the interfaces in `contracts/ens/EnsV2.sol`; the Forge tests build a local ENS from ENSv2's own contracts (`test/foundry/CroquisFixture.sol`).

- `CroquisNames` gives a person `<label>.croquis-app.eth`, forever and non-transferable, with their own registry and PermissionedResolver. It names a sealed sticker `<number>.<artist>.croquis-app.eth`, and `syncSticker` keeps that name with whoever holds the NFT.
- `CroquisResolver` answers sticker and gift names from `StickerNFT` and the escrow, and everyone else under the parent name through CCIP-Read: the API's gateway answers with `src/ens-gateway.ts`.
- `StickerGiftEscrow` registers `g-<gift ID>.gifts.croquis-app.eth` while a gift waits, removes it when the gift ends, and syncs the sticker's name whenever the sticker leaves.
- `src/croquis-names.ts` writes names from the relayer. Each call reads the chain first, so a retry after a timeout does nothing when the first attempt landed.
- Names are ERC-1155 tokens minted to smart accounts, so a smart account must accept them (Safe does, through its fallback handler).

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

Install Foundry before running these commands. `forge test` covers the contracts, and the TypeScript tests run against Anvil with the same Forge artifacts. The API's chain test seals PNGs through the REST API against Anvil, with mocked identity providers, so it doesn't check production LINE or Privy configuration.

## Deploy to Ethereum Sepolia

Set `DEPLOYER_PRIVATE_KEY`, `STICKER_SEALER_PRIVATE_KEY`, `ENS_GATEWAY_PRIVATE_KEY`, `ENS_GATEWAY_URL`, `ENS_PARENT_LABEL` and `ETHEREUM_SEPOLIA_RPC_URL` in the gitignored `deploy/.env`, then run `bash deploy/deploy-contracts.sh` from the repository root. `ENS_PARENT_LABEL` is the parent name's label, `croquis-app` for croquis-app.eth, and must match `CROQUIS_PARENT_NAME` in `src/croquis-names.ts`. With `STICKER_NFT_ADDRESS` set it keeps that StickerNFT; otherwise it deploys one. The deployer remains the administrator; the sealer receives mint, claim-signing and naming permissions, and the gateway key's address is the only signer `CroquisResolver` trusts. When the deployer owns the parent name, the script points that name at its registry and resolver; otherwise it prints the two addresses the name's owner sets. Record the printed addresses in `deploy/.env`.

`deploy/README.md` covers publishing the API and the frontend with them, and `deploy/.env.example` lists every setting. The sealer pays the gas for minting, Receiving and the API's return of expired gifts; sponsored smart-wallet transactions pay for Giving and taking out. For Safe smart accounts, configure Sepolia's bundler and paymaster under Privy's **Advanced → Smart wallets** settings; the separate Fee sponsorship switch doesn't replace them. The stat board's **Check sponsored gas** action checks them: it sends a zero-value transaction and confirms the smart account's ETH paid none of its gas.

References:

- https://docs.privy.io/wallets/using-wallets/evm-smart-wallets/overview
- https://docs.privy.io/authentication/user-authentication/jwt-based-auth/usage
- https://developers.line.biz/en/docs/line-login/verify-id-token/
