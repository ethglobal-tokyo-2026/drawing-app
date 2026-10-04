# Fresh Start on Sui Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Croquis restarts empty, on Sui only.
- The box's data goes.
- Stickers become Sui objects the server mints and gives through a Move escrow, and Shinami pays all gas.
- ENS, World ID, Sepolia, and the Ethereum and smart wallets go.
- NSFW becomes an opt-in on your own stat board.
- The migrations become one baseline, and code that served only older data goes.

**Architecture:**
- **The server is the only submitter.** It builds every Sui transaction, has Shinami Gas Station sponsor it, stores it, and submits it.
  - The person's Privy Sui wallet signs on the phone: deposit, take-out, ticket payment.
  - The server signs its own (mint, claim, expiry return) with a key that holds no SUI.
  - Shinami's signature never leaves the server, so nothing else can submit.
- **One row per transaction.** A `sui_transactions` row holds a transaction from sponsorship to outcome.
  - Every flow and sweep follows a stored digest through `apps/api/src/sui/transactions.ts`.
  - Partial unique indexes allow one open transaction per sticker, gift, purchase and payer, so no owned object is ever signed over twice.
- **One Move package,** `contracts/sui-sticker-contract/stickers`: `sticker` (the NFT, minted by the server's address) and `gift` (the escrow).
- **Lanes build on `chore/fresh-start`.** It merges after `pnpm check:full` and a testnet smoke run; then one window wipes the box and deploys.

**Tech stack:**
- Chain: Sui Move on testnet, `@mysten/sui` 2.31 over gRPC, Shinami Gas Station.
- Wallets: Privy, for Sui wallets only.
- App: Drizzle on SQLite, Hono, React.

This plan replaces `2026-10-03-fresh-start.md`.

---

## Decided

ad0ll's calls, 2026-10-03 and 04:
- **Data and timing.** Wipe all data and contracts, with no heads-up. Any time except 00:00–01:00 JST.
- **The window's cleanup.** Unlink every LINE chat menu. Drop `deploy/serve.py`'s shim for older builds' Gift Message pictures.
- **The Shop.** "Your ticket purchases" lists only payments whose reference names the signed-in account.
- **World ID** goes entirely. NSFW becomes an opt-in in Settings on your own stat board.
- **ENS** goes entirely. The NFT and the escrow move to Sui. Sepolia, Privy's Ethereum embedded wallet and Privy smart wallets go.
- **People own their wallets.** Privy stays for each person's Sui wallet. Ruled out:
  - keys held by the server;
  - Shinami Invisible Wallets, which are app-controlled;
  - zkLogin, which doesn't support LINE.
- **Gas.** Shinami sponsors it. horror-tube's Shinami key and its funded Sui keys may be used.

## Decisions for ad0ll

The plan follows each recommendation unless you say otherwise.

1. **Vocabulary.** These AGENTS.MD vocabulary changes need your approval:
   - **New row, NSFW opt-in:** "Show 18+ stickers, in Settings on your own stat board, off until you turn it on. Only someone with it on marks a sticker NSFW when sealing it, sees NSFW stickers unblurred, and receives them. Turning it off blurs them again, your own included; you keep the ones you hold."
   - **NSFW sticker becomes:** "A sticker its Original Artist marked 18+ when sealing it, which takes the NSFW opt-in. It wears pink foil, and anyone without the NSFW opt-in sees it blurred inside its cut and can't receive it."
   - **Age status and Age verification:** both rows go.
   - **Gift Claim Token:** its exception drops "Temporary exception, until smart account permissions can authorize the receiver on chain:" and keeps the rule.
2. **The NSFW opt-in:**
   - It's stored as `users.nsfw_opted_in_at`.
   - One refusal, `nsfw_not_opted_in` (403), replaces `adults_only`.
   - Only someone opted in can mark a sticker 18+ when sealing.
   - The give sheet still blocks NSFW stickers for someone opted out. So signed-in people can see who is opted in, as they see age status today.
   - Changing it restarts the app.
   - The fine print says it's for people 18 or older, with no extra confirmation.
3. **`/@label` links go** with ENS. People find artists by handle in Explore's search.
4. **Mock chain mode stays**, for development under LIFF Mock: `STICKER_CHAIN_MODE=mock|sui`.
5. **`packages/sticker-chain` becomes `packages/line-auth`** (`@drawing-app/line-auth`). It keeps only the LINE → Privy auth server and the LINE verifier. The box's unit stays `sticker-auth`.
6. **The stat board shows one "Sui address" paper**, which now holds stickers and pays.
7. **The sticker detail gets no chain link** in place of the ENS name.
8. **Testers still get JPYC outside the app**, as the checkout says today. A faucet is out of scope.

Only ad0ll can do these. They block nothing:
- In Privy's dashboard: turn off smart wallets, and Ethereum wallets at sign-in. Revoke the Pimlico key that Privy's public config shows.
- In World's Developer Portal: delete the World ID app.
- From the earlier review: paste `deploy/line/greeting.md` into LINE Official Account Manager.

## Facts

- **Where commands run:** `$MAIN` is the main checkout's root, which holds the gitignored `deploy/.env`.
- **Shinami Gas Station:**
  - **Endpoint:** `POST https://api.us1.shinami.com/sui/gas/v1`, with header `X-Api-Key`, as JSON-RPC 2.0.
  - **Sponsoring:** `gas_sponsorTransactionBlock [txKindBase64, sender]` answers `{ txBytes, txDigest, signature, expireAtTime }`. `expireAtTime` is in Unix seconds, one hour after the sponsorship.
  - **The budget:** with none given, Shinami dry-runs the kind and adds 5% to its cost, or 25% when it uses shared objects. The dry run refuses Move aborts and objects the sender doesn't own before anything is sponsored.
  - **A kind must never use `tx.gas`.**
  - **Errors** come as JSON-RPC errors over HTTP 200:
    - -32602: invalid params, which includes a refused dry run;
    - -1: no gas object available;
    - -2: the fund's balance is too low;
    - -32010: rate limited.

    A bad key answers HTTP 401.
  - **The fund:** `gas_getFund []` answers `{ balance, inFlight }`, in MIST.
  - **Sources:** https://docs.shinami.com/api-docs/sui/gas-station/api and https://docs.shinami.com/developer-guides/core-integration-topics/error-reference. horror-tube's `apps/server/src/shinami-port.ts` sponsors the same way.
- **The Shinami key** is horror-tube's `SHINAMI_ACCESS_KEY`, a testnet key on the fund `horror-tube-testnet`, which held 4.87 SUI on 2026-10-03.
  - It goes only in gitignored env files and the box's mode-600 `chain.env`.
  - Never print it.
- **Funded Sui keys (2026-10-04):**
  - horror-tube's `SUI_ADMIN_PRIVATE_KEY`, at 0x5656ff6230465768ef9b4fe4512239f33f3b9f1fc1078eddee7ad6135d50216b, holds 1.40 SUI. Its `.env.local` operator key is the same key.
  - The first of horror-tube's `HOUSE_BOT_SUI_PRIVATE_KEYS`, at 0x5cc5b579df36e907ae6f124ee6fef3127fec7b3f4a4ad9b143931c668692fa6f, holds 0.50 SUI.
- **Croquis gets two new keys:**
  - `SUI_DEPLOYER_PRIVATE_KEY`, kept locally, which holds the package's AdminCap and UpgradeCap;
  - `SUI_SERVER_PRIVATE_KEY`, on the box, which holds no SUI.
- **Testnet:**
  - It runs protocol 138, and its framework (0x2, version 58) has `derived_object` and `display_registry`.
  - The reference gas price is 1000 MIST.
  - Public fullnodes answer only gRPC and GraphQL; JSON-RPC is gone.
- **The SDK:** `@mysten/sui` 2.31.3 has everything this plan uses:
  - `verifyTransactionSignature`, in `/verify`;
  - `deriveObjectID`, in `/utils`;
  - `SuiGrpcClient`'s `executeTransaction`, `simulateTransaction`, `waitForTransaction`, `getObject` and `listCoins`.
- **Equivocation.** Two transactions signed over one owned object version can lock it until the epoch ends (https://docs.sui.io/guides/developer/dev-cheat-sheet). Shared objects are only put in order. So:
  - The server never sponsors a second transaction over a person's sticker or JPYC coins while one is open.
  - The server's own transactions use no owned object: Shinami pays their gas, and they read `ServerConfig`, which is shared.
- **Privy:**
  - **Reading a wallet:** the server reads a person's Sui wallet with `privy.users().getByCustomAuthID({ custom_user_id })`, which `privySmartWallets.ts` already calls. The wallet is the linked account with `type: "wallet"` and `chain_type: "sui"`.
  - **Turning off Ethereum wallets:** `embeddedWallets: { ethereum: { createOnLogin: "off" } }` on `PrivyProvider` takes precedence over the dashboard (react-auth 3.45).
  - **Making the Sui wallet:** `MakeSuiWallet` waits for the Ethereum wallet today, so it changes too.
- **The box:**
  - **Data:** empty `/srv/drawing-api/data/` and `/srv/drawing-api/images/`, but keep both folders, which systemd's `ReadWritePaths` needs. The database runs in WAL mode, so the data folder holds `.db`, `-wal` and `-shm` files.
  - **`chain.env`:** `install-chain-env.mjs` keeps every key an earlier deploy wrote, so the Sepolia, ENS and World ID secrets would survive. The window deletes `chain.env`, and from now on the installer writes only the keys it knows.
  - **`secrets.env` stays.** Old cookies name user ids that won't exist, so they get a 401, then a new sign-in.
  - **`secrets.env.bak-20260926-104429`:** delete it.
  - **`/srv/sticker-auth/` stays.**
- **No CI.** `pnpm check` runs locally. The Sui CLI (1.80.1 here) replaces Foundry as what it requires.
- **Payments:** a payment the server didn't build is never credited. Old payments name old user ids anyway.
- **Local databases built on the old migrations stop the API at start:**
  - `data/drawing-app.db*`;
  - `.claude/data/{foil,w7,gate-check}.db*`;
  - another session's `~/.cache/drawing-app-shop-prices/lane.db`.
- **Another session is building the Arrange tile** in the sticker board (`feat/arrange-tile`). Expect small conflicts in `StickerBoard.tsx`.

---

## The Move package

It lives in `contracts/sui-sticker-contract/stickers/`, beside `contracts/sui-payment-contract`, which stays as it is and stays published.
- It's the draft in `~/.cache/drawing-app-fresh-start/sui-move-research/stickers/`, whose 16 tests pass.
- One change: an `image_url` field replaces the draft's veiled hash, so Display needs no hex formatting.

`Move.toml`:

```toml
[package]
name = "stickers"
edition = "2024"
```

`sources/sticker.move`:

```move
/// One object per sealed sticker, minted by the server to its Original Artist.
module stickers::sticker;

use std::string::String;
use sui::derived_object;
use sui::display_registry::{Self, DisplayCap, DisplayRegistry};
use sui::event;

const EInvalidSticker: u64 = 0;
const EAlreadyMinted: u64 = 1;
const EDisplayFieldsMismatch: u64 = 2;
const ENotServer: u64 = 3;

/// A content hash is sha256: 32 bytes.
const HASH_LENGTH: u64 = 32;

/// Names the server's address and sets the Display. The deployer holds it.
public struct AdminCap has key, store { id: UID }

/// The address the server sends from. Server calls read it as a shared object, so they carry no
/// owned object that concurrent transactions could lock, and changing it revokes the old address.
public struct ServerConfig has key {
    id: UID,
    server: address,
}

/// Every sticker's ID derives from this and the sticker's key, so a sticker is minted once, at an
/// ID known before the mint.
public struct StickerRegistry has key { id: UID }

/// The derivation key: the server's id for the sticker.
public struct StickerKey(String) has copy, drop, store;

/// A sealed sticker.
public struct Sticker has key, store {
    id: UID,
    /// The running number shown as No.0147.
    number: u64,
    /// The Original Artist's address at Sealing.
    artist: address,
    /// sha256 of the sticker PNG, which names its image files.
    content_hash: vector<u8>,
    width: u32,
    height: u32,
    /// Marked 18+ by its Original Artist.
    nsfw: bool,
    /// The image anyone may see: an NSFW sticker's veiled image.
    image_url: String,
}

public struct StickerSealed has copy, drop {
    sticker: ID,
    key: String,
    number: u64,
    artist: address,
    nsfw: bool,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(StickerRegistry { id: object::new(ctx) });
    transfer::share_object(ServerConfig { id: object::new(ctx), server: ctx.sender() });
    transfer::public_transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
}

public fun set_server(_: &AdminCap, config: &mut ServerConfig, server: address) {
    config.server = server;
}

/// Aborts unless the server sent the transaction.
public fun assert_server(config: &ServerConfig, ctx: &TxContext) {
    assert!(ctx.sender() == config.server, ENotServer);
}

/// Creates and shares the Display for Sticker in the registry at 0xd, answering the DisplayCap that
/// updates it. Runs once, after publishing: `init` can't reach the registry.
public fun create_display(
    _: &AdminCap,
    registry: &mut DisplayRegistry,
    names: vector<String>,
    values: vector<String>,
    ctx: &mut TxContext,
): DisplayCap<Sticker> {
    assert!(names.length() == values.length(), EDisplayFieldsMismatch);
    let (mut display, cap) = display_registry::new<Sticker>(
        registry,
        internal::permit<Sticker>(),
        ctx,
    );
    names.zip_do!(values, |name, value| display.set(&cap, name, value));
    display.share();
    cap
}

/// Mints a sealed sticker to its Original Artist. Aborts with EAlreadyMinted when `key` was minted
/// before.
public fun mint(
    config: &ServerConfig,
    registry: &mut StickerRegistry,
    key: String,
    number: u64,
    artist: address,
    content_hash: vector<u8>,
    width: u32,
    height: u32,
    nsfw: bool,
    image_url: String,
    ctx: &TxContext,
): ID {
    config.assert_server(ctx);
    assert!(!key.is_empty() && artist != @0x0 && !image_url.is_empty(), EInvalidSticker);
    assert!(content_hash.length() == HASH_LENGTH && width > 0 && height > 0, EInvalidSticker);
    let derivation = StickerKey(key);
    assert!(!derived_object::exists(&registry.id, derivation), EAlreadyMinted);

    let sticker = Sticker {
        id: derived_object::claim(&mut registry.id, derivation),
        number,
        artist,
        content_hash,
        width,
        height,
        nsfw,
        image_url,
    };
    let id = object::id(&sticker);
    event::emit(StickerSealed { sticker: id, key, number, artist, nsfw });
    transfer::public_transfer(sticker, artist);
    id
}

/// The ID the sticker with `key` has, or will have once minted.
public fun sticker_address(registry: ID, key: String): address {
    derived_object::derive_address(registry, StickerKey(key))
}

public fun is_minted(registry: &StickerRegistry, key: String): bool {
    derived_object::exists(&registry.id, StickerKey(key))
}

public fun number(sticker: &Sticker): u64 { sticker.number }

public fun artist(sticker: &Sticker): address { sticker.artist }

public fun content_hash(sticker: &Sticker): vector<u8> { sticker.content_hash }

public fun width(sticker: &Sticker): u32 { sticker.width }

public fun height(sticker: &Sticker): u32 { sticker.height }

public fun nsfw(sticker: &Sticker): bool { sticker.nsfw }

public fun image_url(sticker: &Sticker): String { sticker.image_url }

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }
```

`sources/gift.move`, the draft's, unchanged:

```move
/// Holds a sticker after Giving until the server claims it for its receiver, its giver takes it
/// out, or the server returns it once it has expired. Each gift is its own shared object, at an ID
/// derived from the escrow and the server's gift id, so only deposits touch the escrow.
module stickers::gift;

use stickers::sticker::{Sticker, ServerConfig};
use sui::clock::Clock;
use sui::derived_object;
use sui::dynamic_object_field as dof;
use sui::event;

const EInvalidGift: u64 = 0;
const EGiftExists: u64 = 1;
const EGiftNotPending: u64 = 2;
const EGiftExpired: u64 = 3;
const EGiftNotExpired: u64 = 4;
const ENotGiftSender: u64 = 5;

/// The gift id and the Gift Claim Token's hash are 32 bytes.
const ID_LENGTH: u64 = 32;

/// Every gift's ID derives from this and its gift id.
public struct Escrow has key { id: UID }

/// The derivation key: the gift id the server made at Packaging.
public struct GiftKey(vector<u8>) has copy, drop, store;

/// The dynamic object field a pending gift keeps its sticker in, where the sticker stays visible by
/// its own ID.
public struct StickerSlot() has copy, drop, store;

/// A gift that doesn't exist yet is `missing`: its derived ID has no object.
public enum GiftStatus has copy, drop, store {
    Pending,
    Claimed,
    TakenOut,
    ExpiredReturned,
}

public struct Gift has key {
    id: UID,
    gift_id: vector<u8>,
    /// The giver's address, the deposit's sender.
    sender: address,
    sticker: ID,
    /// The Gift Claim Token's hash. The server checks a token against it; the escrow only keeps it.
    claim_commitment: vector<u8>,
    expires_at_ms: u64,
    status: GiftStatus,
    /// Set by the claim.
    recipient: Option<address>,
}

public struct GiftStaged has copy, drop {
    gift: ID,
    gift_id: vector<u8>,
    sticker: ID,
    sender: address,
    claim_commitment: vector<u8>,
    expires_at_ms: u64,
}

public struct GiftClaimed has copy, drop {
    gift: ID,
    gift_id: vector<u8>,
    sticker: ID,
    recipient: address,
}

public struct GiftTakenOut has copy, drop {
    gift: ID,
    gift_id: vector<u8>,
    sticker: ID,
    sender: address,
}

public struct ExpiredGiftReturned has copy, drop {
    gift: ID,
    gift_id: vector<u8>,
    sticker: ID,
    sender: address,
}

fun init(ctx: &mut TxContext) {
    transfer::share_object(Escrow { id: object::new(ctx) });
}

/// The giver's deposit, with the terms Packaging issued. Aborts with EGiftExists when `gift_id`
/// was ever used.
public fun deposit(
    escrow: &mut Escrow,
    sticker: Sticker,
    gift_id: vector<u8>,
    claim_commitment: vector<u8>,
    expires_at_ms: u64,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(gift_id.length() == ID_LENGTH && claim_commitment.length() == ID_LENGTH, EInvalidGift);
    assert!(expires_at_ms > clock.timestamp_ms(), EInvalidGift);
    let key = GiftKey(gift_id);
    assert!(!derived_object::exists(&escrow.id, key), EGiftExists);

    let sticker_id = object::id(&sticker);
    let mut gift = Gift {
        id: derived_object::claim(&mut escrow.id, key),
        gift_id,
        sender: ctx.sender(),
        sticker: sticker_id,
        claim_commitment,
        expires_at_ms,
        status: GiftStatus::Pending,
        recipient: option::none(),
    };
    dof::add(&mut gift.id, StickerSlot(), sticker);
    event::emit(GiftStaged {
        gift: object::id(&gift),
        gift_id,
        sticker: sticker_id,
        sender: gift.sender,
        claim_commitment,
        expires_at_ms,
    });
    transfer::share_object(gift);
}

/// The server's claim for the receiver, until the gift expires.
public fun claim(
    config: &ServerConfig,
    gift: &mut Gift,
    recipient: address,
    clock: &Clock,
    ctx: &TxContext,
) {
    config.assert_server(ctx);
    assert!(gift.status == GiftStatus::Pending, EGiftNotPending);
    assert!(recipient != @0x0, EInvalidGift);
    assert!(clock.timestamp_ms() <= gift.expires_at_ms, EGiftExpired);
    gift.status = GiftStatus::Claimed;
    gift.recipient.fill(recipient);
    transfer::public_transfer(gift.release(), recipient);
    event::emit(GiftClaimed {
        gift: object::id(gift),
        gift_id: gift.gift_id,
        sticker: gift.sticker,
        recipient,
    });
}

/// The giver takes a pending gift back, expired or not.
public fun take_out(gift: &mut Gift, ctx: &TxContext) {
    assert!(gift.status == GiftStatus::Pending, EGiftNotPending);
    assert!(ctx.sender() == gift.sender, ENotGiftSender);
    gift.status = GiftStatus::TakenOut;
    transfer::public_transfer(gift.release(), gift.sender);
    event::emit(GiftTakenOut {
        gift: object::id(gift),
        gift_id: gift.gift_id,
        sticker: gift.sticker,
        sender: gift.sender,
    });
}

/// The server sends a pending gift past its expiry back to its giver.
public fun return_expired(config: &ServerConfig, gift: &mut Gift, clock: &Clock, ctx: &TxContext) {
    config.assert_server(ctx);
    assert!(gift.status == GiftStatus::Pending, EGiftNotPending);
    assert!(clock.timestamp_ms() > gift.expires_at_ms, EGiftNotExpired);
    gift.status = GiftStatus::ExpiredReturned;
    transfer::public_transfer(gift.release(), gift.sender);
    event::emit(ExpiredGiftReturned {
        gift: object::id(gift),
        gift_id: gift.gift_id,
        sticker: gift.sticker,
        sender: gift.sender,
    });
}

fun release(gift: &mut Gift): Sticker {
    dof::remove(&mut gift.id, StickerSlot())
}

/// The address the gift with `gift_id` has, or will have once deposited.
public fun gift_address(escrow: ID, gift_id: vector<u8>): address {
    derived_object::derive_address(escrow, GiftKey(gift_id))
}

public fun status(gift: &Gift): GiftStatus { gift.status }

public fun is_pending(gift: &Gift): bool { gift.status == GiftStatus::Pending }

public fun is_claimed(gift: &Gift): bool { gift.status == GiftStatus::Claimed }

public fun is_taken_out(gift: &Gift): bool { gift.status == GiftStatus::TakenOut }

public fun is_expired_returned(gift: &Gift): bool { gift.status == GiftStatus::ExpiredReturned }

public fun sender(gift: &Gift): address { gift.sender }

public fun recipient(gift: &Gift): Option<address> { gift.recipient }

public fun sticker(gift: &Gift): ID { gift.sticker }

public fun claim_commitment(gift: &Gift): vector<u8> { gift.claim_commitment }

public fun expires_at_ms(gift: &Gift): u64 { gift.expires_at_ms }

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }
```

**Display**, created once after publishing:
- `name`: `Sticker No.{number}`
- `description`: `A sticker drawn on Croquis.`
- `image_url`: `{image_url}`
- `project_url`: `https://liff.line.me/<the LIFF id in apps/frontend/src/line/liff.ts>`

**Tests** come from the draft's two files, one behavior each.
- `sticker_tests.move`:
  - `a_key_is_minted_once`
  - `only_the_server_mints`
  - `mint_sends_the_sticker_to_its_artist_at_its_derived_address`
  - `create_display_shares_the_fields`
  - `a_content_hash_must_be_32_bytes`, which replaces `a_veiled_hash_must_be_a_hash`
  - `a_sticker_keeps_its_nsfw_mark_and_image`, which replaces `a_veiled_sticker_is_nsfw`
  - `set_server_moves_the_server`: the old address can no longer mint
- `gift_tests.move`, as drafted:
  - `a_deposit_must_expire_later`
  - `a_gift_id_is_used_once`
  - `the_server_claims_a_gift_for_its_receiver`
  - `only_the_server_claims`
  - `an_expired_gift_cant_be_claimed`
  - `a_gift_taken_out_cant_be_claimed`
  - `only_the_giver_takes_a_gift_out`
  - `the_giver_takes_a_gift_out_even_after_it_expires`
  - `the_server_returns_an_expired_gift_to_its_giver`
  - `a_gift_is_returned_only_after_it_expires`

  Their `mint` calls pass `false` and an image URL where the draft passed `option::none()`.

---

## Data model

Every schema edit lands before the baseline (Task 12).

### `sui_transactions` (new): `packages/db/src/schema/suiTransactions.ts`, added to `allTables`

```ts
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { oneOf, timestamps } from "./columns.ts";
import { gifts } from "./gifts.ts";
import { stickers } from "./stickers.ts";
import { ticketPurchases } from "./tickets.ts";
import { users } from "./users.ts";

export const suiTransactionKinds = [
  "mint",
  "deposit",
  "take_out",
  "claim",
  "return",
  "payment",
] as const;
export const suiTransactionOutcomes = ["succeeded", "failed", "dead"] as const;

/**
 * One Sui transaction, from Shinami's sponsorship to its outcome. The server builds every
 * transaction and alone submits it, so this row is all there is to know: a sweep resubmits its
 * bytes and signatures, and an open row bars a second transaction over the same sticker, gift,
 * purchase or JPYC coins.
 */
export const suiTransactions = sqliteTable(
  "sui_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind", { enum: suiTransactionKinds }).notNull(),
    /** Who signs it as sender: the server, or the person's Privy Sui wallet. */
    sender: text("sender").notNull(),
    /** The person, for the kinds they sign. */
    userId: text("user_id").references(() => users.id),
    stickerId: text("sticker_id").references(() => stickers.id),
    giftId: text("gift_id").references(() => gifts.id),
    purchaseId: integer("purchase_id").references(() => ticketPurchases.id),
    /** Base58, known from the sponsorship, before anyone signs. */
    digest: text("digest").notNull().unique(),
    /** Base64 BCS TransactionData, Shinami's gas included. */
    txBytes: text("tx_bytes").notNull(),
    /** Shinami's signature. It never leaves the server, so nothing else can submit the transaction. */
    sponsorSignature: text("sponsor_signature").notNull(),
    /** The sender's: the server's at once, the person's once the app posts it. */
    senderSignature: text("sender_signature"),
    /** When Shinami's sponsorship lapses. Never submitted after. */
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
    /**
     * Null while open. `dead`: it never ran and never can, because its sponsorship lapsed or the
     * server dropped it unsubmitted.
     */
    outcome: text("outcome", { enum: suiTransactionOutcomes }),
    /** Sui's words for a failed transaction, such as a Move abort. */
    failure: text("failure"),
    settledAt: integer("settled_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (t) => [
    // One open transaction per owned object it moves, and per record it settles.
    uniqueIndex("sui_transactions_open_sticker")
      .on(t.stickerId)
      .where(sql`${t.outcome} is null and ${t.kind} in ('mint', 'deposit')`),
    uniqueIndex("sui_transactions_open_gift").on(t.giftId).where(sql`${t.outcome} is null`),
    uniqueIndex("sui_transactions_open_purchase").on(t.purchaseId).where(sql`${t.outcome} is null`),
    // A payment spends the payer's JPYC coins.
    uniqueIndex("sui_transactions_open_payment")
      .on(t.sender)
      .where(sql`${t.outcome} is null and ${t.kind} = 'payment'`),
    index("sui_transactions_open").on(t.createdAt).where(sql`${t.outcome} is null`),
    index("sui_transactions_gift").on(t.giftId),
    index("sui_transactions_sticker").on(t.stickerId),
    check("sui_transactions_kind", oneOf(t.kind, suiTransactionKinds)),
    check(
      "sui_transactions_outcome",
      sql`${t.outcome} is null or ${oneOf(t.outcome, suiTransactionOutcomes)}`,
    ),
    check(
      "sui_transactions_subject",
      sql`(${t.kind} = 'mint' and ${t.stickerId} is not null and ${t.userId} is null and ${t.giftId} is null and ${t.purchaseId} is null)
        or (${t.kind} = 'deposit' and ${t.userId} is not null and ${t.stickerId} is not null and ${t.giftId} is not null and ${t.purchaseId} is null)
        or (${t.kind} = 'take_out' and ${t.userId} is not null and ${t.giftId} is not null and ${t.purchaseId} is null)
        or (${t.kind} in ('claim', 'return') and ${t.userId} is null and ${t.giftId} is not null and ${t.purchaseId} is null)
        or (${t.kind} = 'payment' and ${t.userId} is not null and ${t.purchaseId} is not null and ${t.stickerId} is null and ${t.giftId} is null)`,
    ),
    check("sui_transactions_settled", sql`(${t.outcome} is null) = (${t.settledAt} is null)`),
    check(
      "sui_transactions_failure",
      sql`coalesce(${t.outcome} = 'failed', 0) = (${t.failure} is not null)`,
    ),
    check(
      "sui_transactions_submitted",
      sql`${t.submittedAt} is null or ${t.senderSignature} is not null`,
    ),
  ],
);
```

### Changed tables

Natural column order everywhere: delete the "Columns added after the table was made go last…" comments. Every table ends with `...timestamps()`.

**users**
- `smart_account_address` becomes `sui_address`:
  - the person's Privy Sui wallet, `0x` and 64 lowercase hex digits;
  - unique; CHECK on its length (66) and lowercase;
  - kept on account deletion, as today.
- `ens_label`, `ens_named_at`, `age_verified_at` and `age_verification_nullifier` go.
- `nsfw_opted_in_at` is added: a nullable timestamp in ms, cleared on account deletion.
- `language` loses its default.
- Order: id, line_user_id, line_display_name, line_picture_url, handle, language, language_choice, nsfw_opted_in_at, sui_address, terms_accepted_at, deleted_at.

**stickers**
- `token_id` and `mint_tx_hash` become `object_id`: unique, `0x` and 64 hex digits, null until the mint lands. The mint's digest lives in `sui_transactions`.
- `metadata_uri` and `ens_named_at` go. Display reads the object's own fields.
- `nsfw` loses its default.
- New CHECK `stickers_veiled`: `nsfw = (veiled_hash is not null)`. Sealing makes every NSFW sticker's veil before the insert (`seal.ts`).
- `content_hash` is sha256 now. The `id` comment drops the keccak key.
- Order: id, number, artist_id, owner_id, time_used, width, height, outline, nsfw, content_hash, veiled_hash, object_id.

**gifts**
- `escrow_status` takes the Gift object's statuses: missing, pending, claimed, taken_out, expired_returned. `rejected` is gone.
- `claim_tx_hash` and its CHECK go; the claim row holds the digest.
- `gifts_status_escrow`: `taken_out` allows only `missing` or `taken_out`. A deposit the server built can't land under other terms, so `taken_out` with `pending` goes.
- Comments:
  - `id`: "32 random bytes; the gift's Sui object ID derives from it in the escrow."
  - `claim_commitment`: "sha256 of the Gift Claim Token."
  - `taken_out_at` loses "a deposit that didn't match".
  - `for_user_id` loses "A stopgap until smart account permissions…".

**ticket_purchases**
- `tx_digest` goes; the payment row holds it.
- CHECK `ticket_purchases_payment` becomes `(paid_jpyc is null) = (verified_at is null)`.
- `given_up_at`: "Set when its payment never ran: the sponsorship lapsed unsigned, the person started another, or Sui failed it."

**ticket_uses**
- `idempotency_key` becomes NOT NULL, and "Null on uses spent before spends had keys" goes.
- Order: id, user_id, idempotency_key, ticket_day, day_index, kind, sticker_id.

---

## Server

### AppDeps (`apps/api/src/deps.ts`)

These replace `mint`, `giftChain`, `smartWallets`, `ens` and `worldId`. In mock mode, `sui` and `gasStation` are null.

```ts
/** Shinami Gas Station: pays the gas of every transaction the server builds. */
export interface GasStation {
  /** Sponsors a transaction kind for `sender`. Rejects with SponsorshipError. */
  sponsor: (kind: Uint8Array, sender: string) => Promise<Sponsorship>;
  /** The fund's balance less what's in flight, in MIST. */
  available: () => Promise<bigint>;
}

export interface Sponsorship {
  digest: string;
  /** Base64. */
  txBytes: string;
  /** Base64. */
  sponsorSignature: string;
  expiresAt: Date;
}

/** `refused`: Shinami's dry run failed the kind, in its words; `fund_empty`; `unavailable`. */
export class SponsorshipError extends Error {
  name = "SponsorshipError";
  constructor(
    readonly reason: "refused" | "fund_empty" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

export interface SuiWallets {
  /** The person's Privy Sui wallet, normalized; null while they have none. */
  addressFor: (userId: string) => Promise<string | null>;
}

/** What Sui did with a transaction. */
export type SuiOutcome =
  | { ok: true; events: { type: string; bcs: Uint8Array }[] }
  | { ok: false; failure: string };

/** A gift's Sui object; `missing` until its deposit lands. */
export interface EscrowGift {
  status: EscrowStatus;
  recipient: string | null;
}

/** A sealed sticker's facts, as its Sticker object records them. */
export interface MintRequest {
  stickerId: string;
  number: number;
  /** The Original Artist's Sui address. */
  artist: string;
  contentHash: string;
  width: number;
  height: number;
  nsfw: boolean;
  /** The public image: an NSFW sticker's veiled one. */
  imageUrl: string;
}

/** Croquis's package and objects on Sui. Each builder answers a transaction kind to sponsor. */
export interface SuiChain {
  /** The server's sender address, which the package's ServerConfig names. */
  server: string;
  mintKind: (mint: MintRequest) => Promise<Uint8Array>;
  depositKind: (deposit: {
    sender: string;
    stickerObjectId: string;
    giftId: string;
    claimCommitment: string;
    expiresAt: Date;
  }) => Promise<Uint8Array>;
  takeOutKind: (sender: string, giftId: string) => Promise<Uint8Array>;
  claimKind: (giftId: string, recipient: string) => Promise<Uint8Array>;
  returnKind: (giftId: string) => Promise<Uint8Array>;
  paymentKind: (payment: { sender: string; amount: bigint; reference: string }) => Promise<Uint8Array>;
  /** The server's signature over bytes it sends as sender. */
  signAsServer: (txBytes: string) => Promise<string>;
  /**
   * Submits a signed transaction and answers its outcome; null when the answer was lost. Rejects with
   * ChainUnavailableError when Sui can't be reached.
   */
  submit: (txBytes: string, signatures: string[]) => Promise<SuiOutcome | null>;
  /** The transaction's outcome; null while Sui doesn't show it, after readLanded's retries. */
  outcomeOf: (digest: string) => Promise<SuiOutcome | null>;
  /** The ID the sticker's object has, or will have once minted (deriveObjectID). */
  stickerObjectId: (stickerId: string) => string;
  readGift: (giftId: string) => Promise<EscrowGift>;
  /** Whether ServerConfig names `server`, and the objects the env names exist: the boot check. */
  check: () => Promise<{ serverMatches: boolean; missing: string[] }>;
  /** Where ticket packs are paid. */
  payment: TicketPaymentTarget;
}
```

### `apps/api/src/sui/`

- **`oneAtATime(key, fn)`** (`oneAtATime.ts`): a keyed promise chain. Each flow holds `sticker:<id>`, `gift:<id>` or `purchase:<id>` while it reads, sponsors, submits and settles.
- **`transactions.ts`** is the only module that writes `sui_transactions`:
  - **`sponsored(deps, row, kind)`:** sponsors through `gasStation` and inserts the open row. Rejects with SponsorshipError.
  - **`runAsServer(deps, row)`:** signs with `signAsServer`, stores the signature, submits, and settles.
  - **`runSigned(deps, row, signature)`:**
    - checks the person's signature with `verifyTransactionSignature(txBytes, signature, { address: row.sender })`;
    - stores it, submits, and settles;
    - a row already submitted is followed instead, so a retry after a lost answer never sends a second transaction.
  - **`follow(deps, row)`:**
    - Sui shows the transaction → settle `succeeded` or `failed`.
    - Before `expiresAt`, with both signatures stored → submit again. The bytes are the same, so it can run only once.
    - Past `expiresAt` plus `SETTLE_GRACE_MS` with Sui never showing it → settle `dead`.
    - Answers the row as it now stands.
  - **`drop(deps, row)`:** settles a row the server never submitted as `dead` at once, since nothing else can submit it. It throws on a submitted row.
  - **Logs:** every step logs `sui.tx.sponsored|submitted|succeeded|failed|dead` with kind, digest and subject.

### Flows

- **Sealing → mint** (`stickers/seal.ts`, `stickers/mint.ts`):
  - The content hash is the sha256 of the PNG (`node:crypto`). Veil and insert as today, with `object_id` null.
  - `mintSticker`, under `sticker:<id>`:
    1. Done if `object_id` is set.
    2. Follow an open mint row:
       - `succeeded` → record the object;
       - `failed` with EAlreadyMinted → read the object and record it;
       - `dead` or other failures → build a new mint.
    3. Get the artist's Sui address. With none, the mint fails, and Sealing answers 503 `mint_failed` ("Retry Sealing with the same ticket").
    4. Build `mintKind`, with `imageUrl` from `publicStickerViewer(images).images(sticker).png`, then call `sponsored` and `runAsServer`. On success, `object_id = stickerObjectId(stickerId)`, checked against the `StickerSealed` event.
  - Mock mode mints nothing, as today.
  - **The mint catch-up** runs at boot and after each Tokyo midnight. It mints stickers with `object_id` null, oldest first, skipping `no_live_person` and `no_sui_wallet`. Open rows are followed first. The `not_held_by_artist` skip goes.
- **Packaging → deposit** (`gifts/packaging.ts`, `gifts/deposit.ts`). `POST /api/gifts`:
  1. Refusals as today:
     - ownership;
     - `nsfw_not_opted_in` for the picked person;
     - `gift_in_transit`;
     - `not_minted` while `object_id` is null;
     - new: 409 `no_sui_wallet` when the giver has none.
  2. A packed gift for this sticker:
     - its open deposit row is live (more than `SPONSORSHIP_MARGIN_MS` before `expiresAt`) → answer that row again;
     - its row is dead → sponsor a new deposit for the same gift.

     The token is in the first answer only, as today.
  3. A new gift gets an id of 32 random bytes and a token of 32 random bytes. Its commitment is `sha256(token)`, and its expiry is `now + GIFT_EXPIRY_MS`.
  4. Sponsor first. Then one DB transaction inserts the gift (`packed`, escrow `missing`) and its row. A lost race leaves the sponsorship to lapse unused.
  5. Answer 201 `{ gift, giftClaimToken, deposit }`. Mock mode answers `deposit: null` and lands the gift at once.

  `POST /api/gifts/:giftId/deposit { digest, signature }`, under `gift:<id>`:
  - runs the open deposit row with that digest through `runSigned`;
  - `succeeded` → `readGift` reads pending → `escrow_status` pending → 200 `{ gift }`;
  - `failed` → the gift closes as `taken_out`, escrow `missing` → 409 `transaction_failed`, with Sui's words;
  - dead, or no open row with that digest → 409 `sponsorship_expired`. The app packages again and gets a fresh deposit.
- **Take-out**:
  - `POST /api/gifts/:giftId/take-out/start`, under `gift:<id>`, depending on where the gift stands:
    - settled already → `{ gift }`, as today;
    - its deposit never submitted (drop an open one) or never landed → close it in the DB as `taken_out` → `{ gift }`;
    - its deposit submitted and still open → follow it first;
    - escrow pending → answer the open take-out row if it's live, otherwise sponsor `takeOutKind(giver, giftId)` → `{ gift, takeOut }`;
    - escrow claimed → 409 `already_received`;
    - escrow expired_returned → record `returned` → `{ gift }`.
  - `POST /api/gifts/:giftId/take-out { digest, signature }`, through `runSigned`:
    - `succeeded` → `taken_out` → `{ gift }`;
    - `failed` → `readGift` decides: claimed → `already_received`, expired_returned → `returned`, anything else → 409 `transaction_failed`.
- **Receiving → claim** (`gifts/receiving.ts`):
  - Refusals as today, with `nsfw_not_opted_in`. The token check stays on the server: `sha256(token) == claim_commitment`. So does the for-you exception.
  - The receiver's Sui address; with none, 409 `no_sui_wallet`.
  - Under `gift:<id>`, follow an open claim row first:
    - it ran for this receiver (`readGift().recipient`) → record the receive;
    - it ran for someone else → `already_received`.
  - Otherwise, if escrow is pending and the gift hasn't expired: sponsor `claimKind(giftId, receiver)` and `runAsServer`.
    - `succeeded` → record the receive in one DB transaction as today, without `claim_tx_hash`, then send the giver notice.
    - `failed` → `readGift`: taken_out → `taken_back`, expired_returned → `gift_returned`, anything else → 503 `claim_failed`.
  - `claimLandedBeforeExpiry` becomes "a claim row for the gift succeeded".
- **The expiry sweep** (`gifts/expiry.ts`) takes packed and sent gifts past their expiry, oldest first:
  - First, follow the gift's open row.
  - Escrow missing, with no submitted deposit → close as `taken_out` at once. `CLOSE_UNLANDED_AFTER_MS` goes.
  - Escrow pending → `returnKind`, sponsored, then `runAsServer` → `returned`.
  - Claimed → leave it for Receiving's reconcile, as today.
  - Escrow missing after a deposit that succeeded can't happen → log `gift.expiry.failed`.
- **Ticket purchases** (`routes/tickets.ts`, `tickets/`):
  - `POST /api/ticket-purchases/start { tickets }`:
    1. Get the buyer's Sui address; with none, 409 `no_sui_wallet`.
    2. Their open payment row:
       - submitted → follow it to its end first;
       - never submitted → drop it, and give up its purchase.
    3. Insert the purchase, then sponsor `paymentKind`. The reference is `tickets:<userId>:<purchaseId>`.
       - Shinami refuses (too little JPYC, say) → give up the purchase → 422 `sponsorship_refused`, with Shinami's words.
    4. Answer 201 `{ purchase, payment }`.
  - `POST /api/ticket-purchases { purchaseId, digest, signature }`, through `runSigned`:
    - `succeeded` → the `PaymentReceived` check (vault, amount, reference) → credit → 201 `{ tickets }`;
    - `failed` → give up the purchase → 409 `transaction_failed`;
    - dead → 409 `sponsorship_expired`.
  - **The sweep**, every 3 minutes, follows open payment rows:
    - `succeeded` → credit;
    - `failed` or `dead` → give up.

    `paymentsSince`, `readBackTo` and the event scan go.
  - Mock mode: `start` answers 503 `chain_unavailable` ("this server runs without Sui"). Under LIFF Mock no one can sign anyway, as today.
- **The giver notice** doesn't change.
- **The boot check**, at boot and after each Tokyo midnight:
  - `sui.check()` and `gasStation.available()` log `chain.sui.checked { serverMatches, missing, fundMist }`;
  - a failure logs `chain.sui.mismatch`;
  - a fund below `LOW_FUND_MIST` logs `sponsor.fund.low`.

### Routes and codes

| Route | Body | Answer |
| --- | --- | --- |
| `POST /api/gifts` | as today | 201 `{ gift, giftClaimToken, deposit: SponsoredTransaction \| null }` |
| `POST /api/gifts/:giftId/deposit` | `SignedTransaction` | 200 `{ gift }` |
| `POST /api/gifts/:giftId/take-out/start` | none | 200 `{ gift, takeOut?: SponsoredTransaction }` |
| `POST /api/gifts/:giftId/take-out` | `SignedTransaction` | 200 `{ gift }` |
| `POST /api/ticket-purchases/start` | `{ tickets }` | 201 `{ purchase, payment: SponsoredTransaction }` |
| `POST /api/ticket-purchases` | `{ purchaseId } & SignedTransaction` | 201 `{ tickets }` |
| `POST /api/me/nsfw-opt-in` | `{ nsfwOptIn: boolean }` | 200 `{ me }` |

The two shapes live in `shapes.ts` and are exported from `client.ts`:
- `sponsoredTransactionSchema = z.object({ txBytes: z.base64(), digest, expiresAt })`
- `signedTransactionSchema = z.object({ digest, signature: z.base64() })`

**New codes:**
- `sponsorship_expired` (409)
- `signature_invalid` (400)
- `transaction_failed` (409, with Sui's words)
- `sponsorship_refused` (422, with Shinami's words)
- `sponsor_unavailable` (503): Shinami's -1, -32010, a 5xx or a timeout, after one retry
- `sponsor_fund_empty` (503): -2
- `no_sui_wallet` (409)
- `nsfw_not_opted_in` (403)

A 401 from Shinami answers 500 and logs it, since it means the server's config is wrong. `deposit_not_landed`, `take_out_not_landed` and `payment_not_landed` (503) now mean "Sui's answer was lost; send the same signature again".

**Codes that go:**
- `adults_only`;
- `age_not_proven`, `age_verification_not_configured`, `age_verification_refused`, `age_verification_used`, `already_age_verified`;
- `world_id_unavailable`;
- `ens_not_configured`, `unknown_resolver`, `unsupported_request`;
- `deposit_mismatch`, `deposit_held`, `gift_held`, with `ErrorBody`'s `giftId`.

**Routes that go:** `/api/me/age-verification*`, `/api/ens/*` (the gateway and `GET /api/ens/people/:label`).

---

## The app

- **Signing** (`identity/suiSigner.ts`):
  - `signSponsored(tx)` waits for the signer, then calls `signTransaction(fromBase64(tx.txBytes))`, all within `SIGNING_TIMEOUT_MS`. It answers `{ digest, signature }`.
  - `SigningTimedOut` moves to a small module of its own, `identity/signingTimedOut.ts`.
- **Waiting for the wallet** (`api/suiWalletApi.ts` replaces `smartWalletApi.ts`): `withSuiWallet` holds `seal`, `packageGift`, `receiveGift`, `receiveGiftForYou` and `startTicketPurchase` until Privy has the Sui wallet. That wait is `waitForSuiAddress`, which fails with `sui_wallet_not_ready`. `smart_account_not_ready` goes.
- **`MakeSuiWallet`** makes the wallet once Privy is signed in, without waiting for an Ethereum wallet. It gets one fresh try, as `smartWallet.ts` had.
- **Privy** (`PrivySession.tsx`, `privy.ts`):
  - `PrivyProvider` gets `embeddedWallets: { ethereum: { createOnLogin: "off" } }`.
  - Gone: `defaultChain` and `supportedChains` (Sepolia), `SmartWalletsProvider`, `SmartWalletBridge`, `SponsorshipCheck`, and `PrivyStatus.wallet` and `.smartAccount`.
  - The wallet-frame retry stays.
- **Giving** (`giving/giftBackend.ts`, `keptGifts.ts`):
  - **Deposit:** `onWait("moving")`, then `signSponsored(deposit)`, then one `reportDeposit`.
  - **Take-out:** `startTakeOut`, then sign if asked, then `takeOutGift`.
  - **Recovery:** a lost token takes the gift out, then packages again.
  - **What's kept:** `keptGifts` keeps only `message`.
  - **Deleted:** `giftTransactions.ts`, `PackWait`'s `confirming`, and the `deposit_not_landed` and `take_out_not_landed` retry loops. The server waits for effects now.
- **The reserve ticket checkout** (`ReserveTicketCheckout.tsx`):
  - **Paying:** `waitForSuiSigner`, then `startTicketPurchase`, then `signSponsored(payment)`, then `buyTickets({ purchaseId, digest, signature })`.
  - **A lost answer** keeps the signed body in memory for Try again, which is safe by digest.
  - **Deleted:**
    - `tickets/unaddedPurchases.ts`, with its uses in `App.tsx`, the tab pip in `TabBar.tsx` and `.tab-pip` in `TabBar.css`;
    - `shop/UnaddedPurchaseStrip.tsx` and `unadded-strip.css`;
    - the unadded card;
    - `payments/paymentErrors.ts`;
    - `signTicketPayment` in `payments/jpyc.ts`. Its balance and history reads stay.
  - **Failure kinds:** `paymentFailure.ts` keeps `timedOut`, `app` and `other`.
- **The stat board:** one Sui address paper. `useBoardAddress`, `checksumAddress.ts`, the Ethereum mark and the Etherscan and ENS explorers go (`addresses.ts`, `AddressPapers.tsx`, `AddressDialog.tsx`, `ChainPin.tsx`, `brandMarks.ts`, `explorers.ts`, `PrivyAccount.tsx`).
- **Dependencies:** the frontend drops `viem`, `permissionless`, `@worldcoin/idkit` and `@drawing-app/sticker-chain`. It keeps `@mysten/sui`, `@privy-io/react-auth` and `@paulmillr/qr`.

---

## Removals

### ENS
- **API:**
  - `apps/api/src/ens/` entire;
  - `routes/ens.ts` and its test;
  - `services/contractReads.ts` and its test;
  - ENS fields in `diagnostics.ts`;
  - `ensName` in `shapes.ts`;
  - the gateway exception in `session.ts`;
  - `queueNaming` in `mint.ts` and `receiving.ts`;
  - the ENS deps in `deps.ts`, `server.ts` and `testing/fakes.ts`;
  - `CROQUIS_PARENT_NAME` in `client.ts`;
  - `APP_LINK_BASE`.
- **`packages/sticker-chain`:** `src/croquis-names.ts`, `src/ens-gateway.ts`, `contracts/ens/`, `script/CroquisSetup.sol`, and the ENS tests and helpers.
- **App:**
  - `ensName` in `views.ts` and `boardSticker.ts`;
  - the ENS tape in `StatCork.tsx`;
  - `StickerDetail`'s name link;
  - `EnsNameLink.tsx`;
  - `/@label` in `openedView.ts` and `App.tsx`;
  - Explore's label lookup;
  - `personByEnsLabel`;
  - the CSS for these.

  `TicketPurchases` shows `shortAddress(owner)`.
- **Strings:** `stickerBoard.ensName`, `explore.failed.ensName`, and the ENS error codes.

### World ID → the NSFW opt-in

#### API
**Delete:**
- `routes/ageVerification.ts` and `services/worldId.ts`, with their tests;
- the World ID deps in `deps.ts`, `server.ts`, `app.ts`, `client.ts`, `testing/fakes.ts` and `createTestApp.ts`;
- `@worldcoin/idkit-server`.

**Replace age status with the opt-in:**
- **`shapes.ts`:** `ageStatusOf` becomes `optedIntoNsfw(user)`. Person's `ageStatus` becomes `nsfwOptIn`, and Me's `ageVerifiedAt` goes.
- **`session.ts`:** `sessionUser` selects `nsfwOptedInAt`.
- **`app.ts`:** `imageAccess` serves a drawing's files only to an opted-in session, still cached `private`.
- **Refusals:** sealing's mark (`seal.ts`), a picked recipient (`packaging.ts`), receiving (`receiving.ts`) and the timelapse (`routes/stickers.ts`, `stickers/timelapse.ts`). Each refuses with `nsfw_not_opted_in`.
- **Account deletion** clears `nsfw_opted_in_at`.
- **The route:** add `POST /api/me/nsfw-opt-in` beside the language choice's. It sets `nsfwOptedInAt = nsfwOptIn ? now : null`.

#### App
**Delete:**
- `WorldIdAgeProof.tsx` and `useMyAgeStatus.ts`;
- `AgeVerificationNote.tsx` and its CSS and test;
- `StatCork`'s `ownTarget` (only World ID's window needed it) and its test;
- `verifyAge` and `ageVerificationRequest`;
- `SealCheck` in `icons`;
- `useSetMe` and `setReadyMe`, since the opt-in restarts the app;
- `@worldcoin/idkit`.

**Replace age status with the opt-in:**
- **`stickers/nsfw.ts`:** `veiledFor` and `canGiveTo` take a boolean. Add `useMyNsfwOptIn()`.
- **Readers of `ageStatus`** switch to `nsfwOptIn`:
  - `StickerPile`, `LiftedSticker`;
  - `ArtistBoard`, `StickerBoard`;
  - `GiveSheet` (`toNsfwOptIn`);
  - `DrawingScreen`, which shows `NsfwToggle` while `nsfwOptIn || nsfwOn`, so a kept drawing's mark can be switched off;
  - the refusal sets in `receiving/refusals.ts`, `receiveFlow.ts` and `session/session.ts`. The refusal screen's action becomes `board`.
- **Owners now see their own stickers veiled** after opting out. Add the 18+ mark in `StickerDetail`, the tray (`traySheets.ts`) and the give sheet's picker.
- **`SettingsNote` gets the switch**, a second fieldset under Language:
  - one `role="switch"` checkbox row, filled Bonbon Pink when on;
  - on change: `setNsfwOptIn`, then forget the kept board (export `lastBoard`'s `forget`), then `reopenOnSettingsNextStart()`, then restart;
  - a failed save changes nothing.

#### Strings
In `stickerBoard.settings.nsfw`, each with its `/** where */` comment:
- **title**
  - `/** Settings note: the heading over the NSFW opt-in's switch */`
  - "18+ stickers" / 「18+のシール」
- **show**
  - `/** Settings note: the NSFW opt-in's switch, off until you turn it on; on, 18+ stickers show unblurred and you can seal and receive them */`
  - "Show 18+ stickers" / 「18+のシールを表示する」
- **about**
  - `/** Settings note: the fine print under the NSFW opt-in's switch, saying who it's for and what it changes */`
  - "For people 18 or older. On, 18+ stickers show unblurred, and you can seal your own as 18+ and receive them. Off, they’re blurred, yours too."
  - 「18歳以上の方向けです。オンにすると、18+のシールがぼかしなしで表示され、自分のシールを18+として仕上げたり、18+のシールを受け取ったりできます。オフにすると、自分のものも含めてぼかして表示されます。」
- **restarts**
  - `/** Settings note: the fine print saying that changing the NSFW opt-in restarts the app */`
  - "Changing it restarts Croquis." / 「切り替えると、クロッキーが再起動します。」
- **notSaved**
  - `/** Settings note: the alert when the NSFW opt-in didn't save to your account, with the reason */`
  - "Your 18+ setting couldn’t be saved, so it hasn’t changed: {{reason}}" / 「18+の設定を保存できなかったため、変更していません：{{reason}}」
- **saving:** `settings.language.saving` moves up to `settings.saving`, shared by both settings.

**`errors.nsfw_not_opted_in`** (was `adults_only`):
- "Only people who turned on Show 18+ stickers in Settings can seal or receive 18+ stickers."
- 「18+のシールを仕上げたり受け取ったりできるのは、設定で「18+のシールを表示する」をオンにした人だけです。」

**`giving.nsfw`:**
- **blocked:** "18+, can’t be given to them" / 「18+のため、この人には贈れません」
- **notOptedIn** (was `adultsOnly`): "18+ stickers only go to people who turned on Show 18+ stickers, and <name/> hasn’t." / 「18+のシールは、<wbr/>「18+のシールを表示する」を<wbr/>オンにした人にだけ<wbr/>贈れます。<wbr/><name/>さんは<wbr/>オンにしていません。」
- **whoCanOpen:** "18+ sticker: only someone who turned on Show 18+ stickers can open this gift." / 「18+のシール：<wbr/>「18+のシールを表示する」を<wbr/>オンにした人だけが<wbr/>このギフトを<wbr/>ひらけます。」

**`receiving.refusals.nsfwNotOptedIn`** (was `adultsOnly`):
- **title:** "This gift is 18+" / 「このギフトは18+です」
- **line:** "{{name}} sent an 18+ sticker. To open it, tap your name on My board and turn on Show 18+ stickers in Settings." / 「{{name}}さんが18+のシールを送りました。ひらくには、マイボードで自分の名前をタップし、設定の「18+のシールを表示する」をオンにしてください。」
- **line_unknownGiver:** "This is an 18+ sticker. To open it, tap your name on My board and turn on Show 18+ stickers in Settings." / 「18+のシールです。ひらくには、マイボードで自分の名前をタップし、設定の「18+のシールを表示する」をオンにしてください。」

**`stickerCreation.nsfw.label`:**
- "18+: seal as sensitive content, blurred for anyone who hasn’t turned on 18+ stickers"
- 「18+：センシティブな内容として仕上げる（18+のシールをオンにしていない人にはぼかして表示）」

**`stickers.nsfw.veiled`:** "Blurred: 18+ sticker" / 「ぼかし表示：18+のシール」

**Delete:**
- `stickerBoard.ageVerification` (9 strings);
- the age error codes;
- "World ID" in `ui.ts`'s comment;
- the glossary rows for adult and World ID.

**Add** the glossary row `| NSFW opt-in (Settings) | 18+のシールを表示する | The switch's label; on and off are オン / オフ |`.

#### Config and docs
- **Config:** delete `WORLD_ID_*` in `apps/api/.env.example`, `deploy/.env.example`, `deploy/drawing-api.env`, `deploy/deploy-api.sh` and `install-chain-env.mjs`, and its test.
- **Docs:** reword the NSFW lines in AGENTS.MD, DESIGN.md (the Settings paper and the 18+ switch) and PRODUCT.md.

### Older data, from the first plan
- **The veil catch-up** goes:
  - `stickers/veilCatchUp.ts` and its test;
  - its job in `server.ts`;
  - `nameMetadataImage`, `metadataImagesSchema` and `replaceFile` in `imageStore.ts`;
  - the mask standing in for a missing veil, in `veiledImageUrls`;
  - the `veiled`, `rewritten` and `done` fields in `diagnostics.ts`;
  - `METADATA_SUFFIX` and the metadata `no-cache` header in `app.ts`, since images stay immutable.

  `{stickerId}.json` and `saveMetadata` go with Display.
- **`viewerOf`** throws on an NSFW row without a veil.
- **`testDb.ts`:** `insertSticker` gives an NSFW sticker a `veiledHash`, `nsfw: false` by default, and `language: "en"`. Add an `insertTicketUse` helper with a spend key, used by the API fixtures that insert ticket uses by hand.
- **`strokePasses` becomes required**, `[]` for a combo with no strokes. Change both the API's `replay.ts` and the app's `replayRecorder.ts` and `replayFeed.ts`. The app's `fastPass` becomes a boolean.
- **End reason `sent` goes**, from `replay.ts`, `record.ts`, `testReplays.ts` and `replayInput.ts`.
- **Timelapse `density` becomes required**, in both the API's `timelapse.ts` and the app's `sealing/timelapse.ts`. The density estimate in `timelapseCrop.ts` and the `image` option in `timelapsePlayer.ts` go. Fix the design doc's line about older replays (`docs/gratitude-mini-game-design-doc.md`).
- **The app's leftovers go:**
  - the `needs_server` refusal;
  - `BoardSticker.blob`;
  - empty outlines (`boardSticker.ts`);
  - the lenient read of a kept drawing without tools;
  - optional sticker images: every sticker has all its images, so `foil` alone stays optional, for the Shop's sample.
- **The Shop's purchases list**, in `payments/jpyc.ts`:
  - it decodes each event's base64 `reference`;
  - it keeps only those whose `purchaseNamedBy(reference).userId` is the signed-in account;
  - `purchaseNamedBy` moves to `apps/api/src/tickets/paymentReference.ts`, re-exported from `client.ts`.
- **`useMyStickerBoard`** forgets an answer it kept for another account (`forgetMyStickerBoardUnlessFor`, called beside `forgetBoardUnlessFor` in `App.tsx`).
- **`deploy/serve.py`:** `OLD_GIFT_HERO` goes.

---

## Deploy, toolchain and docs

- **Settings and env:**
  - **API env:** `STICKER_CHAIN_MODE` is `mock` or `sui`. In sui mode it needs:
    - secrets: `SUI_SERVER_PRIVATE_KEY` (`suiprivkey…`) and `SHINAMI_ACCESS_KEY`;
    - public IDs, in `deploy/drawing-api.env` beside JPYC's: `SUI_STICKER_PACKAGE`, `SUI_STICKER_REGISTRY`, `SUI_SERVER_CONFIG` and `SUI_GIFT_ESCROW`.

    `CDN_BASE_URL` makes the image URL.
  - **Deploy-only:** `SUI_DEPLOYER_PRIVATE_KEY`.
  - **The examples:** `apps/api/.env.example` and `deploy/.env.example` follow. The Sepolia, ENS and World ID blocks go.
- **`deploy/install-chain-env.mjs`** writes exactly these keys, all required, merging nothing:
  - `STICKER_CHAIN_MODE=sui`;
  - `SUI_SERVER_PRIVATE_KEY`, `SHINAMI_ACCESS_KEY`;
  - `PRIVY_APP_ID`, `PRIVY_APP_SECRET`;
  - `LINE_MESSAGING_CHANNEL_ID`, `LINE_MESSAGING_CHANNEL_SECRET`.

  `deploy-api.sh`'s `chain_config` follows.
- **`deploy/deploy.sh`:** the `VITE_STICKER_ESCROW_ADDRESS` and `VITE_STICKER_RPC_URL` exports go, and the auth server builds from `packages/line-auth`.
- **`deploy/publish-sui.mjs`** replaces `deploy-contracts.sh`. It's a reusable script that simulates unless given `--publish`:
  - `sui move build --dump-bytecode-as-base64` for `contracts/sui-sticker-contract/stickers`;
  - one publish transaction from `SUI_DEPLOYER_PRIVATE_KEY`, which sends the UpgradeCap to the deployer;
  - Shinami sponsors it when Gas Station takes a Publish; otherwise the deployer pays;
  - then `set_server(SUI_SERVER address)` and `create_display`, with the fields above;
  - it prints `KEY=value` lines for `drawing-api.env`, and never a key.
- **Toolchain:**
  - **Delete from `packages/sticker-chain`:** the Solidity (`contracts/`, `script/`, `test/foundry/`), `foundry.toml`, `wagmi.config.ts`, `src/generated/`, `src/seal-sticker.ts`, `src/gift-sticker.ts`, `src/bytes32.ts` and their tests, the `lib/` submodules and `.gitmodules`.
  - **Rename** what's left to `packages/line-auth`. Update `apps/api/src/services/lineVerifier.ts`, `deploy.sh`, `knip.json` and `turbo.json`.
  - **Tidy the config:**
    - `turbo.json`: the `compile` tasks;
    - `knip.json`: forge, anvil, wagmi, `lib/**`, `@openzeppelin/contracts`;
    - `.gitignore`: out, cache, broadcast, `foundry.lock`;
    - `.oxfmtrc.json`: generated, lib;
    - `deploy/lib.sh`: the submodule lines.
  - **Move tests:** a root `test:move` script runs `sui move test` for `jpy_coin`, `payment` and `stickers`, and `check` runs it.
  - **The API** drops `viem` and `@worldcoin/idkit-server`.
- **Docs:**
  - **AGENTS.MD:**
    - the architecture bullets for the API's AppDeps, `packages/line-auth`, `contracts/sui-sticker-contract` and `deploy/`;
    - Toolchain: the Sui CLI in place of Foundry;
    - the `db:migrate` line: a column added later goes last, and a new or rebuilt table's trigger is appended from `updatedAtTriggerStatements`;
    - the vocabulary in decision 1, once approved.
  - **New READMEs:** `contracts/sui-sticker-contract/README.md` and `packages/line-auth/README.md`.
  - **Updated:** `deploy/README.md`, DESIGN.md and PRODUCT.md, covering the address papers, purchases, chain facts, the Ethereum mark and "Sealed on-chain".
  - **Deleted:** `docs/review/2026-09-28-backend-code-review.md`. Its open items end with the wipe; OWNER-1, the greeting, is listed under ad0ll's tasks above.

---

## Lanes

At most six run at once.

**Every lane:**
- Works in its own worktree (`git switch -c <lane> <tip of chore/fresh-start>`).
- Until Task 11 lands, initializes the Foundry submodules before `pnpm check`, per `packages/sticker-chain/README.md`'s Commands.
- Before reporting, runs the tests its change covers and `pnpm check`.
- Returns its findings as text and marks its tasks here.

**The waves:**
- **Wave A:**
  - Lane A: Tasks 1–2.
  - Lane B: Tasks 3–5.
  - Lane C: Tasks 6–7. It starts from Lane B's first commit: the opt-in route and Person's `nsfwOptIn`.
  - Lane D: Task 8.
- **Wave B**, once Lane B has merged:
  - Lane E: Task 9.
  - Lane F: Task 10. It starts from Lane E's first commit: the shapes and route contracts.
  - Lane G: Task 11, after Lane E merges.
- **Then me:** Tasks 12–17.

### Task 0: Hold (me)

- [x] CronDelete `d64035b4` (2026-10-03).
- [ ] Tell every other session, with ListAgents then SendMessage:
  - don't deploy main until the window ends;
  - at the merge the migrations collapse, so delete local databases and regenerate any branch migration on top of the baseline;
  - `sticker-chain` becomes `line-auth`.

### Task 1: The Move package (Lane A)

- [ ] Copy the draft to `contracts/sui-sticker-contract/stickers/`, apply the code above, and add the tests listed.
- [ ] `sui move test --path contracts/sui-sticker-contract/stickers` passes. Make one test red by editing what it guards, such as dropping `assert_server` from `claim`, then restore it.
- [ ] Write `contracts/sui-sticker-contract/README.md`: what each module does, how to publish, and where the IDs go.
- [ ] Commit: `feat(contracts): stickers and gifts on Sui`

### Task 2: The publish script (Lane A)

- [ ] Write `deploy/publish-sui.mjs` as specified. Simulation is the default.
- [ ] Run it in simulation against testnet with a throwaway deployer key: it builds, and prints the cost.
- [ ] Commit: `feat(deploy): publish the stickers package on Sui`

### Task 3: ENS out of the API (Lane B)

- [ ] Delete what "ENS" lists for the API and `packages/sticker-chain/src`, including `stickerChain.ts`'s naming writer and `contractReads`. The rest of `stickerChain.ts` waits for Task 9.
- [ ] Drop `ens_label`, `ens_named_at` (users) and `stickers.ens_named_at` from the schema, with the fixtures and tests that name them.
- [ ] `pnpm --filter @drawing-app/api test` and `pnpm --filter @drawing-app/db test` pass, except `migrate.test.ts`, which waits for Task 12.
- [ ] Commit: `refactor: ENS goes`

### Task 4: World ID out, the NSFW opt-in in, API side (Lane B)

- [ ] First commit: the opt-in route, `users.nsfw_opted_in_at`, Person's `nsfwOptIn` and Me without `ageVerifiedAt`. Push it to `chore/fresh-start` so Lane C can start.
- [ ] Then the rest of World ID's API list, with the fixtures: `{ nsfwOptedInAt: … }` and `nsfw_not_opted_in`.
- [ ] Commit: `refactor: World ID goes, and NSFW is an opt-in`

### Task 5: Older data out of the API and schema (Lane B)

- [ ] The items under "Older data" for the API and DB.
- [ ] The changed-table edits that aren't about chains: the `ticket_uses` key, defaults, column order, `stickers_veiled`.
- [ ] `insertTicketUse`.
- [ ] Commit: `refactor: drop what only older rows needed`

### Task 6: ENS and World ID out of the app, and the opt-in switch (Lane C)

- [ ] The app parts of "ENS" and "World ID → the NSFW opt-in", with the strings.
- [ ] `pnpm --filter frontend test` and `typecheck` pass.
- [ ] Commit: `feat(frontend): Show 18+ stickers in Settings; ENS and World ID go`

### Task 7: Older data out of the app (Lane C)

- [ ] The app items under "Older data", including the Shop's list and the per-account board answer.
- [ ] Commit: `refactor(frontend): drop what only older data needed`

### Task 8: Deploy scripts and env (Lane D)

- [ ] `install-chain-env.mjs` and its test, `deploy-api.sh`, `deploy.sh`'s exports, `drawing-api.env` (the IDs stay blank until Task 14), the `.env.example` files, `drawing-api.service`'s comment, and `serve.py`.
- [ ] Commit: `chore(deploy): Sui settings, and the box's chain.env holds only what the API reads`

### Task 9: The API on Sui (Lane E)

- [ ] **Contracts first**: in `shapes.ts`, the two transaction shapes; the routes' bodies and answers (handlers may answer 501 until their step); the codes in `errors.ts`; the AppDeps types; the schema's chain changes and `sui_transactions`. Commit and push to `chore/fresh-start` for Lane F.
- [ ] Build the services:
  - `services/gasStation.ts`: fetch, zod, `AbortSignal.timeout`, one retry for `unavailable`;
  - `services/suiChain.ts`: the builders against `@mysten/sui` 2.31, `signAsServer`, `submit`, `outcomeOf` with `readLanded`, `readGift` (the BCS of `Gift`, with `GiftStatus` as an enum), `stickerObjectId` with `deriveObjectID`, and `check`;
  - `services/privySuiWallets.ts`, cached in `users.sui_address`.

  These replace `stickerChain.ts`, `privySmartWallets.ts`, the payment-events code in `jpycPayments.ts`, and their tests.
- [ ] Write `sui/oneAtATime.ts` and `sui/transactions.ts`, with tests against the fakes.
- [ ] Rewrite the flows as specified: Sealing → mint and the catch-up, Packaging and deposit, take-out, Receiving, the expiry sweep, purchases and their sweep, the boot check.
- [ ] Update the infrastructure:
  - `server.ts`: env and deps;
  - `diagnostics.ts`: Sui addresses and object IDs are `0x` and 64 hex digits, and transaction hashes go;
  - `testing/fakes.ts`: a fake Sui chain and gas station that record what they built and settle on command;
  - `testing/privy.ts`: a Sui wallet fixture.
- [ ] **The chain test**, `apps/api/src/routes/sui.chain.test.ts`, replaces `stickers.chain.test.ts`:
  1. It starts `sui start --with-faucet --force-regenesis` (`testing/localnet.ts`).
  2. It publishes `jpy_coin`, `payment` and `stickers` from a faucet-funded key.
  3. Through the REST API, it runs: seal, give, receive, a take-out, an expiry return (with a short expiry), and a payment.
  4. It uses `testing/localSponsor.ts`, a gas station whose sponsor is a faucet-funded key that signs as gas owner, so the two-signature path runs as it will with Shinami.

  It also checks `stickerObjectId` against the chain. If `sui start` is too slow for every `pnpm check`, it runs under `pnpm test:chain`, and Task 14 runs it.
- [ ] Delete `viem` from the API.
- [ ] Commit, one per step: `feat(api): …`

### Task 10: The app on Sui (Lane F)

- [ ] Everything under "The app", with the tests the frontend report lists:
  - delete `giftTransactions.test.ts`, `smartWallet.test.ts`, `SponsorshipCheck.test.ts`, `checksumAddress.test.ts` and `unaddedPurchases.test.ts`;
  - rewrite `giftBackend.test.ts`, `ticketCards.test.tsx`'s checkout block, `ShopScreen.test.tsx`, `App.test.tsx`, `AddressPapers.test.tsx`, `AddressDialog.test.tsx` and `MakeSuiWallet.test.tsx`.
- [ ] **Strings:**
  - delete the Ethereum, sponsorship-check, unadded-purchase, not-added, refused, `noNetworkFee`, `rejected`, `offline` and `transferProblem` strings (all but `no_link`), and `preparing.slow.confirming`;
  - reword the SUI fee sentence out of `checkout.address.how`, and the board address seal chip;
  - add the new error codes. Japanese follows `apps/frontend/src/i18n/glossary.md`.
- [ ] Commit: `feat(frontend): sign sponsored Sui transactions; the Ethereum wallets go`

### Task 11: The toolchain and `line-auth` (Lane G)

- [ ] Everything under "Toolchain", once nothing imports the chain parts of `sticker-chain`.
- [ ] `pnpm install`, then `pnpm check`, then `pnpm knip`: nothing is left unused.
- [ ] Commit: `chore: Foundry goes; sticker-chain becomes line-auth`

### Task 12: Collapse the migrations (me)

- [ ] Check that every schema edit is in, and nothing is uncommitted.
- [ ] `rm -rf packages/db/drizzle`, then `pnpm --filter @drawing-app/db exec drizzle-kit generate --name=baseline`. Read its output: it exits 0 even when it fails.
- [ ] Append the triggers:

```sh
(cd packages/db && node --input-type=module -e "import { appendFileSync } from 'node:fs'; import { allTables } from './src/schema/index.ts'; import { updatedAtTriggerStatements } from './src/schema/updatedAtTriggers.ts'; appendFileSync('drizzle/0000_baseline.sql', '--> statement-breakpoint\n' + updatedAtTriggerStatements(allTables).join('\n--> statement-breakpoint\n') + '\n');")
```

- [ ] `pnpm --filter @drawing-app/db test` passes, including `migrate.test.ts`.
- [ ] Commit: `chore(db): one baseline migration for the fresh start`

### Task 13: Docs (me, or a lane)

- [ ] Everything under "Docs".
- [ ] Run `rg -n -i 'sepolia|viem|wagmi|forge|anvil|foundry|ens\b|croquis-app\.eth|world.?id|idkit|age.?verif|ageStatus|adults_only|smart.?wallet|smartAccount|pimlico|token_?id|keccak|escrowTransfer|unaddedPurchase' AGENTS.MD DESIGN.md PRODUCT.md docs deploy apps packages contracts --glob '!**/node_modules/**'`, first against a known hit, and fix what's left.
- [ ] Commit: `docs: Croquis on Sui`

### Task 14: Check, testnet, merge (me)

- [ ] **Checks:**
  - `pnpm check:full` passes, plus `pnpm test:chain` if Task 9 split it off;
  - one reviewer subagent reviews `git diff main...chore/fresh-start`, then I fix what it confirms.
- [ ] **Keys and publishing:**
  - Generate `SUI_DEPLOYER_PRIVATE_KEY` and `SUI_SERVER_PRIVATE_KEY` (`sui keytool generate ed25519`, then `export` to suiprivkey). Copy `SHINAMI_ACCESS_KEY` from horror-tube's `.env` into the main checkout's `deploy/.env`. Print only addresses.
  - Simulate `deploy/publish-sui.mjs`. If Shinami won't sponsor a Publish, send the simulated cost plus half from horror-tube's admin key to the deployer.
  - Run with `--publish`, then put the printed IDs in `deploy/drawing-api.env` and `apps/api/.env.example`.
- [ ] **The testnet smoke run**, a one-shot `apps/api/scripts/suiSmoke.ts`, deleted after use. It drives the real `suiChain`, `gasStation` and `sui/transactions.ts` against testnet, with throwaway person keys standing in for Privy:
  - mint, deposit, claim;
  - a second deposit, then take it out;
  - a gift with a two-minute expiry, then return it;
  - a payment, from a person key funded through `jpy_coin::faucet`.

  Each transaction shows on https://suiscan.xyz/testnet.
- [ ] **The dev check:** `pnpm dev` in mock mode under LIFF Mock, in two windows (`?as=a`, `?as=b`), in Playwright WebKit and Chromium:
  - seal, then seal an 18+ sticker once a has opted in;
  - b, opted out, sees it blurred and is refused;
  - b opts in and receives it;
  - give, receive, Gratitude, the replay and the timelapse.
- [ ] **Squash and merge:**
  - squash into a few commits with no AI attribution, and check them with `git log --format=%B`;
  - from the main checkout, in one command: fetch; check that main gained no migration; merge; push;
  - delete the local databases listed in Facts.

### Task 15: The window (me)

- [ ] Stop the API:

```sh
( set -a; . "$MAIN/deploy/.env"; set +a; ssh "$DEPLOY_TARGET" sudo systemctl stop drawing-api )
```

- [ ] Unlink every chat menu. Do this while the API is stopped, or it would unlink people signing in to the new one. Secrets go on stdin:

```sh
( set -a; . "$MAIN/deploy/.env"; set +a
  TOKEN="$(printf '%s' "$LINE_MESSAGING_CHANNEL_SECRET" | curl -sS --fail-with-body https://api.line.me/oauth2/v3/token \
    --data-urlencode grant_type=client_credentials --data-urlencode "client_id=$LINE_MESSAGING_CHANNEL_ID" \
    --data-urlencode client_secret@- | jq -r '.access_token // empty')"
  [ -n "$TOKEN" ] || { echo "no token" >&2; exit 1; }
  printf 'Authorization: Bearer %s\n' "$TOKEN" | curl -sS -D - --fail-with-body -H @- -H 'Content-Type: application/json' \
    --data '{"operations":[{"type":"unlinkAll"}],"resumeRequestKey":"fresh-start-sui"}' \
    https://api.line.me/v2/bot/richmenu/batch | grep -i '^x-line-request-id' )
```

  Poll `GET https://api.line.me/v2/bot/richmenu/progress/batch?requestId=<id>` with the same header until `phase` is `succeeded`.
- [ ] Wipe:

```sh
( set -a; . "$MAIN/deploy/.env"; set +a
  ssh "$DEPLOY_TARGET" 'systemctl is-active drawing-api; find /srv/drawing-api/data /srv/drawing-api/images -mindepth 1 -delete \
    && rm -f /srv/drawing-api/chain.env /srv/drawing-api/secrets.env.bak-20260926-104429 \
    && find /srv/drawing-api/data /srv/drawing-api/images -mindepth 1 | wc -l' )
```

  It prints `inactive`, then `0`.
- [ ] Deploy main from a clean checkout at main: `DEPLOY_ENV_FILE="$MAIN/deploy/.env" ./deploy/deploy.sh`. It writes a fresh `chain.env`, restarts the unit, and checks that `/api/me` answers `signed_out`.
- [ ] Check the boot log, `curl -s "https://sticker.195-201-8-147.sslip.io/api/logs?lines=300"`:
  - `chain.sui.checked` shows `serverMatches: true`, nothing missing, and the fund;
  - every job's swept line shows zero;
  - there are no failure lines.

  Then `sqlite3 -readonly …/drawing-app.db 'select count(*) from __drizzle_migrations'` prints `1`.

### Task 16: Verify in LINE (ad0ll's phone)

- [ ] ad0ll opens Croquis from the Official account's chat, signs in as a new account, picks a handle, and seals a sticker. Then check:
  - `sui.tx.succeeded` for its mint;
  - the object on Suiscan, with Display's name and image.
- [ ] ad0ll gives the sticker through LINE's friend picker; a second account receives it and plays the Mini-game. Then ad0ll takes out another gift.
- [ ] The opt-in:
  - ad0ll turns it on and seals an 18+ sticker;
  - the second account, opted out, sees it blurred and is refused;
  - it turns the opt-in on, and receives.
- [ ] A reserve ticket pack, after sending test JPYC to ad0ll's Sui address. It pays with no SUI in the account.

### Task 17: Cleanup (me)

- [ ] Tell the session that owns `~/.cache/drawing-app-shop-prices/lane.db` that it no longer boots.
- [ ] Remove the worktrees and branches; delete `~/.cache/drawing-app-fresh-start/` and this plan (commit on main).
- [ ] **Memory:**
  - `privy-line-auth`: smart wallets are gone; `MakeSuiWallet` makes the wallet at sign-in.
  - `gift-flow-tracing`: Sui escrow events and the `sui.tx.*` lines replace Sepolia's.
  - `product-decisions`: its veil line says opt-in rather than adult.
  - `subagent-worktrees`: Foundry's submodules are gone; the Sui CLI runs `test:move`.
- [ ] **The closing summary** names whatever is still open: Privy's dashboard, the World ID app, the greeting, and any decision still undecided.
