# Sui Sticker Contract

The Move package for stickers on Sui. The REST API's server address mints each sealed sticker to its Original Artist, and Giving moves stickers through an escrow.

| Module                                     | Description                                                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`sticker`](stickers/sources/sticker.move) | One `Sticker` object per sealed sticker, minted by the server, and its Display.                                                                                                |
| [`gift`](stickers/sources/gift.move)       | The escrow. A gift holds a sticker from the giver's deposit until the server claims it for its receiver, the giver takes it out, or the server returns it once it has expired. |

## sticker

On publish, `init` shares a `StickerRegistry` and a `ServerConfig` that names the publisher as the server, and sends an `AdminCap` to the publisher.

| Function                                                                                | Access     | Description                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mint(config, registry, key, number, artist, content_hash, width, height, nsfw, image)` | The server | Mints a `Sticker` to `artist` at the ID derived from the registry and `key`, the API's sticker id. Aborts with `EAlreadyMinted` when `key` was minted before. |
| `set_server(admin, config, server)`                                                     | `AdminCap` | Names the address server calls must come from. The old address can no longer send them.                                                                       |
| `create_display(admin, registry, names, values)`                                        | `AdminCap` | Creates and shares the `Display<Sticker>` in the Display registry at `0xd`, and returns its `DisplayCap`. Runs once, after publishing.                        |
| `assert_server(config)`                                                                 | View       | Aborts with `ENotServer` unless the server sent the transaction.                                                                                              |
| `sticker_address(registry_id, key)`                                                     | View       | The ID the sticker with `key` has, or will have once minted.                                                                                                  |
| `is_minted(registry, key)`                                                              | View       | Whether `key` was minted.                                                                                                                                     |

A `Sticker` keeps its running `number`, its Original Artist's address at Sealing (`artist`), the sha256 of its PNG (`content_hash`), `width`, `height`, `nsfw`, and `image`: the file name of the image anyone may see, which is an NSFW sticker's veiled image. Display joins `image` to the image host it holds, so moving the host is one Display edit.

The object keeps the mark it was minted with. An Original Artist can mark a sticker 18+ after its seal, which changes the API's database, so the database's `nsfw` is the current mark and the object's can be older. Such a sticker's `image` still names its drawing's file, which the box then serves only to the NSFW opt-in, so a wallet shows a broken image instead, unless an unmarked sticker shares the drawing, which keeps the file public.

Events:

- `StickerSealed { sticker, key, number, artist, nsfw }`

## gift

On publish, `init` shares the `Escrow`. Each gift is its own shared `Gift`, at the ID derived from the escrow and the gift id the API made at Packaging, and holds its sticker in a dynamic object field.

| Function                                                                    | Access               | Description                                                                                                                                                                      |
| --------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deposit(escrow, sticker, gift_id, claim_commitment, expires_at_ms, clock)` | The sticker's holder | Puts the sticker in a new pending gift, with its sender as the giver. `claim_commitment` is the Gift Claim Token's hash. Aborts with `EGiftExists` when `gift_id` was ever used. |
| `claim(config, gift, recipient, clock)`                                     | The server           | Sends a pending gift's sticker to its receiver, until the gift expires. The server checks the Gift Claim Token against `claim_commitment` first.                                 |
| `take_out(gift)`                                                            | The giver            | Takes a pending gift back, expired or not.                                                                                                                                       |
| `return_expired(config, gift, clock)`                                       | The server           | Sends a pending gift past its expiry back to its giver.                                                                                                                          |
| `gift_address(escrow_id, gift_id)`                                          | View                 | The ID the gift with `gift_id` has, or will have once deposited.                                                                                                                 |
| `status(gift)` and the other getters                                        | View                 | The gift's terms and status.                                                                                                                                                     |

A gift is `Pending` until it's `Claimed`, `TakenOut` or `ExpiredReturned`. A gift that doesn't exist yet has no object at its derived ID.

Events:

- `GiftStaged { gift, gift_id, sticker, sender, claim_commitment, expires_at_ms }`
- `GiftClaimed { gift, gift_id, sticker, recipient }`
- `GiftTakenOut { gift, gift_id, sticker, sender }`
- `ExpiredGiftReturned { gift, gift_id, sticker, sender }`

## Publishing

`deploy/publish-sui.mjs` publishes the package, names the server and creates the Display ([`deploy/README.md`](../../deploy/README.md)). The deployer, `SUI_DEPLOYER_PRIVATE_KEY`, keeps the `AdminCap`, the `UpgradeCap` and the `DisplayCap`.

It prints the IDs the API reads: `SUI_STICKER_PACKAGE`, `SUI_STICKER_REGISTRY`, `SUI_SERVER_CONFIG` and `SUI_GIFT_ESCROW`. They go in `deploy/drawing-api.env` for the box, and in `apps/api/.env.example` for `pnpm dev` in sui chain mode.

## Usage

Build and test:

```sh
sui move test --path contracts/sui-sticker-contract/stickers
```
