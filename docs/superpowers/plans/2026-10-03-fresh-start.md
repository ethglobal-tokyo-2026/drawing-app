# Fresh Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Croquis restarts empty. The box's database and images go, and every Sepolia contract is deployed again, with croquis-app.eth pointed at the new names. The 15 migrations become one baseline, and the code that exists only for data from before a change, or from the device and mock era, goes.

**Architecture:**
- **Branch:** every code change lands on one branch, `chore/fresh-start`, which merges after `pnpm check:full`.
- **Window:** then comes one window on the box, in this order:
  1. stop `drawing-api`;
  2. fund the deployer;
  3. deploy the contracts from main;
  4. unlink the chat menus;
  5. empty `data/` and `images/`;
  6. deploy main with the new addresses.
- **Don't deploy main between the merge and the window.** The baseline makes the API exit on the old database.

**Tech Stack:** Drizzle on SQLite, Hono, React, Foundry on Sepolia (ENSv2), the LINE Messaging API, Sui GraphQL, systemd on the box.

---

## Decisions for ad0ll

1. **World ID.** By default World allows one verification per person per action. `croquis-age-18` gives a person the same nullifier every time, so anyone who verified before the wipe gets `max_verifications_reached` (https://docs.world.org/mini-apps/reference/errors, https://docs.world.org/world-id/reference/api).
   - **Recommended:** set the action to unlimited in World's Developer Portal. The server already limits each World ID to one live account.
   - **Otherwise:** testers verify with a new identity in World's simulator (we're on staging).
2. **Chat menus.** LINE keeps each person's chat menu link. Until they open the app, people's menus show ticket counts the wipe deleted, and those who never come back keep them.
   - **Recommended:** one `unlinkAll` batch in the window (Task 15). Everyone shows LINE's default menu until the app links theirs.
3. **Old Gift Messages.** After the wipe, their links answer `gift_not_found`, and the app says to open the gift again from the chat, which can't help.
   - **Recommended:** drop `deploy/serve.py`'s shim that serves the Gift Message picture under older builds' names. Old chat bubbles then show no picture.
4. **The Shop's "Your ticket purchases"** lists the payments the person's Sui wallet made. Privy keeps a returning person's wallet, so payments from before the wipe would show, with no tickets behind them.
   - **Recommended:** list only payments whose reference names the signed-in account (Task 11). That stays right for someone who deletes their account and signs up again.
5. **Favio and Aakash** lose their accounts and stickers along with everyone else's. Do you want to tell them before the window?
6. **When.** Any time except 00:00–01:00 JST (15:00–16:00 UTC). LINE allows 3 chat menu batch requests an hour, and the API's midnight batch uses the same allowance.

## Facts

- **Where commands run.** `$MAIN` is the main checkout's root, which holds the gitignored `deploy/.env`. Tasks 1–12 run in the `chore/fresh-start` worktree.
- **The box:** user `bawler`, with passwordless sudo. Empty these two folders, but never delete the folders themselves: `drawing-api.service`'s `ReadWritePaths` has no `-` prefix, so systemd won't start the unit without them.
  - `/srv/drawing-api/data/`: the database, in WAL mode, so `.db`, `-wal` and `-shm`.
  - `/srv/drawing-api/images/`: images, veils, and `<stickerId>.json` metadata.
  - `secrets.env.bak-20260926-104429` is a stale copy of the session secret: delete it.
  - Keep `secrets.env`. Old cookies name user ids that won't exist, so they get 401 `signed_out` and the app signs in again as a new person.
  - Keep `chain.env` (deploy-api.sh rewrites the four addresses), `line-menus.json`, and `/srv/sticker-auth/` (which holds only its signing key).
- **Deploy cost.** On 2026-10-03, the simulation came to 12,039,617 gas over 20 transactions, with "Estimated amount required: 0.0257 ETH" at twice the base fee.
  - The deployer, 0xf573a64BFF7c49BC39AFe038f691a61cd4bBFFf4, holds 0.0183 ETH.
  - The sealer, 0x65D34B4739DB814bbf410512e6CCCbc0A5c04eFA, holds 0.054 ETH.
- **Nothing to do** for anything the new database can't reach:
  - old Sui payments, whose references name old user ids (crypto-random UUIDs), so they can't credit new purchases;
  - phones' stores, which are keyed by user id. Old entries are never read and stay, as for any account switch on a shared phone;
  - old NFTs and names on the old contracts;
  - gifts in the old escrows.
- **People will notice:**
  - Each person's language follows LINE again until they choose one, since a new account has no choice yet.
  - A drawing in progress across the window is lost.
  - An old `/@label` link finds no one, or whoever takes that label.
- **Privy's paymaster.** If its policy lists contracts, Giving fails until the new StickerNFT and escrow are added in Privy's dashboard. The dev slip's sponsorship check sends to the wallet itself, so it can't tell; the first gift will (Task 16).
- **Local databases** built on the old migrations stop the API at start with "table … already exists":
  - `data/drawing-app.db*`;
  - `.claude/data/{foil,w7,gate-check}.db*`;
  - another session's `~/.cache/drawing-app-shop-prices/lane.db`.

## Order

1. Task 0.
2. Tasks 1–12 on `chore/fresh-start`. Every schema edit (Tasks 2, 3, 5, 6, 7) comes before Task 8's baseline.
3. Task 13: merge.
4. Tasks 14–15: one window.
5. Task 16: verify.
6. Task 17: cleanup.

---

### Task 0: Hold

- [ ] CronDelete `d64035b4`. It would switch the box to an abandoned escrow on 10-06.
- [ ] Tell every other session (ListAgents, then SendMessage):
  - Don't deploy main until the window ends.
  - After the merge, delete local databases built on the old migrations.
  - A migration made on a branch has to be regenerated on top of the baseline.

### Task 1: The deploy script deploys a whole set

**Files:** `packages/sticker-chain/script/DeployStickerContracts.s.sol`, `deploy/deploy-contracts.sh`, `packages/sticker-chain/src/croquis-names.ts:34-37`, `deploy/README.md:40-47`, `packages/sticker-chain/README.md:64`, `deploy/.env.example:17-18,28,35-36`

