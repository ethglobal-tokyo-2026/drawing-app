# LINE chat menus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the official account's chat, someone new sees the one button "Open Sticker Board" (the current default menu). Someone who already has an account sees three tiles, Draw, My board and Explore, each opening the app on that screen. Approved by ad0ll on 2026-09-26: "Yeah can you do that. For user existence we can check privy until we have the users table".

**Architecture:**

- "Has an account" means Privy has a user whose custom auth ID is the person's `line_` subject.
- After the app signs in to Privy, it POSTs the LINE ID token to the auth server's new `POST /v1/auth/line-menu`. The server verifies the token with LINE, looks the person up in Privy (app secret), and links the returning-user menu to their LINE user ID through the Messaging API.
- The menu image and its creation script live in `deploy/line/`.
- The app opens the screen named by the path: `/draw`, `/explore`, and anything else for the board.

**Tech Stack:** Node 22 auth server (`packages/sticker-chain`), the Messaging API (rich menus, stateless channel tokens), Privy's REST API, React 19.

**Facts (checked 2026-09-26):**

- **Linking a menu to a user:**
  - `POST https://api.line.me/v2/bot/user/{userId}/richmenu/{richMenuId}`. A per-user menu beats the default.
  - It returns 200 without linking for anyone who hasn't added the account as a friend.
  - `GET /v2/bot/user/{userId}/richmenu` reads a user's current menu back.
- **Menu images:** PNG or JPEG, 800–2500 wide, at least 250 high, aspect ratio 1.45 or more, 1 MB or less. They're uploaded to `api-data.line.me`, and a menu's image can't be replaced.
- **Privy lookup:** `POST https://api.privy.io/v1/users/custom_auth/id` with `{ custom_user_id }`, Basic auth (app ID and secret) and `privy-app-id`. Privy's API refuses some default user agents, so send one.
- **LIFF paths:** `https://liff.line.me/{liffId}/draw` arrives as `?liff.state=…`. `liff.init()` then restores the path onto the endpoint.

---

### Task 1: The returning-user menu (agent, `deploy/line/`)

- [ ] `returning-menu.html` renders the prototype's `richMenuHTML` at 2500 × 843:
  - three tiles, Draw (Seal), My board (Pink) and Explore (Aqua), with the registry's icons, unedited;
  - labels in Mona Sans 800 at width 112, and a "3 a day" dot on Draw.
- [ ] `returning-menu.png` is rendered from the HTML: exactly 2500 × 843, under 1 MB, and compared with the prototype.
- [ ] `create-returning-menu.sh`: `--print` prints the menu object. By default it validates the object, creates the menu, uploads the PNG and prints the new ID. It never sets the default or links anyone.
  - Areas: three equal columns.
  - Links: `/draw`, the root, and `/explore` on `https://liff.line.me/2011732197-P98cxGpu`.

### Task 2: The switch (agent, `packages/sticker-chain`, `deploy/`)

- [ ] `privySubject(channelId, lineUserId)` is exported from `line-privy-jwt.ts` and used by both the issuer and the menu switch.
- [ ] `src/line-menu.ts` handles `POST /v1/auth/line-menu` `{ idToken }`:
  - verify with LINE;
  - look the person up in Privy;
  - link the menu, then read it back.
- [ ] Its answers:
  - `200 { menu: "returning" }`;
  - `200 { menu: "new", reason: "not_signed_up" | "not_a_friend" }`;
  - `401 line_auth_failed`, `403 origin_not_allowed`, `503 menu_switching_off`;
  - `502 privy_lookup_failed | line_menu_link_failed`.
  - Every upstream call gets a 5 s timeout. Nothing secret or token-like is logged.
- [ ] `start-auth-server.ts` reads `PRIVY_APP_SECRET`, `LINE_MESSAGING_CHANNEL_ID`, `LINE_MESSAGING_CHANNEL_SECRET` and `LINE_RETURNING_RICH_MENU_ID`. When any is missing, the route answers 503.
- [ ] `deploy.sh` installs those secrets from the gitignored `deploy/.env` as `/srv/sticker-auth/secrets.env` (mode 600) and restarts only on a change. The unit reads it as an optional `EnvironmentFile`. `deploy/.env.example` documents them.
- [ ] Tests with a fake fetch cover each answer.

### Task 3: The app (coordinator, `apps/frontend`)

- [ ] `app/openedView.ts`: `viewFromPath("/draw" | "/explore" | …)`. App starts on that view and resets the address to `/`.
- [ ] `line/chatMenu.ts`: `requestReturningMenu()` never throws, and its status store is read by LineDetails's "Chat menu" row. PrivySession calls it once per page load after sign-in.
- [ ] Tests: the path mapping (a contract with the menu's links), and the request (one POST with the ID token, each answer mapped, never throws).

### Task 4: Integrate and verify

- [ ] Review both agents' branches and run a code review of the whole change.
- [ ] Merge, deploy, create the menu, set `LINE_RETURNING_RICH_MENU_ID` in `deploy/sticker-auth.env`, and deploy again.
- [ ] Dev server with LIFF Mock: `/draw` and `/explore` open those screens.
- [ ] After ad0ll opens the app, `GET /v2/bot/user/{their id}/richmenu` returns the new menu, and the chat shows the three tiles.
- [ ] Remove the worktrees and branches, then this plan.
