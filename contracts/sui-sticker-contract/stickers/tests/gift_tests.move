#[test_only]
module stickers::gift_tests;

use stickers::gift::{Self, Escrow, Gift};
use stickers::sticker::{Self, AdminCap, ServerConfig, Sticker, StickerRegistry};
use sui::clock::Clock;
use sui::test_scenario as ts;

const ADMIN: address = @0xA;
const SERVER: address = @0x5;
const GIVER: address = @0xB;
const RECEIVER: address = @0xC;

const EXPIRES_AT_MS: u64 = 1_000;

fun hash(byte: u8): vector<u8> { vector::tabulate!(32, |_| byte) }

/// Publishes the package and mints a sticker to GIVER; the next transaction is GIVER's.
fun setup(): ts::Scenario {
    let mut scenario = ts::begin(ADMIN);
    scenario.create_system_objects();
    sticker::init_for_testing(scenario.ctx());
    gift::init_for_testing(scenario.ctx());

    scenario.next_tx(ADMIN);
    let admin = scenario.take_from_sender<AdminCap>();
    let mut config = scenario.take_shared<ServerConfig>();
    admin.set_server(&mut config, SERVER);
    ts::return_shared(config);
    scenario.return_to_sender(admin);

    scenario.next_tx(SERVER);
    let config = scenario.take_shared<ServerConfig>();
    let mut registry = scenario.take_shared<StickerRegistry>();
    let sticker = b"sticker-1".to_string();
    let image = b"sticker.png".to_string();
    config.mint(&mut registry, sticker, 1, GIVER, hash(1), 64, 64, false, image, scenario.ctx());
    ts::return_shared(registry);
    ts::return_shared(config);
    scenario.next_tx(GIVER);
    scenario
}

/// Sets the clock, then starts the sender's next transaction, where the clock can be taken again.
fun set_clock(scenario: &mut ts::Scenario, ms: u64) {
    let mut clock = scenario.take_shared<Clock>();
    clock.set_for_testing(ms);
    ts::return_shared(clock);
    let sender = scenario.ctx().sender();
    scenario.next_tx(sender);
}

/// GIVER deposits their sticker as gift `id`; returns the gift's object ID.
fun deposit(scenario: &mut ts::Scenario, id: u8): ID {
    let mut escrow = scenario.take_shared<Escrow>();
    let clock = scenario.take_shared<Clock>();
    let sticker = scenario.take_from_address<Sticker>(GIVER);
    escrow.deposit(sticker, hash(id), hash(100 + id), EXPIRES_AT_MS, &clock, scenario.ctx());
    let gift = gift::gift_address(object::id(&escrow), hash(id)).to_id();
    ts::return_shared(clock);
    ts::return_shared(escrow);
    scenario.next_tx(GIVER);
    gift
}

/// Runs `$act` on gift `$gift` with the server config and the clock, sent by `$sender`.
macro fun sent_by(
    $scenario: &mut ts::Scenario,
    $sender: address,
    $gift: ID,
    $act: |&ServerConfig, &mut Gift, &Clock, &TxContext|,
) {
    let scenario = $scenario;
    scenario.next_tx($sender);
    let config = scenario.take_shared<ServerConfig>();
    let mut gift = scenario.take_shared_by_id<Gift>($gift);
    let clock = scenario.take_shared<Clock>();
    $act(&config, &mut gift, &clock, scenario.ctx());
    ts::return_shared(clock);
    ts::return_shared(gift);
    ts::return_shared(config);
    scenario.next_tx($sender);
}

fun take_out(scenario: &mut ts::Scenario, gift: ID, sender: address) {
    scenario.next_tx(sender);
    let mut gift = scenario.take_shared_by_id<Gift>(gift);
    gift.take_out(scenario.ctx());
    ts::return_shared(gift);
    scenario.next_tx(sender);
}

fun holds_sticker(owner: address): bool {
    ts::has_most_recent_for_address<Sticker>(owner)
}