Why each part changes:
- `deploy/.env` sets `STICKER_NFT_ADDRESS`, and the script reuses that address, so it would keep the old NFT.
- It reads the parent label from the env, which makes a second copy of `CROQUIS_PARENT_NAME`.
- It deploys even when the deployer doesn't own the parent.
- It prints `KEY= 0x…`, which breaks `deploy/.env` when pasted.

- [ ] Replace the contract's NatSpec and `run()`. The ENSv2 constants stay as they are.

```solidity
/// @notice Deploys StickerNFT, the escrow and the names under croquis-app.eth on Ethereum Sepolia,
///         and points croquis-app.eth at the new registry and resolver. The deployer must own it.
contract DeployStickerContracts is Script, CroquisSetup {
    // (ENSv2 constants unchanged)

    /// @dev CROQUIS_PARENT_NAME's label in src/croquis-names.ts; the API's contract check compares them.
    string private constant PARENT_LABEL = "croquis-app";

    error ParentNameNotDeployers(address owner, address deployer);

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address relayer = vm.addr(vm.envUint("STICKER_SEALER_PRIVATE_KEY"));
        string[] memory gatewayUrls = new string[](1);
        gatewayUrls[0] = vm.envString("ENS_GATEWAY_URL");
        address gatewaySigner = vm.addr(vm.envUint("ENS_GATEWAY_PRIVATE_KEY"));
        EnsV2 memory ens = EnsV2(
            IVerifiableFactory(VERIFIABLE_FACTORY),
            USER_REGISTRY_IMPL,
            PERMISSIONED_RESOLVER_IMPL,
            IEnsRegistry(ETH_REGISTRY)
        );
        // Before broadcasting, so a wrong key costs no gas.
        address parentOwner = ens.ethRegistry.getOwner(uint256(keccak256(bytes(PARENT_LABEL))));
        if (parentOwner != deployer) revert ParentNameNotDeployers(parentOwner, deployer);

        vm.startBroadcast(deployerPrivateKey);
        StickerNFT sticker = new StickerNFT(deployer);
        if (relayer != deployer) sticker.grantRole(sticker.SEALER_ROLE(), relayer);
        Croquis memory c = _deployCroquis(
            ens, PARENT_LABEL, address(sticker), deployer, relayer, gatewayUrls, gatewaySigner
        );
        _pointParentName(ens, PARENT_LABEL, c);
        vm.stopBroadcast();

        // As KEY=value lines, which paste into deploy/.env as they are.
        console2.log(string.concat("STICKER_NFT_ADDRESS=", vm.toString(address(sticker))));
        console2.log(string.concat("STICKER_GIFT_ESCROW_ADDRESS=", vm.toString(address(c.escrow))));
        console2.log(string.concat("CROQUIS_NAMES_ADDRESS=", vm.toString(address(c.names))));
        console2.log(string.concat("CROQUIS_RESOLVER_ADDRESS=", vm.toString(address(c.resolver))));
        console2.log("Croquis registry:", address(c.croquisRegistry));
        console2.log("Gifts registry:", address(c.giftsRegistry));
    }
}
```

- [ ] In `deploy-contracts.sh`:
  - Make the header `# deploy/deploy-contracts.sh: deploy StickerNFT, StickerGiftEscrow and the names under croquis-app.eth to Ethereum Sepolia, and point croquis-app.eth at them.`
  - Delete the `ENS_PARENT_LABEL` line.
- [ ] Change the comment at `croquis-names.ts:34-37` to: `The name every person, sticker and gift name sits under. The contract deploy's PARENT_LABEL must match; the API's contract check compares the two.`
- [ ] In the `deploy/README.md` section:
  - Drop `ENS_PARENT_LABEL` from the settings and delete its bullet.
  - Change "With `STICKER_NFT_ADDRESS` set…" to "It deploys a new StickerNFT each time."
  - Change the last bullet to "It stops before sending anything unless the deployer owns croquis-app.eth, then points croquis-app.eth at the new registry and resolver."
  - Make the same three edits in `packages/sticker-chain/README.md:64`.
- [ ] In `deploy/.env.example`:
  - Drop `ENS_PARENT_LABEL` from the "except" list at :17-18, and delete its two lines at :35-36.
  - Change ":28 The names under the parent name, ENS_PARENT_LABEL.eth" to "The names under croquis-app.eth".
- [ ] Check:
  - `(cd packages/sticker-chain && forge build)` compiles.
  - `rg -n 'ENS_PARENT_LABEL|existingSticker|ownsParent' packages deploy docs AGENTS.MD` finds nothing. Run that search against a known hit first.
- [ ] Commit: `chore(sticker-chain): the deploy script deploys a whole set under croquis-app.eth`

### Task 2: The escrow's take-out status is TakenOut

**Files:** `packages/sticker-chain/contracts/StickerGiftEscrow.sol:23-29,157-159`, `packages/sticker-chain/src/gift-sticker.ts:22`, `packages/db/src/schema/gifts.ts:9-16,40-44,113-117`, `apps/api/src/gifts/deposit.ts:68-69`, `apps/api/src/gifts/packaging.ts:248,282-291`, and the tests the search below finds.

Why: `Rejected` has meant a take-out since `rejectGift` went. It was kept only because the deployed escrow and the database spelled it that way. The redeploy and the baseline make the rename free. The index, 3, doesn't change; `stickerChain.ts` and the app's `giftTransactions.ts` read statuses by number.

- [ ] Find every use:

  ```
  rg -n "Rejected\b|\"rejected\"|'rejected'" packages/sticker-chain/contracts packages/sticker-chain/test packages/sticker-chain/src packages/db/src apps/api/src --glob '!**/generated/**'
  ```
- [ ] In the contract, replace `Rejected` with `TakenOut` in `GiftStatus`. In `takeOut`, set `gift.status = GiftStatus.TakenOut;` and delete the comment above it.
- [ ] Replace `"rejected"` with `"taken_out"` everywhere else:
  - `gift-sticker.ts`.
  - `gifts.ts`: in `escrowStatuses`, in the comment ("`taken_out` or `expired_returned` as a take-out or the expiry sweep reads it"), and in the taken_out row of the CHECK at :113-117.
  - `deposit.ts`: `case "taken_out": return { check, status: "taken_out", escrowStatus: "taken_out" };`.
  - `packaging.ts`: comment "Taken out on chain, or never in the escrow."; `let escrowStatus: "taken_out" | "expired_returned" = "taken_out";`; `escrow.status !== "taken_out"`.
  - Every test hit the search found.
