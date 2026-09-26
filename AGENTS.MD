# AGENTS.md

## Vocabulary

This is the known vocab in the project. When relevant you should use the terminology below in comments, filepath name, function names and such to make sure that features and major sections can be identified by name at a glance. Every term should only have exactly one meaning. Agents may not invent new vocab nor adjust the definitions for existing vocab without explicit approval from the engineer

| Item                                | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Croquis                             | The app's name, クロッキー in Japanese (ad0ll, 2026-09-26). Text that names the app says Croquis; a sticker board is a person's board of stickers, never the app.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Sticker                             | A drawing that someone created that can be given to someone else. Includes the data of the drawing itself, the physical presentation of the drawing on the Sticker Board, and the transferrable NFT that is used for ownership.<br><br>May sometimes be referred to as a “drawing” instead of a sticker because you physically draw it, but in code and documentation and comments it should be “sticker” (drawing is a confusing term because it’s not clear at a glance if it’s a noun or verb).<br><br>When you hear the term “sticker” you can almost always assume we are talking about a “sealed” sticker, and not about the process of creating a sticker. |
| Ticket                              | Users consume a ticket for permissions to draw a single sticker. Every ticket is either a daily ticket or a reserve ticket.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Daily ticket                        | One of the three free tickets each user gets per day. The day turns over at midnight JST, and unused daily tickets expire with it. Always spent before reserve tickets. Seal Yellow in the UI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Reserve ticket                      | A ticket bought in the Shop, paid on Sui. No limit on how many you hold, and they never expire. Spending one always asks first. Blue in the UI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Shop                                | The Shop tab. Reserve tickets are on sale there, in packs of 1, 3, 5 and 10, priced in yen and paid in JPYC on Sui through the reserve ticket checkout, which the drawing screen opens too. Laminates, brushes and backing foils are shown as coming soon, with no prices.                                                                                                                                                                                                                                                                                                                                                                                        |
| Laminate                            | The finish a sticker is sealed with (see Seal). Every sticker is sealed in gloss today; matte, glitter and prism are shown in the Shop as coming soon.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Backing foil                        | The style of the foil band your stickers wear on other people's sticker boards, where foil marks a sticker someone else drew. Holo today; gold, silver and rose gold are shown in the Shop as coming soon. It never shows on your own board.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Gratitude                           | Points that one artist is able to generate and give to an artist after receiving a drawing. Functions as a global user score.<br><br>Gratitude can only be generated through the Gratitude mini game, which can only be accessed by receiving a gift. It must not and will not ever be used for or associated with monetization.                                                                                                                                                                                                                                                                                                                                  |
| (Act of) drawing/creating a sticker | Using the drawing screen to draw down shapes and lines to produce a sticker. Typically used to refer to the process of creating a sticker, the interim state up until sealing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Seal, Sealing a drawing             | When you finish a sticker, either because you ran out of time or because you ended early voluntarily, it becomes “sealed”. This makes the sticker unmodifiable and locks down all properties used in its production (the image, artist, time it was generated, etc.).<br><br>The term “seal” comes from real sticker production, when you seal a printed sticker by applying laminate over it.<br><br>May sometimes be referred to colloquially as a “finished drawing”.                                                                                                                                                                                          |
| Un/Packaging a sticker              | (Visual only) The on-screen activity of putting a drawing into a bag as a visual representation of sending it to the escrow so it can be received by the person you’re giving it to.<br>On the other end, the sticker is unpackaged (by pulling on the pull tab).<br><br>The term “pull tab” is exclusive to the act of unpackaging a drawing.                                                                                                                                                                                                                                                                                                                    |
| “Giving” (a sticker), “Gift giving” | The full end to end flow of a user transferring a sticker/NFT they own, and therefore its associated rights to be used on that user’s sticker board.<br><br>Refers to both the backend process of packaging and sending a sticker to the escrow as well as the visual presentation of Packaging → Sending the drawing to the escrow.                                                                                                                                                                                                                                                                                                                              |
| “Receiving” (a sticker)             | A user accepting a sticker that’s gifted to them, which transfers the NFT over to their own wallet, and lets them place it on their sticker board.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Gift Message                        | The LINE message that carries a gift. The giver sends it from their own LINE account through LINE's friend picker, into one 1:1 chat. It shows a frosted sleeve (never the sticker), "From @alice", and an "Open your gift" button whose link ends in the gift claim token.                                                                                                                                                                                                                                                                                                                                                                                       |
| Gift Claim Token                    | The one-time secret at the end of a gift message's link. Opening the link hands it to our server, which lets one person receive the sticker, once. Only its hash is kept, in our database and in the escrow contract, so the token itself lives only in the gift message.<br><br>Temporary exception, until smart account permissions can authorize the receiver on chain: a gift that waits for someone (the person the giver picked in the app, or the first person to open its link) can be received by that person from their board without the token.                                                                                                        |
| Transfer Trail                      | The history on a sticker's detail: one row per time it was given, newest first, each with the gratitude it earned and a replay.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NSFW sticker                        | A sticker its Original Artist marked for adults when sealing it. It wears pink foil, and anyone whose age status isn't adult sees it blurred inside its cut and can't receive it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Age status                          | A person's `adult`, `minor` or `unknown`, from World ID; `unknown` until they verify. Only an adult marks, sees or receives NSFW stickers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Pink foil                           | The foil an NSFW sticker wears, in place of the holo foil, on every board, sheet and gift.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| (Gratitude) Mini-game               | The interactive heart tapping/stroking/shaking game that you play where you spam an interaction with an on screen heart to generate gratitude for a drawing.<br><br>In the context of this game, gratitude might be referred to as a “score”, since the primary goal of the game is to generate a high number, but in code and comments and documentation you should refer to it as gratitude.                                                                                                                                                                                                                                                                    |
| Hits                                | A gratitude combo's length. Each counted tap, stroke pass or shake reversal is one hit, shown the way fighting games show it ("64 HITS"). Best combo ranks by hits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Original Artist                     | The person who created a given sticker: wherever the term appears, it means that person. Use the full form when "artist" alone would be ambiguous, since any user who makes stickers could be called an artist.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Original Artist Gratitude Share     | When the Original Artist is neither the giver nor the receiver, 20% of the gratitude from the Mini-game goes to them, out of the giver's part. It shows as one line of fine print, never with money words. Its on-screen name on the stat board's receipt is **Residual** (`residual` in User Stats).                                                                                                                                                                                                                                                                                                                                                             |
| Direct                              | The gratitude you receive for stickers you gave: each combo's total, less any Original Artist Gratitude Share (`direct` in User Stats). Beside Residual on the stat board's receipt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Sticker Board                       | An arrangement of stickers that the user has chosen to present to other users (think about how people arrange stickers on the back of their laptop, that is the vibe). This is what you are served when you drill down into a user’s page anywhere in the app.<br><br>The stat board can be accessed by “Flipping”.<br><br>Every user (currently) can only have one sticker board. Sticker boards are read only unless owned by the user. In the user’s own sticker board, they have access to the “Sticker tray” which lets them add stickers, and can freely arrange their stickers.                                                                            |
| User Stats                          | A user’s total gratitude, streaks, any stats that display on their stat board.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Age verification                    | Proving, from the Age verification paper on your stat board, that you’re 18 or older with an Orb-verified World ID (World verifies no one under 18 at an Orb). The server keeps when it happened and the World ID’s nullifier, so one World ID verifies one live account. It unlocks nothing yet.                                                                                                                                                                                                                                                                                                                                                                 |
| Stat board/Corkboard                | The reverse side of a user’s sticker board that shows their User Stats in paper-like boxes. Visually presented as a cork board in the UI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Sticker tray                        | The sticker tray is opened by dragging/interacting with the “Zipper” on your own Sticker Board. It shows you sticker sheets with stickers you can add onto your sticker board.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Sticker sheet                       | A page of stickers that you can place onto your sticker board. Appears in the sticker tray.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| LINE                                | The messaging app that Japanese users main, we’re integrating with it so we can get auth for free and                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Friends                             | Friends that a user has in LINE. Giving a gift involves sending a message to the recipient to invite them to sign up for the app to receive their gift. Within the app, we let you choose a friend to gift to, and when you do this, the message inviting them to join the app comes from the user’s account.                                                                                                                                                                                                                                                                                                                                                     |
| LINE Frontend Framework (LIFF) app  | The frontend framework that lets us use LINE authentication (Login Channel) and LINE messaging (Messaging API + Official account).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Official account (LINE)             | This is the bot that users interact with within LINE to access our app within LINE. They initiate a chat with this account, this account returns links to the app, the user presses that link and gets access.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Login Channel (LINE)                | This refers to the configuration and auth setup that lets users authenticate against the app using LINE.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Messaging API (LINE)                | The service layer that lets us send messages to users in LINE from the app (friend to friend communication for giving/receiving gifts).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Communication

