# Sui Contracts

Move contracts for accepting JPY stablecoin payments on Sui, built for ETHGlobal Tokyo 2026.

| Package | Description |
| --- | --- |
| [`jpy_coin`](jpy_coin) | Mock JPY stablecoin (JPYC) with a public faucet. Test use only, no real value. |
| [`payment`](payment) | Shared vault that accepts JPYC payments and lets the owner withdraw. |

## jpy_coin

A mock yen stablecoin with 6 decimals (`1 JPYC = 1_000_000` base units). The `TreasuryCap` lives in a shared `Treasury` object so anyone can mint test funds.

| Function | Access | Description |
| --- | --- | --- |
| `faucet(treasury, amount)` | Anyone | Mints up to 100,000 JPYC per call to the caller. |
| `mint(admin, treasury, amount)` | `AdminCap` | Mints any amount and returns the coin. |
| `mint_to(admin, treasury, amount, recipient)` | `AdminCap` | Mints any amount to a recipient. |
| `burn(treasury, coin)` | Anyone | Burns a JPYC coin. |
| `total_supply(treasury)` | View | Current total supply. |

## payment

On publish, creates a shared `Vault` and sends an `OwnerCap` to the publisher.

| Function | Access | Description |
| --- | --- | --- |
| `pay(vault, coin, amount, reference)` | Anyone | Moves exactly `amount` from `coin` into the vault. `reference` is an arbitrary tag such as an order ID. |
| `withdraw(cap, vault, amount, recipient)` | `OwnerCap` | Sends `amount` from the vault to `recipient`. |
| `balance(vault)` | View | Current vault balance. |

Events:

- `PaymentReceived { vault_id, payer, amount, reference }`
- `Withdrawn { vault_id, amount, recipient }`

## Testnet deployment

| Object | ID |
| --- | --- |
| `jpy_coin` package | `0xf239f4711b8b6e5331a24174905e8412df01e6fe81abcdaa2613f5aaf35a6496` |
| JPYC type | `0xf239f4711b8b6e5331a24174905e8412df01e6fe81abcdaa2613f5aaf35a6496::jpy_coin::JPY_COIN` |
| `Treasury` (shared) | `0xfc78bec14ae3948a1a5a026abc458d46e1d958221c1ca006e9c5f2216e5afe43` |
| `payment` package | `0xce54032ee3ee017f6cc5bcb64393a246c2d1250717dc5c1963f6b4c578f70aa5` |
| `Vault` (shared) | `0x5198edbb873bc4d2f139c97be8c18784f997f92be784a715ec0239bf2295b97c` |

All object IDs, including the admin and owner capabilities, are in each package's `deployed.testnet.env`.

## Usage

Build and test:

```sh
cd jpy_coin && sui move test
cd ../payment && sui move test
```

Get test JPYC and make a payment:

```sh
source jpy_coin/deployed.testnet.env
source payment/deployed.testnet.env

# Mint 1,000 JPYC to yourself
sui client call --package $PKG --module jpy_coin --function faucet \
  --args $TREASURY 1000000000

# Pay 500 JPYC into the vault
sui client call --package $PAYMENT_PKG --module payment --function pay \
  --args $VAULT <JPYC_COIN_ID> 500000000 '"order-123"'
```

Withdraw as the vault owner:

```sh
sui client call --package $PAYMENT_PKG --module payment --function withdraw \
  --args $OWNER_CAP $VAULT 500000000 <RECIPIENT_ADDRESS>
```
