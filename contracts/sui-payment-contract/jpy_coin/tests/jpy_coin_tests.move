#[test_only]
module jpy_coin::jpy_coin_tests;

use jpy_coin::jpy_coin::{Self, Treasury, AdminCap, JPY_COIN};
use sui::coin::Coin;
use sui::test_scenario as ts;

const ADMIN: address = @0xA;
const USER: address = @0xB;

fun setup(): ts::Scenario {
    let mut scenario = ts::begin(ADMIN);
    jpy_coin::init_for_testing(scenario.ctx());
    scenario
}

#[test]
fun test_faucet_and_burn() {
    let mut scenario = setup();

    scenario.next_tx(USER);
    let mut treasury = scenario.take_shared<Treasury>();
    jpy_coin::faucet(&mut treasury, 1_000_000_000, scenario.ctx());
    ts::return_shared(treasury);

    scenario.next_tx(USER);
    let mut treasury = scenario.take_shared<Treasury>();
    let coin = scenario.take_from_sender<Coin<JPY_COIN>>();
    assert!(coin.value() == 1_000_000_000);
    assert!(jpy_coin::total_supply(&treasury) == 1_000_000_000);
    jpy_coin::burn(&mut treasury, coin);
    assert!(jpy_coin::total_supply(&treasury) == 0);
    ts::return_shared(treasury);

    scenario.end();
}

#[test, expected_failure(abort_code = jpy_coin::EFaucetLimitExceeded)]
fun test_faucet_over_limit() {
    let mut scenario = setup();
    scenario.next_tx(USER);
    let mut treasury = scenario.take_shared<Treasury>();
    jpy_coin::faucet(&mut treasury, jpy_coin::faucet_limit() + 1, scenario.ctx());
    ts::return_shared(treasury);
    scenario.end();
}

#[test]
fun test_admin_mint_to() {
    let mut scenario = setup();

    scenario.next_tx(ADMIN);
    let admin = scenario.take_from_sender<AdminCap>();
    let mut treasury = scenario.take_shared<Treasury>();
    jpy_coin::mint_to(&admin, &mut treasury, 1_000_000_000_000_000, USER, scenario.ctx());
    ts::return_shared(treasury);
    scenario.return_to_sender(admin);

    scenario.next_tx(USER);
    let coin = scenario.take_from_sender<Coin<JPY_COIN>>();
    assert!(coin.value() == 1_000_000_000_000_000);
    scenario.return_to_sender(coin);

    scenario.end();
}