- [ ] Run `pnpm --filter @drawing-app/sticker-chain generate-types`. Expect no diff in `src/generated/`, since an enum's names aren't in the ABI. Commit any diff it makes.
- [ ] Run these; all pass:
  - `pnpm --filter @drawing-app/sticker-chain test`
  - `pnpm --filter @drawing-app/db test`
  - `pnpm --filter @drawing-app/api exec vitest run src/gifts src/routes/gifts.test.ts`
- [ ] Commit: `refactor: the escrow's take-out status is TakenOut, taken_out in the database`

### Task 3: Every NSFW sticker has its veil, so the veil catch-up goes

**Files:**
- **Delete:** `apps/api/src/stickers/veilCatchUp.ts` and `veilCatchUp.test.ts`.
- **Modify:**
  - `apps/api/src/server.ts:30,218-221`
  - `apps/api/src/services/imageStore.ts`
  - `apps/api/src/deps.ts:154-155`
  - `apps/api/src/shapes.ts:291-300`
  - `apps/api/src/testing/fakes.ts:76`
  - `apps/api/src/app.ts:85-86,113-121`
  - `apps/api/src/app.test.ts:210-218`
  - `apps/api/src/diagnostics.ts:44-48,211-213`
  - `packages/db/src/schema/stickers.ts:48-52`
  - `packages/db/src/testDb.ts:62-76`
  - `packages/db/src/schema/stickers.test.ts`

Why:
- Sealing makes the veil before it inserts the row (`seal.ts:200-205`).
- So the catch-up (veils for stickers sealed earlier, and metadata rewritten after) only served older rows, and so did the mask that stands in for a missing veil.
- Once nothing rewrites `{stickerId}.json`, metadata can be cached like the images.

- [ ] Delete the two files, the import at `server.ts:30`, and the job start with its comment at `:218-221`.
- [ ] Rewrite `veiledImageUrls` in `imageStore.ts`:

```ts
/** What a viewer who isn't adult gets for an NSFW sticker: its veiled image in place of each image that shows the drawing. */
export function veiledImageUrls(
  cdnBaseUrl: string,
  contentHash: string,
  veiledHash: string,
): StickerImages {
  const full = stickerImageUrls(cdnBaseUrl, contentHash);
  const veiled = stickerImageUrls(cdnBaseUrl, veiledHash);
  return {
    ...full,
    png: veiled.png,
    flat: veiled.png,
    webp: { ...full.webp, sticker: veiled.webp.sticker },
  };
}
```

  Delete these from `imageStore.ts`:
  - `nameMetadataImage`: the interface member, the function, and its entry in `createDiskImageStore`;
  - `metadataImagesSchema` and `replaceFile`;
  - the imports only they used (`rename`, `z`). Keep `randomUUID` if `writeIfAbsent` still uses it.
- [ ] Make `deps.ts:155` `veiledUrls: (contentHash: string, veiledHash: string) => StickerImages;`. `fakes.ts` follows.
- [ ] `images` in `shapes.ts`'s `viewerOf`:

```ts
    images: (sticker) => {
      if (!veils(sticker)) return images.urls(sticker.contentHash);
      // The stickers_veiled check gives every NSFW sticker its veiled image.
      if (sticker.veiledHash === null) {
        throw new Error(`The NSFW sticker sealed as ${sticker.contentHash} has no veiled image`);
      }
      return images.veiledUrls(sticker.contentHash, sticker.veiledHash);
    },
```

- [ ] In `app.ts`, delete `METADATA_SUFFIX`. The end of `imageAccess` becomes:

```ts
    // Every file is written once: an image is named by its content's hash, metadata by its sticker's id.
    const scope = adultsOnly ? "private" : "public";
    c.header("Cache-Control", `${scope}, max-age=${IMMUTABLE_MAX_AGE_S}, immutable`);
```

  Then delete `app.test.ts`'s test for the no-cache metadata header (`:210-218`).
- [ ] In `diagnostics.ts`, first run `rg -n '\bdone:' apps/api/src` and confirm only the catch-up uses it. Then delete `veiled`, `rewritten` and `done` at `:44-48` and `:211-213`.
- [ ] In `stickers.ts`:
  - Change `veiledHash`'s comment to: `The veiled image's content hash: the drawing hidden, which anyone who isn't adult sees. Sealing makes it for every NSFW sticker, and only for them.`
  - Add ``check("stickers_veiled", sql`${t.nsfw} = (${t.veiledHash} is not null)`)``.
- [ ] In `testDb.ts`'s `insertSticker`, add ``veiledHash: values.nsfw ? bytes32(`veiled-${id}`) : null,`` before `...values`.
- [ ] Add one case to `stickers.test.ts`, in the file's style: an NSFW sticker without `veiledHash` fails the insert, and so does a sticker that isn't NSFW but has one.
- [ ] Run these; all pass:
  - `pnpm --filter @drawing-app/db test`
  - `pnpm --filter @drawing-app/api exec vitest run src/app.test.ts src/services/imageStore.test.ts src/routes src/gifts`
- [ ] Commit: `refactor(api): every NSFW sticker is sealed with its veil, so the veil catch-up goes`

### Task 4: The recovery jobs keep only what recovers

**Files:**
- **Mint catch-up:** `apps/api/src/stickers/mint.ts:56-90`, `mint.test.ts:134-143` and its `:19` import, `apps/api/src/server.ts:213-216`, `apps/api/.env.example:28-33`, `deploy/README.md:53`
- **Contract check:** `apps/api/src/ens/contractCheck.ts:24-39,82`, `contractCheck.test.ts:84-92`, `apps/api/src/services/contractReads.test.ts:77-128`, `apps/api/src/deps.ts:340`
- **Naming:** `apps/api/src/ens/naming.ts:90`
- **Expiry sweep:** `apps/api/src/gifts/expiry.ts:82-88`, `expiry.test.ts:96-126`