- Skip pleasantries and ceremony; state facts concisely.
- Cite sources with full URLs — embedded links can't be clicked in the TUI.
- When asked to research, be thorough: web search and the codebase, exhaustively. A well-researched answer beats a fast one.
- Only claim your work is done when it's verified, and report failures with the output.
- If you defer something, decide first whether you _should_ defer it, then say so explicitly and in detail at the end. Finding a basic problem after being told it's done is the worst outcome.

## Standards

### Internationalization

- Comments and documentations and code is all in American english
- The UI supports both Japanese and English for all UI elements as well as any user facing content
- English text is American English: identifiers, comments and the catalog's English
- User-facing text goes in the catalog, never inline: `apps/frontend/src/i18n/strings/`, one file per section (a feature folder, plus `errors` and `pages`), joined in `strings/index.ts`. Each string is `{ en, ja? }`: without `ja`, Japanese shows the English. Strings under a `developer` key are the developer slip's, and stay English.
- Every string but the developer slip's has a one-line `/** … */` comment above it, naming the screen it's on and the interaction it appears in, e.g. `/** LINE sign-in screen, in a browser outside LINE: the button that starts LINE Login */`.
- Japanese uses the words and style in `apps/frontend/src/i18n/glossary.md`, so the app says one thing one way.
- `pnpm --filter frontend i18n:export <file.csv>` writes a sheet for a translator: each string's key, where, English, Japanese and notes. `pnpm --filter frontend i18n:import <file>` reads back either that sheet, which sets Japanese only, or a work file, `{ "<section>.<path>": { "where": "…", "ja": "…" } }`, which sets each string's comment and Japanese and clears the Japanese it leaves out. The import checks keys, `{{variables}}` and `<tags>` first, writes nothing if anything's wrong, and edits only the strings that change.