#[test]
fun the_server_claims_a_gift_for_its_receiver() {
    let mut scenario = setup();
    let gift = deposit(&mut scenario, 1);
    assert!(!holds_sticker(GIVER));

    sent_by!(&mut scenario, SERVER, gift, |config, gift, clock, ctx| gift::claim(config, gift, RECEIVER, clock, ctx));

    assert!(holds_sticker(RECEIVER));
    let gift = scenario.take_shared_by_id<Gift>(gift);
    assert!(gift.is_claimed() && gift.recipient() == option::some(RECEIVER));
    assert!(gift.sender() == GIVER && gift.claim_commitment() == hash(101));
    ts::return_shared(gift);
    scenario.end();
}

#[test]
fun the_giver_takes_a_gift_out_even_after_it_expires() {
    let mut scenario = setup();
    let gift = deposit(&mut scenario, 1);
    set_clock(&mut scenario, EXPIRES_AT_MS + 1);

    take_out(&mut scenario, gift, GIVER);

    assert!(holds_sticker(GIVER));
    let gift = scenario.take_shared_by_id<Gift>(gift);
    assert!(gift.is_taken_out());
    ts::return_shared(gift);
    scenario.end();
}

#[test, expected_failure(abort_code = gift::ENotGiftSender)]
fun only_the_giver_takes_a_gift_out() {
    let mut scenario = setup();
    let gift = deposit(&mut scenario, 1);
    take_out(&mut scenario, gift, RECEIVER);
    abort
}

#[test, expected_failure(abort_code = sticker::ENotServer)]
fun only_the_server_claims() {
    let mut scenario = setup();
    let gift = deposit(&mut scenario, 1);
    sent_by!(&mut scenario, RECEIVER, gift, |config, gift, clock, ctx| gift::claim(config, gift, RECEIVER, clock, ctx));
    abort
}

#[test, expected_failure(abort_code = gift::EGiftExpired)]
fun an_expired_gift_cant_be_claimed() {
    let mut scenario = setup();
    let gift = deposit(&mut scenario, 1);
    set_clock(&mut scenario, EXPIRES_AT_MS + 1);
    sent_by!(&mut scenario, SERVER, gift, |config, gift, clock, ctx| gift::claim(config, gift, RECEIVER, clock, ctx));
    abort
}

#[test]
fun the_server_returns_an_expired_gift_to_its_giver() {
    let mut scenario = setup();
    let gift = deposit(&mut scenario, 1);
    set_clock(&mut scenario, EXPIRES_AT_MS + 1);

    sent_by!(&mut scenario, SERVER, gift, |config, gift, clock, ctx| gift::return_expired(config, gift, clock, ctx));

    assert!(holds_sticker(GIVER));
    let gift = scenario.take_shared_by_id<Gift>(gift);
    assert!(gift.is_expired_returned());
    ts::return_shared(gift);
    scenario.end();
}

#[test, expected_failure(abort_code = gift::EGiftNotExpired)]
fun a_gift_is_returned_only_after_it_expires() {
    let mut scenario = setup();
    let gift = deposit(&mut scenario, 1);
    set_clock(&mut scenario, EXPIRES_AT_MS);
    sent_by!(&mut scenario, SERVER, gift, |config, gift, clock, ctx| gift::return_expired(config, gift, clock, ctx));
    abort
}

#[test, expected_failure(abort_code = gift::EGiftNotPending)]
fun a_gift_taken_out_cant_be_claimed() {
    let mut scenario = setup();
    let gift = deposit(&mut scenario, 1);
    take_out(&mut scenario, gift, GIVER);
    sent_by!(&mut scenario, SERVER, gift, |config, gift, clock, ctx| gift::claim(config, gift, RECEIVER, clock, ctx));
    abort
}

#[test, expected_failure(abort_code = gift::EGiftExists)]
fun a_gift_id_is_used_once() {
    let mut scenario = setup();
    let gift = deposit(&mut scenario, 1);
    take_out(&mut scenario, gift, GIVER);
    deposit(&mut scenario, 1);
    abort
}

#[test, expected_failure(abort_code = gift::EInvalidGift)]
fun a_deposit_must_expire_later() {
    let mut scenario = setup();
    set_clock(&mut scenario, EXPIRES_AT_MS);
    deposit(&mut scenario, 1);
    abort
}