- [ ] **Mint catch-up.** Only a database that ran in mock chain mode and then on a chain reaches `not_held_by_artist`, because Packaging refuses an unminted sticker on a chain (`packaging.ts:178`).
  - Drop the skip, the `ownerId` in `unmintedStickers`, and the test at `:134-143`.
  - New comments:
    - `skipStatus`: "Why the catch-up leaves a sticker unminted, or null to mint it."
    - `mintUnminted`: "…as Sealing does, for a mint that failed at Sealing and was never retried. One sticker's failure…"
    - `server.ts:213-216`: "Stickers whose mint failed at Sealing are minted to their Original Artists: now, then just after each midnight, Tokyo time."
  - In `apps/api/.env.example`, below the sepolia note, add: `# Mock mode mints nothing, so delete the local database before switching it to sepolia.`
  - In `deploy/README.md:53`, drop "or one sealed in mock chain mode" and the `not_held_by_artist` clause.
- [ ] **Contract check.**
  - Drop `whyMissing` from `compareAnswer`, which becomes `{ stopsNaming }: { stopsNaming: boolean }` with mismatch `answer !== null ? … : missing`. Drop it from `escrowNames` too.
  - Change the `deps.ts:340` comment to `/** The escrow's CroquisNames. */`.
  - In `contractCheck.test.ts`, the escrowNames case answers another deploy's CroquisNames address, the way `OTHER_NFT` serves escrowSticker, with `involved: [escrow, thatAddress, names]`.
  - In `contractReads.test.ts`:
    - Rename `preEnsEscrowDeploy` to `deployedTogether`, and have its escrow also answer `names: () => configured.names`.
    - Rename the revert test to "reads what each answers, and a getter that reverts (%s) as null". It runs on `{ ...deployedTogether(), [configured.resolver]: { abi: croquisResolverAbi, answers: {} } }` and expects `resolverStickers: null, escrowNames: configured.names`.
- [ ] **Naming.** Change the comment at `naming.ts:90` to "One sticker's failure mustn't keep the rest unnamed."
- [ ] **Expiry sweep.** A deposit the database saw land is in this escrow, so if the escrow lacks it, that's an error, not a gift to leave alone:

```ts
  // Receiving records a claim that landed before the expiry, and a deposit that hasn't landed may
  // still, within CLOSE_UNLANDED_AFTER_MS.
  if (escrow.status === "claimed" || unlanded) {
    logInfo("gift.expiry.left", { ...fields, status: escrow.status });
    return "left";
  }
  if (escrow.status === "missing") {
    throw new Error(`The escrow has no gift ${gift.id}, though the database saw its deposit land`);
  }
```

  In `expiry.test.ts:96-126`, keep the unlanded half. The "elsewhere" half becomes: a gift with `escrowStatus: "pending"` that the escrow reads as missing is counted `failed`, with that error logged.
- [ ] Run `pnpm --filter @drawing-app/api exec vitest run src/stickers/mint.test.ts src/ens src/services/contractReads.test.ts src/gifts/expiry.test.ts`; it passes.
- [ ] Commit: `refactor(api): the catch-ups and the contract check drop the cases only older data reached`

### Task 5: Replays and timelapses require what the app always sends

**Files:**
- **API:** `apps/api/src/gratitude/replay.ts:9,87-88,105-121`, `replay.test.ts:6-21`, `apps/api/src/gratitude/record.ts:94`, `apps/api/src/gratitude/testReplays.ts:37`, `apps/api/src/stickers/timelapse.ts:26-27`, `apps/api/src/routes/stickers.test.ts:387-395`
- **Database:** `packages/db/src/schema/gratitude.ts:25`
- **Frontend:** `apps/frontend/src/gratitude/replayRecorder.ts:142-143`, `replayRecorder.test.ts:12,52-58,268`, `apps/frontend/src/gratitude/replay/replayFeed.ts:25-26,92-97`, `replayFeed.test.ts:123-130`, `apps/frontend/src/gratitude/replay/replayInput.ts:64-65`, `replayInput.test.ts:91-92`, `apps/frontend/src/sticker-creation/sealing/timelapse.ts:65-66,86`, `timelapse.test.ts:87-90`, `apps/frontend/src/sticker-board/timelapse/timelapseCrop.ts:10-28`, `timelapseCrop.test.ts:8,43-56`, `apps/frontend/src/sticker-board/timelapse/timelapsePlayer.ts:29-30,181`, `timelapsePlayer.test.ts:56`, `apps/frontend/src/sticker-board/timelapse/useTimelapse.ts:195`
- **Docs:** `docs/gratitude-mini-game-design-doc.md:187`

Why: since f5bdcf42 the app records `strokePasses` and `density`, and it hasn't sent end reason `sent` since 14f73a7f. The optional fields and `sent` only kept older stored rows readable.