### Banned words

The following words are banned from all comments, code, and conversations. This is because they are all generic and inherently carry multiple meanings, and AI agents use them excessively in place of identifiers and filenames that describe actual operations in the code

| Banned           | Say instead                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **corpus**       | every database has a name or domain it's associated with, use the name of the database instead                                                                                                          |
| **wire**         | Just avoid this word, agents typically use it to mean the payload, response, process of transferring data, and have no consistency in its use. Describe the process and what the function/file is doing |
| **load-bearing** | Again just avoid using it. It's a nonsense generic term that has no meaning and AI usually uses it for verbose fluff instead of describing what they observe                                            |

### Pre merge steps

- Squash commits into a few representative commits and remove accredidation to AI tools

### Post merge

- Once your work in a worktree is complete and merged to main, drop any fully implemented plans, specs, and worktrees related to the merged work
- If there's truly important details and decisions in the spec or plans, that content can be selectively and concisely moved to durable docs, but do deeply think about if it will be useful context for future work before doing so. The general trend should always be to delete

### Tool choice

- Use rg when you need to grep and make sure to avoid gitignored files and try to make rg calls as focused as possible instead of searching whole code base
- Edit files with the Edit and Write tools.
- Always use parallel tool calls when possible, especially important when searching for or editing or reading files

### Error handling

- Don't silently swallow errors. Handle them, or surface them in logs and UI. If there's a compelling reason to absorb one, say why in a comment **and tell the operator you made that call**.
- No silent long-running work either, everything that risks running long should have a timeout system. If the app is request heavy, make sure timeout behaviors are consistent and progress should be reported in logs
- Errors say what failed, why, and which items were affected, and persist for review rather than vanishing as a toast
- The REST API is transparent too — real status codes and machine-readable bodies, and API errors surface in the UI. **An error only the calling client can see is a silent error.**
- **Never truncate data** before the database or a log unless a schema requires it.

