# Sui Sticker Contract

The Move package [`stickers`](stickers): every sealed sticker as a Sui object, and the escrow that holds it during Giving. The server mints, claims and returns from the address `ServerConfig` names.

## sticker

On publish, shares the `StickerRegistry` and a `ServerConfig` naming the publisher, and sends an `AdminCap` to the publisher. A sticker's ID derives from the registry and its key, the server's id for the sticker, so each key mints once, at an ID known before the mint.

| Function                                                                                | Access     | Description                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mint(config, registry, key, number, artist, content_hash, width, height, nsfw, image)` | Server     | Mints a sealed sticker to its Original Artist and returns its ID. `content_hash` is the sticker PNG's sha256; `image` is the file name, under Display's image host, of the image anyone may see: an NSFW sticker's veiled one. |
| `set_server(admin, config, server)`                                                     | `AdminCap` | Names the server's address. The old one can no longer mint, claim or return.                                                                                                                                                   |
| `create_display(admin, registry, names, values)`                                        | `AdminCap` | Creates and shares the Display for `Sticker` in the system registry at `0xd`, once, and returns the `DisplayCap` that edits it.                                                                                                |
| `assert_server(config)`                                                                 | Anyone     | Aborts unless the server sent the transaction.                                                                                                                                                                                 |
| `sticker_address(registry_id, key)`                                                     | View       | The ID the sticker with `key` has, or will have once minted.                                                                                                                                                                   |
| `is_minted(registry, key)`                                                              | View       | Whether `key` was minted.                                                                                                                                                                                                      |
| `number`, `artist`, `content_hash`, `width`, `height`, `nsfw`, `image`                  | View       | The sticker's fields.                                                                                                                                                                                                          |

Events:

- `StickerSealed { sticker, key, number, artist, nsfw }`

The publish script sets the Display:

| Field         | Template                                                              |
| ------------- | --------------------------------------------------------------------- |
| `name`        | `Sticker No.{number}`                                                 |
| `description` | `A sticker drawn on Croquis.`                                         |
| `image_url`   | `<image host>/{image}`, the image host being the box's `CDN_BASE_URL` |
| `project_url` | `https://liff.line.me/<LIFF ID>`                                      |

## gift

On publish, shares the `Escrow`. Each gift is its own shared `Gift`, at the ID its 32-byte gift id derives in the escrow, so only deposits touch the escrow. A pending gift keeps its sticker in a dynamic object field, where the sticker keeps its own ID. A gift goes from `Pending` to `Claimed`, `TakenOut` or `ExpiredReturned`; a gift id with no object yet is `missing`.

| Function                                                                                                                                           | Access | Description                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deposit(escrow, sticker, gift_id, claim_commitment, expires_at_ms, clock)`                                                                        | Giver  | Puts the sticker in a new pending gift on Packaging's terms: a gift id never used before, the Gift Claim Token's sha256, and an expiry after now. |
| `claim(config, gift, recipient, clock)`                                                                                                            | Server | Sends a pending gift's sticker to its receiver, until the gift expires.                                                                           |
| `take_out(gift)`                                                                                                                                   | Giver  | Takes a pending gift's sticker back, expired or not.                                                                                              |
| `return_expired(config, gift, clock)`                                                                                                              | Server | Sends a pending gift's sticker back to its giver once the gift has expired.                                                                       |
| `gift_address(escrow_id, gift_id)`                                                                                                                 | View   | The ID the gift has, or will have once deposited.                                                                                                 |
| `status`, `is_pending`, `is_claimed`, `is_taken_out`, `is_expired_returned`, `sender`, `recipient`, `sticker`, `claim_commitment`, `expires_at_ms` | View   | The gift's fields.                                                                                                                                |

Events:

- `GiftStaged { gift, gift_id, sticker, sender, claim_commitment, expires_at_ms }`
- `GiftClaimed { gift, gift_id, sticker, recipient }`
- `GiftTakenOut { gift, gift_id, sticker, sender }`
- `ExpiredGiftReturned { gift, gift_id, sticker, sender }`

## Testing

```sh
sui move test --path contracts/sui-sticker-contract/stickers
```

## Publishing

`deploy/publish-sui.mjs` builds the package with the Sui CLI and publishes it from `SUI_DEPLOYER_PRIVATE_KEY`. It then names the server, `SUI_SERVER_PRIVATE_KEY`'s address or `--server`, and creates the Display, its image host `--image-host` or `deploy/drawing-api.env`'s `CDN_BASE_URL`. With `SHINAMI_ACCESS_KEY` set, Shinami's Gas Station pays for each transaction it takes, and the deployer pays for the rest. The deployer keeps the `UpgradeCap`, `AdminCap` and `DisplayCap`. Like the other deploy scripts, it reads `deploy/.env`, or `DEPLOY_ENV_FILE`, and the environment overrides it. It simulates unless given `--publish`:

```sh
node deploy/publish-sui.mjs            # simulates the publish: its cost, and whether Shinami sponsors it
node deploy/publish-sui.mjs --publish  # publishes, names the server and creates the Display
```

It prints the IDs the API reads, for `deploy/drawing-api.env` and `apps/api/.env.example`:

| Key                    | Object                     |
| ---------------------- | -------------------------- |
| `SUI_STICKER_PACKAGE`  | The package                |
| `SUI_STICKER_REGISTRY` | `sticker::StickerRegistry` |
| `SUI_SERVER_CONFIG`    | `sticker::ServerConfig`    |
| `SUI_GIFT_ESCROW`      | `gift::Escrow`             |

When the image host moves, `node deploy/publish-sui.mjs --set-image-host <url> --publish` points Display's `image_url` at it, and every sticker follows.
