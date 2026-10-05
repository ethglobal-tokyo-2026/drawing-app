/// One object per sealed sticker, minted by the server to its Original Artist.
module stickers::sticker;

use std::internal;
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
    /// The file name, under Display's image host, of the image anyone may see: an NSFW sticker's
    /// veiled image.
    image: String,
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
    image: String,
    ctx: &TxContext,
): ID {
    config.assert_server(ctx);
    assert!(!key.is_empty() && artist != @0x0 && !image.is_empty(), EInvalidSticker);
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
        image,
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

public fun image(sticker: &Sticker): String { sticker.image }

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }
