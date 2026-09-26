# ENS names: design

2026-09-26, against `main` at 65e23c5. How the app uses ENSv2 on Ethereum Sepolia, where `StickerNFT` and `StickerGiftEscrow` already live: a name for each person, a name for each sticker, and a name for each gift while it waits to be received. The parent name is `croquis.eth`.

**Sources.** ENSv2 is read from its source at the commit deployed to Sepolia on 2026-09-15, not from its docs, which describe an older version in places.

- Contracts and Sepolia addresses: https://github.com/ensdomains/contracts-v2/tree/71a3b7339dbc55ab47667abdfe8303bac4f4c24e/contracts/deployments/sepolia
- Bounty: https://ethglobal.com/events/ethonline2026/prizes/ens

## Facts about ENSv2 this design rests on

- A registry entry expires when `block.timestamp >= expiry`. A forever name has `expiry = type(uint64).max`; `0` means expired.
- A registry is **emancipated** when no one holds `ROLE_SET_SUBREGISTRY`, `ROLE_SET_RESOLVER`, `ROLE_UNREGISTER` or `ROLE_UPGRADE` (or their admins) on its root. Then the registry's root can't touch a registered name, and `ROLE_REGISTRAR` can't overwrite one.
- A name can be transferred only if its owner holds `ROLE_CAN_TRANSFER_ADMIN` on it, and token admin roles are only given at registration.
- Minting a name to a contract calls its `onERC1155Received`.
- PermissionedResolver scopes a role to a record key (`setText` for `"avatar"`), across every name on that resolver, never to one name. Giving each person their own resolver is how a permission ends up covering one name.
- Resolution uses the nearest resolver up the hierarchy. A resolver found above the name must implement ENSIP-10's `resolve(name, data)`.

## The three names

| Name    | Example                                | Lifetime                                                                    | Who can transfer it        | Holder                          |
| ------- | -------------------------------------- | --------------------------------------------------------------------------- | -------------------------- | ------------------------------- |
| Person  | `alice.croquis.eth`                    | Forever                                                                     | No one                     | The person's smart account      |
| Sticker | `0042.alice.croquis.eth`               | Forever                                                                     | No one; it follows the NFT | Whoever holds the sticker's NFT |
| Gift    | `g-7f3a9c01d2e4b6a8.gifts.croquis.eth` | Until the gift's `expiresAt`, or until it's received, rejected or taken out | No one                     | The giver                       |

The path says who drew a sticker; the holder says who owns it now. Giving never renames a sticker.

## Contracts

| Contract            | Kind                                               | What it does                                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| croquis registry    | ENSv2 `UserRegistry` proxy                         | `croquis.eth`'s subregistry. Root holds only `ROLE_REGISTRAR`, given to `CroquisNames`, so it's emancipated: once a person's name is registered, nobody can take it back                                                        |
| a person's registry | `UserRegistry` proxy, one per person               | Their stickers' names. Root: `ROLE_REGISTRAR` and `ROLE_UNREGISTER`, both to `CroquisNames`                                                                                                                                     |
| gifts registry      | `UserRegistry` proxy                               | `gifts.croquis.eth`'s subregistry. Root: `ROLE_REGISTRAR` and `ROLE_UNREGISTER`, both to the escrow                                                                                                                             |
| a person's resolver | ENSv2 `PermissionedResolver` proxy, one per person | Their records. They hold every role; `CroquisNames` holds `ROLE_SET_TEXT` on `avatar` only                                                                                                                                      |
| `CroquisNames`      | Ours                                               | Creates person names and sticker names, and keeps each sticker name's holder equal to its NFT's holder                                                                                                                          |
| `CroquisResolver`   | Ours, ENSIP-10                                     | Resolver of `croquis.eth` itself, of every sticker name and of every gift name. Sticker and gift records are read from `StickerNFT` and the escrow; any other name under `croquis.eth` is answered by our API through CCIP-Read |
| `StickerGiftEscrow` | Ours, changed                                      | Also registers and removes gift names, and syncs a sticker's name when the sticker leaves the escrow                                                                                                                            |

