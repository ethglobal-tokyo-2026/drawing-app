#[test_only]
module stickers::sticker_tests;

use std::unit_test::destroy;
use stickers::sticker::{Self, AdminCap, Sticker, StickerRegistry};
use stickers::test_setup;
use sui::display_registry::{Self, Display};
use sui::test_scenario as ts;
use sui::vec_map;

const ARTIST: address = @0xA;
const STRANGER: address = @0xBAD;
const NEXT_SERVER: address = @0x5F;

#[test, expected_failure(abort_code = sticker::EAlreadyMinted)]
fun a_key_is_minted_once() {
    let mut scenario = test_setup::publish();
    test_setup::mint(&mut scenario, b"sticker-1", ARTIST);
    test_setup::mint(&mut scenario, b"sticker-1", ARTIST);
    abort
}

#[test, expected_failure(abort_code = sticker::ENotServer)]
fun only_the_server_mints() {
    let mut scenario = test_setup::publish();
    test_setup::mint_with(
        &mut scenario,
        STRANGER,
        b"sticker-1",
        ARTIST,
        test_setup::content_hash(),
        false,
        b"public.png",
    );
    abort
}

#[test]
fun mint_sends_the_sticker_to_its_artist_at_its_derived_address() {
    let mut scenario = test_setup::publish();
    let id = test_setup::mint(&mut scenario, b"sticker-1", ARTIST);

    scenario.next_tx(ARTIST);
    let registry = scenario.take_shared<StickerRegistry>();
    let derived = sticker::sticker_address(object::id(&registry), b"sticker-1".to_string());
    assert!(id == object::id_from_address(derived));
    assert!(registry.is_minted(b"sticker-1".to_string()));
    let sticker = scenario.take_from_sender_by_id<Sticker>(id);
    assert!(sticker.artist() == ARTIST);
    scenario.return_to_sender(sticker);
    ts::return_shared(registry);
    scenario.end();
}

#[test]
fun create_display_shares_the_fields() {
    let mut scenario = test_setup::publish();
    let names = vector[b"name".to_string(), b"image_url".to_string()];
    let values = vector[
        b"Sticker No.{number}".to_string(),
        b"https://images.example/{image}".to_string(),
    ];

    scenario.next_tx(test_setup::deployer());
    let admin = scenario.take_from_sender<AdminCap>();
    // The registry the framework shares at 0xd doesn't exist in a test scenario.
    let mut registry = display_registry::create_for_testing(scenario.ctx());
    let cap = sticker::create_display(&admin, &mut registry, names, values, scenario.ctx());
    transfer::public_transfer(cap, test_setup::deployer());
    scenario.return_to_sender(admin);
    destroy(registry);

    scenario.next_tx(test_setup::deployer());
    let display = scenario.take_shared<Display<Sticker>>();
    assert!(*display.fields() == vec_map::from_keys_values(names, values));
    ts::return_shared(display);
    scenario.end();
}

#[test, expected_failure(abort_code = sticker::EInvalidSticker)]
fun a_content_hash_must_be_32_bytes() {
    let mut scenario = test_setup::publish();
    let mut short_hash = test_setup::content_hash();
    short_hash.pop_back();
    test_setup::mint_with(
        &mut scenario,
        test_setup::server(),
        b"sticker-1",
        ARTIST,
        short_hash,
        false,
        b"public.png",
    );
    abort
}

#[test]
fun a_sticker_keeps_its_nsfw_mark_and_image() {
    let mut scenario = test_setup::publish();
    let id = test_setup::mint_with(
        &mut scenario,
        test_setup::server(),
        b"sticker-1",
        ARTIST,
        test_setup::content_hash(),
        true,
        b"veiled.png",
    );

    scenario.next_tx(ARTIST);
    let sticker = scenario.take_from_sender_by_id<Sticker>(id);
    assert!(sticker.nsfw());
    assert!(sticker.image() == b"veiled.png".to_string());
    scenario.return_to_sender(sticker);
    scenario.end();
}

#[test, expected_failure(abort_code = sticker::ENotServer)]
fun set_server_moves_the_server() {
    let mut scenario = test_setup::publish();
    test_setup::set_server(&mut scenario, NEXT_SERVER);
    // As the address publish named, which is no longer the server.
    test_setup::mint(&mut scenario, b"sticker-1", ARTIST);
    abort
}
