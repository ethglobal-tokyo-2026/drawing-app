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