- [ ] **`strokePasses` becomes required.**
  - Schema: `strokePasses: z.array(z.array(z.int().min(0))),` with the comment "Per stroke, the indexes of its samples that ended a fast pass."
  - The superRefine checks it every time: drop `if (replay.strokePasses)`.
  - The recorder always writes it, `[]` for a combo with no strokes. Delete the comment "keeps the shape it always had".
  - In `replayFeed.ts`:
    - `FeedInput`'s `strokeMove.fastPass` becomes `boolean`, and the comment about older replays goes.
    - Use `const passes = replay.strokePasses[stroke] ?? [];` (the API checks there's one list per stroke) and `fastPass = passes.includes(i)`.
    - The engine's own `null` stays, since live play uses it.
  - `replayFeed.test.ts:123-130` goes. `replayRecorder.test.ts` expects `strokePasses: []` on combos with no strokes. `replay.test.ts` expects a replay without it to be refused.
- [ ] **End reason `sent` goes.**
  - Drop `"sent"` from `replayEndReasons`, and delete the `endReason === "sent"` check at `record.ts:94`.
  - `testReplays.ts:37` uses `"empty"`.
  - `gratitude.ts:25` becomes "Counted taps, stroke passes or shake reversals."
  - `replayInput.ts`: `else if (reason === "closed") input.endAt(firstHitAt + at, "closed");`, with its comment gone.
  - Tests: `replayInput.test.ts:91-92` drops its `sent` case, and the comment at `replayRecorder.test.ts:12` goes.
- [ ] **`density` becomes required.**
  - API: `density: z.number().positive(),` with the comment "Device pixels per sheet pixel where it was drawn: fills flood at it." Delete `routes/stickers.test.ts:387-395`.
  - Frontend:
    - `DecodedTimelapse.density` becomes `number`; drop `?? null` at `:86` and the "before densities were recorded" comment.
    - `timelapseCrop.ts`: drawing density becomes `Math.min(density, MAX_DPR)`; delete `CAPPED_IMAGE_SIDE` and the estimate.
    - `timelapsePlayer.ts`: delete the `image` option, which only the estimate used, and its pass at `useTimelapse.ts:195`.
    - The frontend tests listed above follow.
- [ ] **Design doc.** In `:187`, drop "; one recorded before that field existed is recovered only approximately, by running the stroke detector over the samples again", and drop `sent` from the list of how a combo ends.
- [ ] Run these; both pass:
  - `pnpm --filter @drawing-app/api exec vitest run src/gratitude src/routes/stickers.test.ts src/routes/gratitude.test.ts`
  - `pnpm --filter frontend exec vitest run src/gratitude src/sticker-board/timelapse src/sticker-creation/sealing`
- [ ] Commit: `refactor: replays and timelapses require the fields the app always sends`

### Task 6: Every person has an ENS label from sign-in

**Files:** `apps/api/src/ens/labels.ts:45-67`, `apps/api/src/routes/session.ts:111-124`, `packages/db/src/schema/users.ts` (`ens_label`), `apps/api/src/shapes.ts:81,107,339-341`, `apps/api/src/ens/naming.ts:58`, `packages/db/src/testDb.ts:45-51`, `apps/frontend/src/api/views.ts:16,50`, `apps/frontend/src/api/testFixtures.ts:40,77`, `apps/frontend/src/tickets/TicketPurchases.tsx:91`, and every other frontend reader of a person's `ensName`.

Why: sign-in labels a new person in the same transaction that inserts them. A null label exists only on rows from before that. Computing the label before the insert lets the column be NOT NULL, so a person's `ensName` stops being nullable from the database to the app.

- [ ] `labels.ts`: split the label out of `syncEnsLabel`:

```ts
/** The label a person's handle makes, or their fallback when it can't be one or is taken. */
export function labelFor(db: Pick<Db, "select">, user: Pick<UserRow, "id" | "handle">): string {
  const fromHandle = user.handle === null ? null : labelFromHandle(user.handle);
  if (fromHandle !== null && !isLabelTaken(db, fromHandle, user.id)) return fromHandle;
  const fallback = fallbackLabel(user.id);
  return isLabelTaken(db, fallback, user.id) ? `artist-${user.id.replaceAll("-", "")}` : fallback;
}
```

  `syncEnsLabel` keeps its early return for a named person, then uses `const label = labelFor(db, user);`.
- [ ] In `session.ts`, the new-person path inserts with the label and returns the row:

```ts
          const id = deps.ids.uuid();
          const parsed = parseHandle(profile.name);
          const handle = parsed !== null && !isHandleTaken(tx, parsed) ? parsed : null;
          return tx
            .insert(users)
            .values({
              id,
              lineUserId: profile.sub,
              ...lineProfile,
              language,
              handle,
              ensLabel: labelFor(tx, { id, handle }),
            })
            .returning()
            .get();
```

- [ ] In `users.ts`, make `ens_label` `.notNull()`, and drop any null wording from its comment.
- [ ] In `shapes.ts`:
  - `:81`: `ensName: z.string()`
  - `:107`: `ensName: personEnsName(ensLabel)`
  - `:340`: drop `&& artist.ensLabel !== null`. A sticker's name stays nullable until it's onchain.
- [ ] In `naming.ts:58`, delete the throw for a missing label.
- [ ] In `testDb.ts`'s `insertUser`, add `ensLabel: id`. `newId` makes ids like `user-3`, which are valid labels.
- [ ] `rg -n "ensName: null" apps/api/src apps/frontend/src`: for a person, each hit becomes the name its label makes. A sticker that isn't named keeps `null`.
- [ ] In the frontend:
  - In `views.ts`, a person's `ensName` becomes required (`:16`, `:50`). A sticker's stays optional (`:36`, `:71`).
  - In `TicketPurchases.tsx:91`, use `me.ensName`.
  - Run `rg -n 'ensName' apps/frontend/src` for the other person readers.
- [ ] Run `pnpm --filter @drawing-app/api exec vitest run src/routes/session.test.ts src/ens src/routes/ens.test.ts` and `pnpm --filter frontend exec vitest run src/tickets src/sticker-board src/api`; both pass. Then `pnpm typecheck`.
- [ ] Commit: `refactor: every person has an ENS label from sign-in`

### Task 7: The schema without migration history

**Files:** `packages/db/src/schema/users.ts`, `stickers.ts`, `tickets.ts`, `packages/db/src/testDb.ts`, `packages/db/src/schema/tickets.test.ts:19-23,41-42`, `apps/api/src/routes/stickers.test.ts:51-59`, `apps/api/src/stickers/mint.test.ts:209-219`, `apps/api/src/routes/nsfwImages.test.ts:123-132`, `apps/api/src/routes/session.ts:34`, `AGENTS.MD:224`

- [ ] Make `ticket_uses.idempotency_key` `.notNull()`, and drop "Null on uses spent before spends had keys." The spend route already requires a UUID.
- [ ] Drop the defaults ALTER TABLE needed:
  - `stickers.nsfw`: Sealing always sets it.
  - `users.language`: sign-in always sets it.
- [ ] Put the columns in their natural order, and delete both "Columns added after the table was made go last…" comments. Each table ends with `...timestamps()`.
  - **users:** id, line_user_id, line_display_name, line_picture_url, handle, ens_label, ens_named_at, language, language_choice, smart_account_address, age_verified_at, age_verification_nullifier, terms_accepted_at, deleted_at.
  - **stickers:** id, number, artist_id, owner_id, time_used, width, height, outline, nsfw, content_hash, veiled_hash, metadata_uri, token_id, mint_tx_hash, ens_named_at.
  - **ticket_uses:** id, user_id, idempotency_key, ticket_day, day_index, kind, sticker_id.
- [ ] In `testDb.ts`:
  - `insertUser` adds `language: "en"`, and `insertSticker` adds `nsfw: false`, each before `...values`.
  - Add a helper for the three API fixtures that insert ticket uses by hand:

```ts
/** Records `userId`'s ticket use at `dayIndex` on `ticketDay`: daily or reserve by its index, with a spend key. */
export function insertTicketUse(
  db: TestDb,
  userId: string,
  { ticketDay, dayIndex, stickerId = null }: { ticketDay: string; dayIndex: number; stickerId?: string | null },
) {
  db.insert(schema.ticketUses)
    .values({
      userId,
      idempotencyKey: randomUUID(),
      ticketDay,
      dayIndex,
      kind: dayIndex < DAILY_TICKETS_PER_DAY ? "daily" : "reserve",
      stickerId,
    })
    .run();
}
```

  `stickers.test.ts:51-59`, `mint.test.ts:209-219` and `nsfwImages.test.ts:123-132` use it. `packages/db`'s `tickets.test.ts` tests the table itself, so it adds `idempotencyKey` to its own inserts instead.
- [ ] If `.required()` at `session.ts:34` exists only for `language`, drop it.
- [ ] Replace `AGENTS.MD:224` with: "`pnpm db:migrate` applies `packages/db/drizzle/` to the local database (`data/drawing-app.db`). After a schema change, `pnpm --filter @drawing-app/db db:generate` writes the migration. A column added to a table goes last, where ALTER TABLE puts it, since the migration test compares the migrated tables with the schema's; a new or rebuilt table's `updated_at` trigger is appended to its migration, from `updatedAtTriggerStatements`."
- [ ] Run `pnpm --filter @drawing-app/api exec vitest run src/routes src/stickers`; it passes. `migrate.test.ts` fails until Task 8 regenerates the baseline.
- [ ] Commit: `refactor(db): the schema keeps no migration history`

### Task 8: Collapse the migrations

- [ ] Check that every schema edit is in (Tasks 2, 3, 5, 6, 7) and that nothing else is uncommitted.
- [ ] `rm -rf packages/db/drizzle`
- [ ] `pnpm --filter @drawing-app/db exec drizzle-kit generate --name=baseline`. Its output should name `drizzle/0000_baseline.sql`. It exits 0 even when it fails, so read the output.
- [ ] Append the triggers:

```sh
(cd packages/db && node --input-type=module -e "import { appendFileSync } from 'node:fs'; import { allTables } from './src/schema/index.ts'; import { updatedAtTriggerStatements } from './src/schema/updatedAtTriggers.ts'; appendFileSync('drizzle/0000_baseline.sql', '--> statement-breakpoint\n' + updatedAtTriggerStatements(allTables).join('\n--> statement-breakpoint\n') + '\n');")
```

- [ ] Run `pnpm --filter @drawing-app/db test`. `migrate.test.ts` passes: the baseline builds what the schema describes, triggers included.
- [ ] Commit: `chore(db): one baseline migration for the fresh start`

### Task 9: The app drops what the device and mock era left

**Files:** `apps/frontend/src/receiving/receiveFlow.ts:7-8,50`, `receiveFlow.test.ts:62`, `apps/frontend/src/receiving/refusals.ts:88-94`, `ReceiveGiftDialog.test.tsx:145`, `apps/frontend/src/i18n/strings/receiving.ts:150-157`, `apps/frontend/src/sticker-board/boardSticker.ts:17,23-24,34,68-69`, `boardSticker.test.ts:12,32`, `apps/frontend/src/sticker-creation/session/keptSession.ts:36-37,189,194,403-408`, `keptSession.test.ts:131-142`, `apps/frontend/src/sticker-creation/DrawingScreen.tsx:547-551`, `apps/frontend/src/env.d.ts`

- [ ] **`needs_server`.** Only the device and mock API that 8f2f7136 deleted produced it.
  - Drop it from `RefusalKind`, `REFUSAL_KINDS`, `refusalScreen` and the catalog (`receiving.ts:150-157`).
  - Drop "or no server" from `receiveFlow.ts`'s comment.
  - Delete the `[501, "needs_server"]` rows in both tests.
- [ ] **`BoardSticker.blob`** stood in for the deleted demo artists, and nothing sets it. Delete the field and the `Omit<BoardSticker, "blob">` at `:34`.
- [ ] **Outlines.** The column is NOT NULL and Sealing requires one.
  - `:68-69` becomes `outline: s.outline`.
  - `:17` says the board kept on the phone carries no outlines (`lastBoard.ts:82`). `outline?` itself stays, for that reason.
  - `boardSticker.test.ts:12` and `:32` follow.
- [ ] **Kept drawing's tools.** Tools have been kept since a0762d11, and a session kept before then belongs to an old user id. So reading one requires `tools`, as it already requires `nsfw`. Drop the lenient read, `DrawingScreen.tsx:547-551`'s fallback, and `keptSession.test.ts:131-142`.
- [ ] **`env.d.ts`.** Declare `VITE_STICKER_ESCROW_ADDRESS` and `VITE_STICKER_RPC_URL`, both optional strings.
- [ ] Run `pnpm --filter frontend exec vitest run src/receiving src/sticker-board/boardSticker.test.ts src/sticker-creation/session`; it passes.
- [ ] Commit: `refactor(frontend): drop what the device and mock era left`

### Task 10: Every sticker has all its images

**Files:**
- `apps/frontend/src/api/views.ts:54,65-68` and `api/views.test.ts:15-27`
- `apps/frontend/src/stickers/`: `stickerUrls.ts:5-10`; `StickerFigure.tsx:39-44,64-66,77,85,94,104,112-114`; `LiveResin.tsx:5-11,28`; `liftedCorner.ts:101-104`; `StickerFoil.tsx:18-19,38,42`; `sticker-foil.css:8-30,53-58`
- `apps/frontend/src/sticker-creation/sealing/SealCeremony.tsx:371`
- `apps/frontend/src/sticker-board/`: `PlacedSticker.tsx:72`; `useBoardGestures.ts:188-189`; `StickerBoard.tsx:241,964`; `boardComplete.ts:78-79`
- `apps/frontend/src/sticker-board/timelapse/`: `useTimelapse.ts:138-139`; `TimelapseLayer.tsx:17-18`
- `apps/frontend/src/sticker-board/tray/`: `stickerShape.ts:47`; `trayModel.ts:274`; `traySheets.ts:154,158,169`
- `apps/frontend/src/giving/GiftReceivedNotice.tsx:20,71`
- `apps/frontend/src/shop/shopSticker.ts:12,33-34`
- test fixtures: `GratitudeMiniGame.test.tsx:29`, `useBoardGestures.test.tsx:27`, `StickerDetail.test.tsx:53,497`, `useTimelapse.test.tsx:32`, `lastBoard.test.ts:25`, `tray/StickerTray.test.tsx:44`
- `DESIGN.md:574`

Why: "An empty URL is an image it doesn't have" dates from stickers made on the device, before Sealing made every image. The API requires all five WebPs (`shapes.ts:159-166`), and `imageStore.ts` always fills them, veiled stickers included. This is independent of the wipe; it's in the same branch because it's the same kind of cleanup.

- [ ] `views.ts` maps all five URLs unconditionally, and drops the `:54` comment.
- [ ] In `stickerUrls.ts`, `mask`, `spec` and `rim` become required. `foil` stays optional: only the Shop's bundled sample sticker has no foil mask (`shop/sample-sticker/` has no `foil.png`).
- [ ] Delete every path for a sticker without a mask, spec or rim at the lines listed. That includes `LiveResin`'s `highlights` prop, which `SealCeremony.tsx:371` always passes.
- [ ] Keep `StickerFoil`'s dilated fallback and the `--baked` modifier, but reword their comments to name the Shop's sample as their only case. Make the same rewording in `DESIGN.md:574`.
- [ ] `views.test.ts:15-27` goes. The fixtures listed above add the URLs.
- [ ] Run `pnpm --filter frontend exec vitest run src/stickers src/sticker-board src/giving src/shop src/api src/gratitude` and `pnpm --filter frontend typecheck`; both pass.
- [ ] Commit: `refactor(frontend): every sticker has all its images`

### Task 11: The gaps the wipe exposes

**Files:** `apps/api/src/tickets/tickets.ts:33-47`, new `apps/api/src/tickets/paymentReference.ts`, `apps/api/src/client.ts`, `apps/frontend/src/payments/jpyc.ts:160-224`, `apps/frontend/src/tickets/TicketPurchases.tsx:40,84-91`, their tests, `DESIGN.md:560`, `apps/frontend/src/sticker-board/useMyStickerBoard.ts`, `apps/frontend/src/app/App.tsx:143-149`

- [ ] **The Shop's purchase list shows only the account's payments** (decision 4).
  - Move `ticketPaymentReference`, `PURCHASE_REFERENCE` and `purchaseNamedBy` from `tickets.ts` into `paymentReference.ts`, which has no server imports. Re-export `purchaseNamedBy` from `client.ts`.
  - `paymentReceived` in `jpyc.ts` also reads `reference`. Sui's GraphQL prints a `vector<u8>` as base64; a live event checked on 2026-10-03 decoded to `tickets:…`. Decode it to UTF-8 text.
  - `getTicketPayments(owner, userId, payment, cursor)` keeps a payment only when `purchaseNamedBy(reference)?.userId === userId`. `TicketPurchases.tsx` passes `me.id`.
  - In the test, a payment naming another account, and one with an older reference, are left out.
  - Adjust `DESIGN.md:560` if it says the list is the wallet's.
- [ ] **A board kept for the previous account.** When a tab open across the window signs in again as the new account, `useMyStickerBoard`'s module cache still holds the old account's board, and the Shop's previews and the give sheet show it.
  - Add `forgetMyStickerBoardUnlessFor(userId)`, which forgets an answer kept for another account, as `lastBoard`'s `forgetBoardUnlessFor` does. Record the id the answer was fetched for.
  - Call it in `App.tsx`'s layout effect beside `forgetBoardUnlessFor(me.id)`.
  - Add a test that an answer fetched for one id isn't served to another.
- [ ] Run `pnpm --filter frontend exec vitest run src/tickets src/payments src/sticker-board src/app` and `pnpm --filter @drawing-app/api exec vitest run src/tickets src/routes/tickets.test.ts`; both pass.
- [ ] Commit: `fix: the Shop lists only the account's payments, and a new account never sees the last one's board`

### Task 12: Docs and leftovers

- [ ] Remove `deploy/serve.py`'s `OLD_GIFT_HERO`, its branch in `translate_path`, and the docstring clause "but for the Gift Message's picture under an older build's name" (decision 3).
- [ ] Delete `docs/review/2026-09-28-backend-code-review.md`.
  - The escrow switch and LATE-11 end with the wipe.
  - OWNER-1 (paste `deploy/line/greeting.md` into LINE Official Account Manager) moves to the closing summary.
- [ ] Run `rg -n -i 'croquis\.eth|from before|veil catch-up|0x10318|0x61C692|ENS_PARENT_LABEL|not_held_by_artist|needs_server' docs deploy packages apps AGENTS.MD DESIGN.md --glob '!**/generated/**'`, and fix whatever is left.
- [ ] Commit: `docs: the fresh start's leftovers go`

### Task 13: Check and merge

- [ ] Initialize the Foundry submodules in the worktree, as `packages/sticker-chain/README.md`'s Commands section shows.
- [ ] Run `pnpm check:full`; it passes. Read its knip report for exports the removals left unused.
- [ ] Have one reviewer subagent review `git diff main...chore/fresh-start` (superpowers:requesting-code-review).
- [ ] Run the worktree on a fresh database with `pnpm dev` under LIFF Mock, in two windows (`?as=a`, `?as=b`). In Playwright WebKit and Chromium:
  - seal a sticker and an NSFW one;
  - give, then receive;
  - send Gratitude by tap, then by stroke;
  - play the replay and the timelapse on the sticker detail;
  - open the Shop's purchases list.
- [ ] Squash into a few commits with no AI attribution, and check them with `git log --format=%B`.
- [ ] Merge from the main checkout, in one command:
  1. fetch;
  2. confirm main has no new migration (`git diff --name-only 4c16ffdc origin/main -- packages/db/drizzle` is empty; otherwise regenerate the baseline on top);
  3. merge and push.

  Then delete `data/drawing-app.db*` and `.claude/data/{foil,w7,gate-check}.db*`.

### Task 14: Contracts (the window starts)

- [ ] Stop the API: `( set -a; . $MAIN/deploy/.env; set +a; ssh "$DEPLOY_TARGET" sudo systemctl stop drawing-api )`. The sealer must send nothing else while it funds the deployer.
- [ ] Fund the deployer. Use `ETH_PRIVATE_KEY` if `cast send --help` lists it; otherwise use `--private-key`.

```sh
( set -a; . $MAIN/deploy/.env; set +a; RPC="${ETHEREUM_SEPOLIA_RPC_URL%%,*}"
  cast send --rpc-url "$RPC" --private-key "$STICKER_SEALER_PRIVATE_KEY" \
    0xf573a64BFF7c49BC39AFe038f691a61cd4bBFFf4 --value 0.015ether
  cast balance --ether --rpc-url "$RPC" 0xf573a64BFF7c49BC39AFe038f691a61cd4bBFFf4 )
```

- [ ] Simulate:

```sh
( set -a; . $MAIN/deploy/.env; set +a
  cd $MAIN/packages/sticker-chain &&
  forge script script/DeployStickerContracts.s.sol:DeployStickerContracts --rpc-url "${ETHEREUM_SEPOLIA_RPC_URL%%,*}" )
```

  It doesn't revert, and "Estimated amount required" is below the deployer's balance.
- [ ] Deploy: `bash $MAIN/deploy/deploy-contracts.sh`, from the main checkout at the merged commit.
- [ ] Update the main checkout's `deploy/.env`:
  - The four printed lines replace the old values.
  - Delete the escrow switch comment and its commented-out address.
  - Change "names under croquis.eth" to croquis-app.eth.
  - Describe the deployer key as the one that owns croquis-app.eth and administers the contracts.
  - Delete `ENS_PARENT_LABEL`.
- [ ] Check on chain. Each answer should match the comment beside it:

```sh
( set -a; . $MAIN/deploy/.env; set +a; RPC="${ETHEREUM_SEPOLIA_RPC_URL%%,*}"
  R=0x657eA849311d3D5823348ddEd7C2AaAFb3EDE09E
  cast call --rpc-url "$RPC" $R "getResolver(string)(address)" croquis-app        # CROQUIS_RESOLVER_ADDRESS
  cast call --rpc-url "$RPC" $R "getSubregistry(string)(address)" croquis-app     # the printed Croquis registry
  cast call --rpc-url "$RPC" "$STICKER_GIFT_ESCROW_ADDRESS" "names()(address)"    # CROQUIS_NAMES_ADDRESS
  cast call --rpc-url "$RPC" "$STICKER_GIFT_ESCROW_ADDRESS" "sticker()(address)"  # STICKER_NFT_ADDRESS
)
```

### Task 15: The box: chat menus, wipe, deploy

- [ ] **Chat menus** (decision 2). Do this while the API is stopped; while it runs, this would also unlink people who sign in to the new one. Secrets go on stdin, never as arguments:

```sh
( set -a; . $MAIN/deploy/.env; set +a
  TOKEN="$(printf '%s' "$LINE_MESSAGING_CHANNEL_SECRET" | curl -sS --fail-with-body https://api.line.me/oauth2/v3/token \
    --data-urlencode grant_type=client_credentials --data-urlencode "client_id=$LINE_MESSAGING_CHANNEL_ID" \
    --data-urlencode client_secret@- | jq -r '.access_token // empty')"
  [ -n "$TOKEN" ] || { echo "no token" >&2; exit 1; }
  printf 'Authorization: Bearer %s\n' "$TOKEN" | curl -sS -D - --fail-with-body -H @- -H 'Content-Type: application/json' \
    --data '{"operations":[{"type":"unlinkAll"}],"resumeRequestKey":"fresh-start-2026-10-03"}' \
    https://api.line.me/v2/bot/richmenu/batch | grep -i '^x-line-request-id' )
```

  Poll `GET https://api.line.me/v2/bot/richmenu/progress/batch?requestId=<that id>` with the same header until `phase` is `succeeded`.
- [ ] **Wipe:**

```sh
( set -a; . $MAIN/deploy/.env; set +a
  ssh "$DEPLOY_TARGET" 'systemctl is-active drawing-api; find /srv/drawing-api/data /srv/drawing-api/images -mindepth 1 -delete \
    && rm -f /srv/drawing-api/secrets.env.bak-20260926-104429 \
    && find /srv/drawing-api/data /srv/drawing-api/images -mindepth 1 | wc -l' )
```

  It should print `inactive`, then `0`.
- [ ] **Deploy main** from the main checkout if it's clean at main; otherwise from a clean worktree at main: `DEPLOY_ENV_FILE=$MAIN/deploy/.env ./deploy/deploy.sh`.
  - deploy-api.sh restarts the unit, since the bundle and `drizzle/` changed, then checks that `/api/me` answers `signed_out`.
  - If it changed nothing, start the API: `ssh "$DEPLOY_TARGET" sudo systemctl start drawing-api`.
- [ ] **Boot log:** `curl -s "https://sticker.195-201-8-147.sslip.io/api/logs?lines=300"`.
  - `chain.contracts.checked` shows every comparison true and naming on, and there's no `chain.contracts.mismatch`.
  - Each job's swept line shows zero counts, and there are no failure lines.
  - `ssh "$DEPLOY_TARGET" sqlite3 -readonly /srv/drawing-api/data/drawing-app.db 'select count(*) from __drizzle_migrations'` prints `1`.

### Task 16: Verify in LINE (ad0ll's phone)

- [ ] ad0ll opens Croquis from the Official account's chat, signs in (a new account), picks a handle, and seals a sticker.
  - The log shows `sticker.mint.recorded`, then naming for the person and the sticker.
  - Both names resolve through UniversalResolverV2, 0x5d25c1d6acbb71b7a28aa7899618a3412a8303e3.
- [ ] ad0ll gives the sticker to a second account through LINE's friend picker. The second account receives it and plays the Mini-game.
  - If the deposit fails on sponsorship, add the new StickerNFT and escrow to Privy's gas sponsorship.
- [ ] Age verification, per decision 1.

### Task 17: Cleanup

- [ ] Tell the session that made `~/.cache/drawing-app-shop-prices/lane.db` that the database no longer boots.
- [ ] Remove the worktree and the branch, delete `~/.cache/drawing-app-fresh-start/`, and delete this plan (commit on main).
- [ ] In the closing summary, include OWNER-1 (the greeting still says five minutes; paste `deploy/line/greeting.md` into LINE Official Account Manager) and any decision still open.