### Code health

- **Hard deprecation over soft.** When we change how we do something, don't leave artifacts of the old way behind; it's all in git. No back-compat shims — this is a single-user local app.
- One authoritative implementation per concept. No `manager_v2`, no `enhanced_*`.
- Avoid files over ~2000 lines. A file growing that large usually means it's doing too much; split by responsibility.
- Don't use hot imports inside function bodies without a specific runtime reason.
- Fix minor issues you notice in passing, such as a failing test, a stale comment, a lint error, etc. Only punt when you tried and it turned out to be more involved than expected.
- Always opt out of optional telemetry, including in libraries you add. Don't remove existing telemetry.

### Comments

- Comments explain **why** the code is shaped as it is. They should be durable: no reasoning anchors, journal entries, execution state, research findings or hard numbers, all of which go stale and cause churn.
- Comments should be concise and not bloat the file, only communicate exactly what is necessary in comments and do not bloat it with process and research findings.
- If inline comment blocks exceed 4 lines, you're probably being too verbose and need to summarize or consider if what you're writing is worth writing at all. Inline comments should never exceed 7 lines.
- **No hyperspecific anchors** do not put fragile and transient facts like section numbers, plan task numbers, phase numbers, or "added by P1.3". Say the reason, not where the reason was once written down.
- Avoid prose and preambles in comments, communicate the key information clearly and succinctly

### Testing

Tests should always be meaningful and test the functionality of the code.
Avoid hyperspecific tests or writing tests as a knee jerk reaction. Think about the tests you add to the project because maintenance is not free. You should avoid writing tests that:

- Test for a specific hardcoded values instead of testing functionality
- Tests that were written to guard against a problem that just came up once or were programmed for hyperspecific edge cases that are no longer realistic or that are excessively defensive
- Tests that have redundant and repeating boilerplate that could be extracted into an inline function or into a shared testing library function
- Redundant tests
- Unnecessarily complex tests
- You generally should not be testing deprecation. If you drop some code, drop its tests and don't replace those tests with tests that test that the thing is deprecated
- Unit tests should be thorough, but they are not free to maintain. When designing tests and planning for what tests to write, you should consider what will and will not create worthwhile churn:
  - Avoid hyperspecific tests against hardcoded fragile values; they create churn
  - Avoid granular content and numbers that are apt to go stale, such as file counts, test counts in tests, comments and docs alike
  - Avoid writing research finding journals in tests and comments
  - Avoid writing negative tests for fully deprecated features, generally speaking proper planning and type errors should catch gaps in deprecation
  - Never invent a value a closed schema would reject like error codes it can't through, an enum member, a discriminant. These are caught during compilation.
