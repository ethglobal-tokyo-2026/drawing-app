#[test_only]
module stickers::gift_tests;

use std::hash;
use stickers::gift::{Self, Escrow, Gift};
use stickers::sticker::{ServerConfig, Sticker};
use stickers::test_setup;
use sui::clock::{Self, Clock};
use sui::test_scenario::{Self as ts, Scenario};

const GIVER: address = @0xA;
const RECEIVER: address = @0xB;
const STRANGER: address = @0xBAD;

/// The time each test starts at.
const NOW_MS: u64 = 1_000_000;
/// When each test's gift expires.
const EXPIRES_AT_MS: u64 = 2_000_000;

/// The gift every test packages: 32 random bytes in Packaging.
fun gift_id(): vector<u8> { hash::sha2_256(b"gift") }

/// The package published, the giver holding a sticker, and a clock at NOW_MS.
fun begin(): (Scenario, Clock) {
    let mut scenario = test_setup::publish();
    test_setup::mint(&mut scenario, b"sticker-1", GIVER);
    let mut clock = clock::create_for_testing(scenario.ctx());
    clock.set_for_testing(NOW_MS);
    (scenario, clock)
}

fun end(scenario: Scenario, clock: Clock) {
    clock.destroy_for_testing();
    scenario.end();
}

/// The giver deposits the sticker they got last as the gift.
fun deposit(scenario: &mut Scenario, clock: &Clock, expires_at_ms: u64) {
    scenario.next_tx(GIVER);
    let mut escrow = scenario.take_shared<Escrow>();
    let sticker = scenario.take_from_sender<Sticker>();
    let claim_commitment = hash::sha2_256(b"gift claim token");
    gift::deposit(
        &mut escrow,
        sticker,
        gift_id(),
        claim_commitment,
        expires_at_ms,
        clock,
        scenario.ctx(),
    );
    ts::return_shared(escrow);
}

/// The gift, found at the address its gift id derives in the escrow.
fun take_gift(scenario: &mut Scenario): Gift {
    let escrow = scenario.take_shared<Escrow>();
    let derived = gift::gift_address(object::id(&escrow), gift_id());
    ts::return_shared(escrow);
    scenario.take_shared_by_id<Gift>(object::id_from_address(derived))
}

/// `sender` claims the gift for the receiver.
fun claim(scenario: &mut Scenario, clock: &Clock, sender: address) {
    scenario.next_tx(sender);
    let config = scenario.take_shared<ServerConfig>();
    let mut gift = take_gift(scenario);
    gift::claim(&config, &mut gift, RECEIVER, clock, scenario.ctx());
    ts::return_shared(gift);
    ts::return_shared(config);
}

/// `sender` takes the gift out.
fun take_out(scenario: &mut Scenario, sender: address) {
    scenario.next_tx(sender);
    let mut gift = take_gift(scenario);
    gift.take_out(scenario.ctx());
    ts::return_shared(gift);
}

/// `sender` returns the gift to its giver.
fun return_expired(scenario: &mut Scenario, clock: &Clock, sender: address) {
    scenario.next_tx(sender);
    let config = scenario.take_shared<ServerConfig>();
    let mut gift = take_gift(scenario);
    gift::return_expired(&config, &mut gift, clock, scenario.ctx());
    ts::return_shared(gift);
    ts::return_shared(config);
}

/// The gift, in a new transaction as `owner`, once `owner` is shown to hold its sticker.
fun gift_with_sticker_at(scenario: &mut Scenario, owner: address): Gift {
    scenario.next_tx(owner);
    let gift = take_gift(scenario);
    let sticker = scenario.take_from_sender_by_id<Sticker>(gift.sticker());
    scenario.return_to_sender(sticker);
    gift
}

#[test, expected_failure(abort_code = gift::EInvalidGift)]
fun a_deposit_must_expire_later() {
    let (mut scenario, clock) = begin();
    deposit(&mut scenario, &clock, NOW_MS);
    abort
}

#[test, expected_failure(abort_code = gift::EGiftExists)]
fun a_gift_id_is_used_once() {
    let (mut scenario, clock) = begin();
    test_setup::mint(&mut scenario, b"sticker-2", GIVER);
    deposit(&mut scenario, &clock, EXPIRES_AT_MS);
    deposit(&mut scenario, &clock, EXPIRES_AT_MS);
    abort
}

#[test]
fun the_server_claims_a_gift_for_its_receiver() {
    let (mut scenario, clock) = begin();
    deposit(&mut scenario, &clock, EXPIRES_AT_MS);
    claim(&mut scenario, &clock, test_setup::server());

    let gift = gift_with_sticker_at(&mut scenario, RECEIVER);
    assert!(gift.is_claimed());
    assert!(gift.recipient() == option::some(RECEIVER));
    ts::return_shared(gift);
    end(scenario, clock);
}

#[test, expected_failure(abort_code = stickers::sticker::ENotServer)]
fun only_the_server_claims() {
    let (mut scenario, clock) = begin();
    deposit(&mut scenario, &clock, EXPIRES_AT_MS);
    claim(&mut scenario, &clock, STRANGER);
    abort
}

#[test, expected_failure(abort_code = gift::EGiftExpired)]
fun an_expired_gift_cant_be_claimed() {
    let (mut scenario, mut clock) = begin();
    deposit(&mut scenario, &clock, EXPIRES_AT_MS);
    clock.set_for_testing(EXPIRES_AT_MS + 1);
    claim(&mut scenario, &clock, test_setup::server());
    abort
}

#[test, expected_failure(abort_code = gift::EGiftNotPending)]
fun a_gift_taken_out_cant_be_claimed() {
    let (mut scenario, clock) = begin();
    deposit(&mut scenario, &clock, EXPIRES_AT_MS);
    take_out(&mut scenario, GIVER);
    claim(&mut scenario, &clock, test_setup::server());
    abort
}

#[test, expected_failure(abort_code = gift::ENotGiftSender)]
fun only_the_giver_takes_a_gift_out() {
    let (mut scenario, clock) = begin();
    deposit(&mut scenario, &clock, EXPIRES_AT_MS);
    take_out(&mut scenario, STRANGER);
    abort
}

#[test]
fun the_giver_takes_a_gift_out_even_after_it_expires() {
    let (mut scenario, mut clock) = begin();
    deposit(&mut scenario, &clock, EXPIRES_AT_MS);
    clock.set_for_testing(EXPIRES_AT_MS + 1);
    take_out(&mut scenario, GIVER);

    let gift = gift_with_sticker_at(&mut scenario, GIVER);
    assert!(gift.is_taken_out());
    ts::return_shared(gift);
    end(scenario, clock);
}

#[test]
fun the_server_returns_an_expired_gift_to_its_giver() {
    let (mut scenario, mut clock) = begin();
    deposit(&mut scenario, &clock, EXPIRES_AT_MS);
    clock.set_for_testing(EXPIRES_AT_MS + 1);
    return_expired(&mut scenario, &clock, test_setup::server());

    let gift = gift_with_sticker_at(&mut scenario, GIVER);
    assert!(gift.is_expired_returned());
    ts::return_shared(gift);
    end(scenario, clock);
}

#[test, expected_failure(abort_code = gift::EGiftNotExpired)]
fun a_gift_is_returned_only_after_it_expires() {
    let (mut scenario, mut clock) = begin();
    deposit(&mut scenario, &clock, EXPIRES_AT_MS);
    // At the expiry itself the gift can still be claimed.
    clock.set_for_testing(EXPIRES_AT_MS);
    return_expired(&mut scenario, &clock, test_setup::server());
    abort
}
