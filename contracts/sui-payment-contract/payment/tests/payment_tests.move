#[test_only]
module payment::payment_tests;

use jpy_coin::jpy_coin::{Self, Treasury, JPY_COIN};
use payment::payment::{Self, Vault, OwnerCap};
use sui::coin::Coin;
use sui::test_scenario as ts;

const OWNER: address = @0xA;
const USER: address = @0xB;

/// Deploys both packages and gives USER 1,000 JPYC.
fun setup(): ts::Scenario {
    let mut scenario = ts::begin(OWNER);
    jpy_coin::init_for_testing(scenario.ctx());
    payment::init_for_testing(scenario.ctx());

    scenario.next_tx(USER);
    let mut treasury = scenario.take_shared<Treasury>();
    jpy_coin::faucet(&mut treasury, 1_000_000_000, scenario.ctx());
    ts::return_shared(treasury);
    scenario.next_tx(USER);
    scenario
}

#[test]
fun test_pay_and_withdraw() {
    let mut scenario = setup();

    let mut vault = scenario.take_shared<Vault>();
    let mut coin = scenario.take_from_sender<Coin<JPY_COIN>>();
    payment::pay(&mut vault, &mut coin, 300_000_000, b"order-1", scenario.ctx());
    assert!(coin.value() == 700_000_000);
    assert!(payment::balance(&vault) == 300_000_000);
    scenario.return_to_sender(coin);
    ts::return_shared(vault);

    scenario.next_tx(OWNER);
    let mut vault = scenario.take_shared<Vault>();
    let cap = scenario.take_from_sender<OwnerCap>();
    payment::withdraw(&cap, &mut vault, 300_000_000, OWNER, scenario.ctx());
    assert!(payment::balance(&vault) == 0);
    scenario.return_to_sender(cap);
    ts::return_shared(vault);

    scenario.next_tx(OWNER);
    let received = scenario.take_from_sender<Coin<JPY_COIN>>();
    assert!(received.value() == 300_000_000);
    scenario.return_to_sender(received);

    scenario.end();
}

#[test, expected_failure(abort_code = payment::EInsufficientFunds)]
fun test_pay_more_than_coin() {
    let mut scenario = setup();
    let mut vault = scenario.take_shared<Vault>();
    let mut coin = scenario.take_from_sender<Coin<JPY_COIN>>();
    payment::pay(&mut vault, &mut coin, 1_000_000_001, b"", scenario.ctx());
    abort
}

#[test, expected_failure(abort_code = payment::EZeroAmount)]
fun test_pay_zero() {
    let mut scenario = setup();
    let mut vault = scenario.take_shared<Vault>();
    let mut coin = scenario.take_from_sender<Coin<JPY_COIN>>();
    payment::pay(&mut vault, &mut coin, 0, b"", scenario.ctx());
    abort
}