- When planning a new test suite, try to identify the common boilerplate you need before writing tests.
- If in the prcess of writing tests you see repeating boilerplate, extract it into a function. This becomes mandator if more than 3 tests share the same boilerplate
- **A test that cannot fail is worse than a missing one**, because it reads in review as coverage. If you cannot say what edit would turn a test red, it is not coverage. The way to find out is to make that edit and watch it fail — a catalogue of shapes to pattern-match against was tried here and is deleted: it produced confident findings from regex hits, and its taxonomy got cited in place of running the test.
- **Do not test that a value is a value.** An assertion whose _actual_ side is a configuration constant — or a call that only returns one — restates the declaration and protects nothing; retuning the constant just makes someone edit the test. Assert what the code COMPUTES from it. The exception is a constant that is a contract with something outside this repo (a wire format, an external API's spelling), where nothing in the tree derives the value and getting it wrong is a live failure.
- Don't ignore broken tests unrelated to your work if they're easy to fix.
- Coordinating main agents should run full suites before a merge, but for mid-iteration checks, filter to the tests related to your change rather than running the full suite. Hold the expensive suites — full E2E, Playwright — until you finish a feature or hit a milestone. **Scope is not the only cost; frequency is the other one.** A filtered run you repeat after every read is still the dominant line item in this repo's wall clock. Run tests when you have changed the code they cover, and read the run you already have instead of taking a second one.
- Subagents do not have to run full test suites, instead the agents that coordinate subagents can run them when the feature work and/or a full lane or phase is complete. Subagents should, before reporting complete, run the unit tests that relate to their work and run the `check` script if they modified code (`check` and not `check:full`, `check:full` is what operaor agents run)

### Scripts

- One-shot scripts say so in a comment at the top and are deleted after use — unless you can articulate in that comment why it should be kept, and when it will be safe to delete.
- Reusable maintenance scripts stay tracked, have a package script or clear invocation, default to dry-run when destructive, and document when to run.
- Scripts log what they're doing and their progress, especially long-running ones. Don't silently absorb errors, even in a one-shot.
- If you start a long-running background job, use CronCreate to schedule check-ins.

### Docs

- Keep documentation current after major feature or architecture changes.
- Be direct and concise, so long as it doesn't cost usability, legibility, accuracy or quality.
- Durable docs carry durable detail only, such as structure, architecture, and vocabulary, standards. Fragile content such as hardcoded counts, timings and reasoning logs don't belong in them.
- Durable docs should not be treated as a journal of research findings, they should instead focus on current state. If history/process is necessary context, it should be kept concise.
- When determining if you should document something or not, Ask whether what you're writing is genuinely useful to a future reader.
- **Never expose personal details** — username, absolute home paths, unrelated software — in committed documentation.
- Docs are not free to build and maintain. You should err on the side of creating them when in doubt, but if something isn't going to be useful as a durable record for known work or the near future, it.
- If you see minor errors/issues in a doc you're working on, you can fix it on the fly unless it requires deep research to correct.
- If the user makes a very significant change to the specs for planned work, related work in the associated plan should be reviewed and updated
- Avoid prose and preambles in documentation, communicate the key information clearly and succinctly

### Memory

- Do not store transient numbers, like test counts, file counts, run times, in memory since they go stale frequently and creates churn to maintain.
- Subagent coordination and research logs should be tracked in docs or not at all (depending on the size of the task and the fan out complexity) rather than in memory
- If you see something incorrect in memory, you should ask yourself if it adds durable value and cite where it's been used, and generally lean towards cutting it than fixing it as truly durable memories are rarely incorrect.

### Plans

- Plans are not durable docs. They are written before work starts, updated as it progresses, purged when the work is done.
- You will likely have to iterate on new plans a few times before they're adopted. In this early planning phase on you don't need to record the process behind your research, just update items with the latest facts.
- New plans can be committed directly to main unless you're already on a worktree/branch
- Subagents mark their items complete as their work merges to main and can record major progress and stumbling blocks in plan docs
- When a plan gets to >3k lines while mid execution, consider running a subagent to summarize/purge/update transient comments, research findings, and other bloat that might accumulate as subagents write to the plan to communicate their progress to parents and others. At 5k+, this becomes mandatory, no plan should be that long
- When writing plans directly to main stage **and** commit with explicit pathspecs (`git commit -m "..." -- <paths>`) so you don't sweep unrelated work into your commit
- Specs will usually be read by a human. Implementation plans are usually not read by humans in depth. You should avoid verbosity and prose in both specs and plans, and especially in plans as whatever you write is likely going to be consumed by an agent, and unnecessary text means token churn

### TypeScript

- Don't use `any` or cast to `any` unless explicitly instructed.
- Avoid type casting as a solution to type errors unless it's genuinely necessary.
- Avoid `@ts-expect-error`, `@ts-ignore` and `@ts-nocheck`. Fix the type instead.
- Derive types from Zod schemas with `z.infer<typeof schema>` rather than declaring them separately, so the schema and the type can't drift.

### Architecture

pnpm workspace; Turborepo runs the tasks defined in `turbo.json`.

- `apps/frontend` — Vite + React + TypeScript
  - `src/app` — app shell: tab bar and screen switching
  - `src/sticker-creation` — the drawing screen: canvas engine (`canvas/`), tools and drawers (`tools/`), sealing (`sealing/`)
  - `src/sticker-board` — the sticker board, its stat board, sticker detail and placement; someone else's sticker board and its cork back; the sticker detail's timelapse, which plays how a sticker was drawn (`timelapse/`)
  - `src/explore` — Explore: artist search, today's stickers, this week's leaderboards and the activity feed
  - `src/giving` — Giving: the give sheet and gift bag, the gift message, and sending it through LINE's friend picker; the give sheet and sticker picker on someone else's board
  - `src/offers` — the offer sheet on someone else's board (ask, swap or offer gratitude); UI only, sent nowhere yet
  - `src/gratitude` — the (Gratitude) Mini-game: its rules, input, effects and screen; how it plays, scores and records, and where to tune it, is in `docs/gratitude-mini-game-design-doc.md`. `replay/` plays a recorded combo back through the same engine, inside the Transfer Trail's open card (the gratitude replay)
  - `src/performance` — the performance recorder, switched on from the stat board's developer slip: frame intervals, slow frames and what happened around each, for phones where LINE's browser has no developer tools
  - `src/line` — LIFF: starts before the app renders and holds it until LINE has logged the person in. The dev server uses real LINE too, through a LIFF app whose endpoint is the dev server (`apps/frontend/.env.example`)
  - `src/identity` — who the person is: the LINE profile, and the Privy sign-in, which trades LINE's ID token at the auth server for a Privy JWT (Privy's SDK loads only after the board)
  - `src/shop` — the Shop: the reserve tickets section and your ticket purchases, the coming-soon shelves and their previews, and the Sui credit
  - `src/tickets` (the tickets, their cards, the reserve ticket checkout and the ticket purchases list), `src/stickers` (display formatting, and the sticker's material: the figure, its live resin and the shared light), `src/payments`
  - `src/i18n` — the catalog (`strings/`), the i18next instance, the app's language and its formatters; `apps/frontend/scripts/` holds the catalog's export and import
  - `src/icons` — one icon per file; `src/styles` — CSS shared across features
- `packages/db` — Drizzle schema (`src/schema/`), migrations (`drizzle/`) and typed database client (`@drawing-app/db`)
- `apps/api` — the REST API (`@drawing-app/api`): Hono on Node 24. `createApp(deps)` in `src/app.ts`, one router per route group in `src/routes/`, and every outside service behind `AppDeps` (`src/deps.ts`). `pnpm dev` runs it on port 8788 beside the frontend, which reaches it through Vite's `/api` proxy. It reads `apps/api/.env.example`, then a gitignored `apps/api/.env` that overrides it key by key (`SESSION_SECRET` of 32+ characters, `LINE_CHANNEL_ID`, `IMAGE_DIR`, `CDN_BASE_URL`). With `DEV_SIGN_IN=on`, as in the example, it also trusts the dev ID tokens that LIFF Mock hands out on the dev server for `?as=<name>`, so anyone can sign in as anyone; LINE's own tokens still go to LINE, and `deploy.sh` and `deploy-api.sh` refuse any box config that mentions it. LIFF Mock answers for LINE on the dev server unless `apps/frontend/.env` sets `VITE_LIFF_MOCK=off`; `?as=alice` and `?as=bob` are two people in windows that don't share cookies, such as a normal and a private window: tabs of one window share the API's session, so the last sign-in wins. It applies pending migrations when it starts. Sealing writes a sticker's five images as files in `IMAGE_DIR`, named by the sticker PNG's content hash; `createServer` serves them publicly at `/api/images/`, in front of the routes, and the server log at `/api/logs`: the box's journal for `drawing-api` and `sticker-auth`, newest line first, as `journalctl --reverse` prints it, public so agents can read it while troubleshooting. `@drawing-app/api/client` is its typed client (`createApiClient()`), built from the routes, and exports the contract's types. `./deploy/deploy-api.sh` runs it on the box behind `/api/`, with the database in `/srv/drawing-api/data/` and the images in `/srv/drawing-api/images/`, and `deploy.sh` runs that too. The frontend answers everything from it through that client (`apps/frontend/src/api/httpApi.ts`), after signing in with LINE (`SessionGate`); nothing lives on the device but a drawing in progress
- `docs/database-schema-and-rest-api.md` — the planned database schema and REST API, for UI work until they're built; delete it then and point here at `packages/db` and the API
- `packages/*` — shared workspace packages
- `deploy/` — `./deploy/deploy.sh` builds the frontend and the LINE → Privy auth server (`packages/sticker-chain`), publishes both behind the LIFF app's endpoint, then checks the box and the public URL serve them; the box's login and the chat menu switch's secrets go in the gitignored `deploy/.env`, and the auth server's signing key stays on the box. `deploy/line/` holds the returning-user chat menu, in English and Japanese, and `create-returning-menu.sh en|ja`, which makes one in LINE; the auth server links the one in the app's language. A menu's image can't be replaced, so a new image means a new menu and a new ID in `deploy/sticker-auth.env`

### Toolchain

- Runtime is **pnpm**
- Node is **24 LTS**, one exact version in the root `package.json`'s `devEngines.runtime`: pnpm runs every script on it, and downloads it when it's missing. `deploy/install-node.sh` installs the same version on the box under `/usr/local/lib/nodejs/` for sticker-auth and drawing-api; the box's `/usr/bin/node` stays NodeSource's Node 22, which other projects there run on
- Tests are **vitest**
- Monorepo tech is turborepo
- Frontend is **Vite** + **React**
- Lint is **oxlint**, type-aware (`pnpm lint`); format is **oxfmt** (`pnpm format`). A pre-commit hook runs both on staged files. Don't downgrade a rule for a file in `.oxlintrc.json` to get a commit through; fix the code
- Drizzle for typed database clients, on SQLite via better-sqlite3
- `pnpm check` runs lint, typecheck, tests and the format check; `pnpm check:full` adds the production build and a knip report of unused code
- `pnpm db:migrate` applies `packages/db/drizzle/` to the local database (`data/drawing-app.db`). After a schema change, `pnpm --filter @drawing-app/db db:generate` writes the migration; a new table's `updated_at` trigger goes in a custom migration (`drizzle-kit generate --custom`), from `updatedAtTriggerStatements`

### Git

- Conventional commits — `feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `perf:` — one per completed task in a plan.
- Prefer the superpowers skills for planning.
- After finishing a large batch of work in a worktree, you should squash into a few key representative commits before merge
- Worktrees, local branches, specs and plans can be cleared once merged.
- Interactive git flags (`-i`) aren't supported in this environment.

## Fan out standards

Use subagents when tasks can run in parallel, require isolated context, or involve
independent workstreams that don't need to share state. For simple tasks, sequential
operations, single-file edits, or tasks where you need to maintain context across steps,
work directly rather than delegating.

Parents that spawn subagents should regularly check in on progress, make sure they are on track to complete their work, and keep them up to date with the latest context and developments across the project(s). Subagents should also update checklists in plan files that they own/are participating in.

If a subagent is running for >30m, it's generally a sign that it was given too broad of a task to complete. If it's running for >1h, direct intervention is usually needed. Subagents will regularly create worktrees to isolate their work. Those worktrees should be pruned when they're merged into the parent branch and/or main.

Subagents isn't the only way to optimize fan out, both subagents and parents can also improve speed + reduce costs with parallel tool calls:
<use_parallel_tool_calls>
If you intend to call multiple tools and there are no dependencies between the tool
calls, make all of the independent tool calls in parallel. Prioritize calling tools
simultaneously whenever the actions can be done in parallel rather than sequentially.
For example, when reading 3 files, run 3 tool calls in parallel to read all 3 files into
context at the same time. Maximize use of parallel tool calls where possible to increase
speed and efficiency. However, if some tool calls depend on previous calls to inform
dependent values like the parameters, do NOT call these tools in parallel and instead
call them sequentially. Never use placeholders or guess missing parameters in tool
calls.
</use_parallel_tool_calls>

## Additional guidance

- Your context window will be automatically compacted as it approaches its limit, allowing
  you to continue working indefinitely from where you left off. Therefore, do not stop
  tasks early due to token budget concerns. As you approach your token budget limit, save
  your current progress and state to memory before the context window refreshes. Always be
  as persistent and autonomous as possible and complete tasks fully, even if the end of
  your budget is approaching. Never artificially stop any task early regardless of the
  context remaining.

### Verification Before Claiming

- Never state a measured number (timings, disk usage, item counts, magic constants) unless you produced it from a command run in this session. Paste the exact command and its output next to the claim.
- If a constant or threshold cannot be derived, say "unverified guess" explicitly instead of presenting it as calibrated.
- Before concluding a feature/behavior is absent, confirm your search covered non-source files (index.html, bundled/vendored assets, minified dist) — grep excludes are the usual reason for a false negative.
