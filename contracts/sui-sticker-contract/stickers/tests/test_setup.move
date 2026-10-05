/// The package as the publish script leaves it, in a test scenario, and stickers minted the way
/// Sealing has the server mint them. Each helper runs its own transaction as the sender it names.
#[test_only]
module stickers::test_setup;

use std::hash;
use stickers::gift;
use stickers::sticker::{Self, AdminCap, ServerConfig, StickerRegistry};
use sui::test_scenario::{Self as ts, Scenario};

const DEPLOYER: address = @0xDE;
const SERVER: address = @0x5E;

const NUMBER: u64 = 147;
const WIDTH: u32 = 512;
const HEIGHT: u32 = 384;

public fun deployer(): address { DEPLOYER }

public fun server(): address { SERVER }

/// Publishes both modules as the deployer, then names the server.
public fun publish(): Scenario {
    let mut scenario = ts::begin(DEPLOYER);
    sticker::init_for_testing(scenario.ctx());
    gift::init_for_testing(scenario.ctx());
    set_server(&mut scenario, SERVER);
    scenario
}

/// The deployer names `server` in ServerConfig.
public fun set_server(scenario: &mut Scenario, server: address) {
    scenario.next_tx(DEPLOYER);
    let admin = scenario.take_from_sender<AdminCap>();
    let mut config = scenario.take_shared<ServerConfig>();
    sticker::set_server(&admin, &mut config, server);
    ts::return_shared(config);
    scenario.return_to_sender(admin);
}

/// A sha256, like a sticker PNG's.
public fun content_hash(): vector<u8> { hash::sha2_256(b"sticker.png") }

/// The server mints the sticker `key` to `artist`.
public fun mint(scenario: &mut Scenario, key: vector<u8>, artist: address): ID {
    mint_with(scenario, SERVER, key, artist, content_hash(), false, b"public.png")
}

/// `sender` mints the sticker `key` to `artist`, with the facts given.
public fun mint_with(
    scenario: &mut Scenario,
    sender: address,
    key: vector<u8>,
    artist: address,
    content_hash: vector<u8>,
    nsfw: bool,
    image: vector<u8>,
): ID {
    scenario.next_tx(sender);
    let config = scenario.take_shared<ServerConfig>();
    let mut registry = scenario.take_shared<StickerRegistry>();
    let id = sticker::mint(
        &config,
        &mut registry,
        key.to_string(),
        NUMBER,
        artist,
        content_hash,
        WIDTH,
        HEIGHT,
        nsfw,
        image.to_string(),
        scenario.ctx(),
    );
    ts::return_shared(registry);
    ts::return_shared(config);
    id
}
