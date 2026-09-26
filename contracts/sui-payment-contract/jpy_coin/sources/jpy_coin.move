/// Mock Japanese Yen stablecoin (JPYC) for testing and hackathon use.
/// NOT a real stablecoin: there is no collateral or peg enforcement.
module jpy_coin::jpy_coin;

use sui::coin::{Self, Coin, TreasuryCap};
use sui::coin_registry;

/// 1 JPYC = 1_000_000 base units.
const DECIMALS: u8 = 6;
/// Max amount (in base units) the public faucet hands out per call: 100,000 JPYC.
const FAUCET_LIMIT: u64 = 100_000_000_000;

const EFaucetLimitExceeded: u64 = 0;
const EZeroAmount: u64 = 1;

/// One-time witness for the currency.
public struct JPY_COIN has drop {}

/// Shared object holding the TreasuryCap so anyone can use the faucet.
public struct Treasury has key {
    id: UID,
    cap: TreasuryCap<JPY_COIN>,
}

/// Grants unrestricted minting.
public struct AdminCap has key, store {
    id: UID,
}

fun init(otw: JPY_COIN, ctx: &mut TxContext) {
    let (builder, cap) = coin_registry::new_currency_with_otw(
        otw,
        DECIMALS,
        b"JPYC".to_string(),
        b"Mock JPY Coin".to_string(),
        b"A mock Japanese Yen stablecoin for testing. No real value.".to_string(),
        b"".to_string(),
        ctx,
    );
    let metadata_cap = builder.finalize(ctx);

    transfer::public_transfer(metadata_cap, ctx.sender());
    transfer::public_transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
    transfer::share_object(Treasury { id: object::new(ctx), cap });
}

/// Anyone can mint up to FAUCET_LIMIT base units per call, sent to the caller.
public fun faucet(treasury: &mut Treasury, amount: u64, ctx: &mut TxContext) {
    assert!(amount > 0, EZeroAmount);
    assert!(amount <= FAUCET_LIMIT, EFaucetLimitExceeded);
    coin::mint_and_transfer(&mut treasury.cap, amount, ctx.sender(), ctx);
}

/// Admin mint with no limit.
public fun mint(
    _: &AdminCap,
    treasury: &mut Treasury,
    amount: u64,
    ctx: &mut TxContext,
): Coin<JPY_COIN> {
    assert!(amount > 0, EZeroAmount);
    coin::mint(&mut treasury.cap, amount, ctx)
}

/// Admin mint straight to a recipient.
public fun mint_to(
    admin: &AdminCap,
    treasury: &mut Treasury,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    transfer::public_transfer(mint(admin, treasury, amount, ctx), recipient);
}

/// Anyone can burn their own coins.
public fun burn(treasury: &mut Treasury, coin: Coin<JPY_COIN>): u64 {
    coin::burn(&mut treasury.cap, coin)
}

public fun total_supply(treasury: &Treasury): u64 {
    coin::total_supply(&treasury.cap)
}

public fun decimals(): u8 { DECIMALS }

public fun faucet_limit(): u64 { FAUCET_LIMIT }

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(JPY_COIN {}, ctx);
}