Proxies come from ENSv2's `VerifiableFactory` and its deployed `UserRegistry` and `PermissionedResolver` implementations.

## 1. Person names

**Records.**

| Key          | Value                                                                                          | Who can change it |
| ------------ | ---------------------------------------------------------------------------------------------- | ----------------- |
| `addr` (ETH) | Their smart account                                                                            | Them              |
| `avatar`     | Their latest sticker, as an ENSIP-12 NFT URI (`eip155:11155111/erc721:<StickerNFT>/<tokenId>`) | Them, and the app |
| `url`        | Their Sticker Board (`https://<app>/@<label>`)                                                 | Them              |

**Before onchain.** Any `<label>.croquis.eth` with no registry entry falls through to `CroquisResolver`, which answers with an EIP-3668 `OffchainLookup` to `GET /api/ens/{sender}/{data}.json`. The API finds the person by `users.ens_label` and returns the same records, signed by `ENS_GATEWAY_PRIVATE_KEY`, whose address `CroquisResolver` trusts. A person's name resolves the moment they have a label, with no transaction.

**Going onchain.** At the person's first seal or first receive, whichever comes first; a sticker name needs its artist's registry. `CroquisNames.claimPersonName(label, account, avatar, url)`, sent by the relayer, in one transaction:

1. Deploys the person's registry and resolver.
2. Writes the records, then keeps only `ROLE_SET_TEXT` on `avatar`.
3. Registers `label` in the croquis registry: owner their account, subregistry and resolver theirs, `expiry = type(uint64).max`. The person gets `ROLE_SET_RESOLVER` on it, and no transfer role.

**The label.** `users.ens_label`: the handle through ENSIP-15 normalization, with spaces and dots turned into `-`. When that fails, is taken, or is `gifts`, it's `artist-<first 8 hex of the user ID>`. It follows handle changes until the name is onchain, and is fixed after that.

## 2. Sticker names

**Label.** The sticker's number, padded as in "No.0042": `0042`.

**At seal**, after the mint lands, the relayer calls `CroquisNames.nameSticker(tokenId, label)`. It registers the label in the artist's registry, forever, owned by the NFT's holder, with no roles, and points it at `CroquisResolver`.

**Records**, read from `StickerNFT` on every lookup, so they can't change after seal:

| Key                        | Value                               |
| -------------------------- | ----------------------------------- |
| `addr` (ETH)               | The NFT's current holder            |
| `avatar`                   | The sticker, as an ENSIP-12 NFT URI |
| `com.croquis.artist`       | The Original Artist's name          |
| `com.croquis.content-hash` | `StickerNFT.contentHashOf`          |

**Following the NFT.** `CroquisNames.syncSticker(tokenId)` is open to anyone. When the name's holder isn't the NFT's holder, it unregisters the name and registers it again to the NFT's holder. The escrow calls it whenever a sticker leaves the escrow.

## 3. Gift names

**Label.** `g-` plus the first 8 bytes of `giftId` in hex. It comes from the gift ID, never from the Gift Claim Token.

**Lifecycle**, all inside `StickerGiftEscrow`:

| Step                                 | What happens to the name                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Staged (the sticker arrives)         | Registered to the giver, expiring at `expiresAt`, resolving through `CroquisResolver` |
| `claimGift`, `rejectGift`, `takeOut` | Unregistered, then the sticker's name is synced                                       |
| `expiresAt` passes                   | Stops resolving by itself                                                             |
| `returnExpiredGift`                  | The sticker's name is synced                                                          |

**Records**, read from the escrow: `addr` (the giver), `com.croquis.from` (the giver's name), `com.croquis.claim-commitment`, `com.croquis.expires-at`. Like the Gift Message, a gift name never says which sticker is inside.

## Gas

Sponsored: the relayer sends `claimPersonName` and `nameSticker`, and the escrow's gift name and sync steps ride in the transactions it already takes.

## Not in this work

- Account deletion: a person name can't be removed. What deletion does to it is undecided.
- Onchain board placement. PermissionedResolver can't scope a key to one sticker, and placement changes on every drag; it stays in the database.
