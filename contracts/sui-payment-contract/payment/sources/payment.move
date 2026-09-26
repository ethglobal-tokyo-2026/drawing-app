/// Accepts JPYC payments into a shared vault. The vault owner can withdraw.
module payment::payment;

use jpy_coin::jpy_coin::JPY_COIN;
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::event;

const EZeroAmount: u64 = 0;
const EInsufficientFunds: u64 = 1;
const EWrongVault: u64 = 2;

/// Shared object that collects payments.
public struct Vault has key {
    id: UID,
    balance: Balance<JPY_COIN>,
}

/// Lets the holder withdraw from the vault it was created with.
public struct OwnerCap has key, store {
    id: UID,
    vault_id: ID,
}

public struct PaymentReceived has copy, drop {
    vault_id: ID,
    payer: address,
    amount: u64,
    reference: vector<u8>,
}

public struct Withdrawn has copy, drop {
    vault_id: ID,
    amount: u64,
    recipient: address,
}

fun init(ctx: &mut TxContext) {
    let vault = Vault { id: object::new(ctx), balance: balance::zero() };
    let cap = OwnerCap { id: object::new(ctx), vault_id: object::id(&vault) };
    transfer::share_object(vault);
    transfer::public_transfer(cap, ctx.sender());
}

/// Takes exactly `amount` base units out of `coin` and deposits it into the vault.
/// Any remainder stays in the caller's coin. `reference` is an arbitrary
/// payer-supplied tag (e.g. an order id) echoed in the event.
public fun pay(
    vault: &mut Vault,
    coin: &mut Coin<JPY_COIN>,
    amount: u64,
    reference: vector<u8>,
    ctx: &TxContext,
) {
    assert!(amount > 0, EZeroAmount);
    assert!(coin.value() >= amount, EInsufficientFunds);
    vault.balance.join(coin.balance_mut().split(amount));
    event::emit(PaymentReceived {
        vault_id: object::id(vault),
        payer: ctx.sender(),
        amount,
        reference,
    });
}

/// Withdraws `amount` base units from the vault to `recipient`.
public fun withdraw(
    cap: &OwnerCap,
    vault: &mut Vault,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    assert!(cap.vault_id == object::id(vault), EWrongVault);
    assert!(amount > 0, EZeroAmount);
    assert!(vault.balance.value() >= amount, EInsufficientFunds);
    transfer::public_transfer(coin::take(&mut vault.balance, amount, ctx), recipient);
    event::emit(Withdrawn { vault_id: object::id(vault), amount, recipient });
}

public fun balance(vault: &Vault): u64 { vault.balance.value() }

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) { init(ctx) }
