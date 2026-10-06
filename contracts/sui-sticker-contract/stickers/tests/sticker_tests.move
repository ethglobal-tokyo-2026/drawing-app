#[test_only]
module stickers::sticker_tests;

use std::string::String;
use stickers::sticker::{Self, AdminCap, ServerConfig, Sticker, StickerRegistry};
use sui::display_registry::{Display, DisplayRegistry};
use sui::test_scenario as ts;

const ADMIN: address = @0xA;
const SERVER: address = @0x5;
const ARTIST: address = @0xB;

const IMAGE: vector<u8> = b"sticker.png";

fun hash(byte: u8): vector<u8> { vector::tabulate!(32, |_| byte) }

/// Publishes the package as ADMIN, whom `init` names as the server.
fun publish(): ts::Scenario {
    let mut scenario = ts::begin(ADMIN);
    scenario.create_system_objects();
    sticker::init_for_testing(scenario.ctx());
    scenario
}

/// ADMIN names `server` as the server.
fun name_server(scenario: &mut ts::Scenario, server: address) {
    scenario.next_tx(ADMIN);
    let admin = scenario.take_from_sender<AdminCap>();
    let mut config = scenario.take_shared<ServerConfig>();
    admin.set_server(&mut config, server);
    ts::return_shared(config);
    scenario.return_to_sender(admin);
}

/// Publishes the package and names SERVER as the server; the next transaction is SERVER's.
fun setup(): ts::Scenario {
    let mut scenario = publish();
    name_server(&mut scenario, SERVER);
    scenario.next_tx(SERVER);
    scenario
}

/// Mints `key` to ARTIST, sent by the current sender, and returns the sticker's ID; the next
/// transaction is ARTIST's.
fun mint_with(
    scenario: &mut ts::Scenario,
    key: String,
    content_hash: vector<u8>,
    nsfw: bool,
    image: String,
): ID {
    let config = scenario.take_shared<ServerConfig>();
    let mut registry = scenario.take_shared<StickerRegistry>();
    let id = config.mint(
        &mut registry,
        key,
        147,
        ARTIST,
        content_hash,
        640,
        480,
        nsfw,
        image,
        scenario.ctx(),
    );
    ts::return_shared(registry);
    ts::return_shared(config);
    scenario.next_tx(ARTIST);
    id
}

fun mint(scenario: &mut ts::Scenario, key: String): ID {
    mint_with(scenario, key, hash(1), false, IMAGE.to_string())
}

#[test]
fun mint_sends_the_sticker_to_its_artist_at_its_derived_address() {
    let mut scenario = setup();
    let registry = scenario.take_shared<StickerRegistry>();
    let registry_id = object::id(&registry);
    ts::return_shared(registry);
    scenario.next_tx(SERVER);
    let id = mint(&mut scenario, b"sticker-1".to_string());

    let sticker = scenario.take_from_sender<Sticker>();
    assert!(object::id(&sticker) == id);
    assert!(id.to_address() == sticker::sticker_address(registry_id, b"sticker-1".to_string()));
    assert!(sticker.artist() == ARTIST && sticker.number() == 147);
    assert!(sticker.content_hash() == hash(1));
    scenario.return_to_sender(sticker);
    scenario.end();
}

#[test]
fun a_sticker_keeps_its_nsfw_mark_and_image() {
    let mut scenario = setup();
    mint_with(&mut scenario, b"sticker-1".to_string(), hash(1), true, b"veiled.png".to_string());

    let sticker = scenario.take_from_sender<Sticker>();
    assert!(sticker.nsfw() && sticker.image() == b"veiled.png".to_string());
    scenario.return_to_sender(sticker);
    scenario.end();
}

#[test, expected_failure(abort_code = sticker::EAlreadyMinted)]
fun a_key_is_minted_once() {
    let mut scenario = setup();
    mint(&mut scenario, b"sticker-1".to_string());
    scenario.next_tx(SERVER);
    mint(&mut scenario, b"sticker-1".to_string());
    abort
}

#[test, expected_failure(abort_code = sticker::ENotServer)]
fun only_the_server_mints() {
    let mut scenario = setup();
    scenario.next_tx(ARTIST);
    mint(&mut scenario, b"sticker-1".to_string());
    abort
}

#[test, expected_failure(abort_code = sticker::ENotServer)]
fun set_server_moves_the_server() {
    let mut scenario = publish();
    scenario.next_tx(ADMIN);
    mint(&mut scenario, b"sticker-1".to_string());
    name_server(&mut scenario, SERVER);
    scenario.next_tx(ADMIN);
    mint(&mut scenario, b"sticker-2".to_string());
    abort
}

#[test, expected_failure(abort_code = sticker::EInvalidSticker)]
fun a_content_hash_must_be_32_bytes() {
    let mut scenario = setup();
    mint_with(&mut scenario, b"sticker-1".to_string(), b"short", false, IMAGE.to_string());
    abort
}

#[test]
fun create_display_shares_the_fields() {
    let mut scenario = setup();
    scenario.next_tx(ADMIN);
    let admin = scenario.take_from_sender<AdminCap>();
    let mut registry = scenario.take_shared<DisplayRegistry>();
    let cap = admin.create_display(
        &mut registry,
        vector[b"name".to_string(), b"image_url".to_string()],
        vector[b"Sticker No.{number}".to_string(), b"https://cdn.example/{image}".to_string()],
        scenario.ctx(),
    );
    transfer::public_transfer(cap, ADMIN);
    ts::return_shared(registry);
    scenario.return_to_sender(admin);

    scenario.next_tx(ADMIN);
    let display = scenario.take_shared<Display<Sticker>>();
    assert!(*display.fields().get(&b"name".to_string()) == b"Sticker No.{number}".to_string());
    ts::return_shared(display);
    scenario.end();
}
