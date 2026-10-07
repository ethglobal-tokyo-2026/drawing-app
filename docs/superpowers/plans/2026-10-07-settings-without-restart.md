# Settings Without a Restart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saving Language or Show 18+ stickers on the Settings note applies in place: no `location.reload()`, no reopening on Settings.

**Architecture:** SessionGate gets its `me` setter back (`useSetMe`). The note saves through one path: save to the account, `setMe(answer)`, then a per-setting `apply`. Every screen then follows `me`:

- Language: `i18next`, plus a rebuilt sticker tray and board names made again.
- 18+: each query whose images the server picks by the opt-in has the opt-in in its key: your board, gifts on their way and Explore.
- Your board shows NSFW drawings only from a load whose owner (you) has the opt-in you have now.

**Tech Stack:** React 19, react-i18next, Vitest + happy-dom, Hono + Drizzle (API).

---

## Decisions this plan takes (differs from the brief where marked)

1. **New `followLanguageChoice(choice)`**, not `followAccountLanguage`: that one returns early when the phone already keeps `choice`. After a storage failure at sign-in, that early return would skip the switch.
2. **Queries keyed by the opt-in, not `myStickerBoardChanged()`** (differs). `refresh()` keeps the old answer on screen until the new one lands, so the pending badge would show old drawings. A new key drops the old answer at once and loads again. This covers your board, gifts on their way and Explore.
3. **Explore keys its `explore` query, not only `<Stickers>`** (differs). The first page (`explore.data.pile`) is shaped by the opt-in too. Explore stays mounted under `<Activity>` and shows its last answer until a reload lands. A loading key also unmounts `<Stickers>`, which drops the older pages.
4. **Hiding rule:** `adopted.owner.nsfwOptIn !== me.nsfwOptIn` hides every NSFW drawing derived from the board's state. The board route reads the owner and the viewer in one synchronous handler, so the owner's opt-in is the one the URLs were picked for. This also closes an existing leak: a board kept before an opt-out on another device.
5. **The tray is rebuilt on a language change and carries its `seen` set**, so stickers already shown don't come back as NEW.
6. **"Someone" (a deleted account) follows the language** by adopting the board's last answer again on a language change. No other holder keeps it past a remount.
7. **Errors on the note and on the board's alerts are kept raw and translated at render.**
8. **Room for later switches:** `save(setting, to, request, apply)` is general. The Kyoto Seika Practice Mode switches add a `Setting`, a `Shown` field, and an `apply` that calls `tickets.refresh()`.

Each task lists its files. A path that doesn't start with `apps/` or name `DESIGN.md` is under `apps/frontend/src/sticker-board/`, and a test file sits beside the file it tests. Test commands: `pnpm --filter @drawing-app/api exec vitest run <files>`, `pnpm --filter frontend exec vitest run <files>`.

---

### Task 1: Clearing the language choice takes LINE's language and relinks the chat menu

**Files:** Modify `apps/api/src/routes/session.ts:42-43,177-190`, `apps/frontend/src/api/apiClient.ts:66-67`, `apps/frontend/src/api/httpApi.ts:151-155`, `apps/frontend/src/sticker-board/stat-board/SettingsNote.tsx:148`. Tests: `apps/api/src/routes/{session,lineMenu}.test.ts`, `stat-board/SettingsNote.test.tsx`.

- [ ] **Step 1: Failing tests.** In `lineMenu.test.ts`'s `POST /api/me/language-choice` block, add `language: "en"` to the existing body and add:

```ts
it("moves the chat menu to LINE's language at once when the choice goes back to following LINE", async () => {
  expect(
    (await post("/api/me/language-choice", { languageChoice: null, language: "ja" })).status,
  ).toBe(200);
  expect(await menuAfterLinks()).toBe(TEST_CHAT_MENU_IDS.ja["3"]);
});
```

In `session.test.ts` ("your language choice"), replace the two tests:

```ts
it("is null until you choose, comes with you, and null takes LINE's language from the device", async () => {
  const headers = await test.signInAs(insertUser(test.db, { language: "en" }));
  const me = () => getMe(headers);
  expect((await meIn(await me())).languageChoice).toBeNull();
  expect(
    await meIn(await setLanguageChoice(headers, { languageChoice: "ja", language: "en" })),
  ).toMatchObject({ languageChoice: "ja", language: "ja" });
  expect((await meIn(await me())).languageChoice).toBe("ja");
  expect(
    await meIn(await setLanguageChoice(headers, { languageChoice: null, language: "en" })),
  ).toMatchObject({ languageChoice: null, language: "en" });
});

it("refuses a language the app doesn't speak, and a body that leaves either out", async () => {
  const headers = await test.signInAs(insertUser(test.db));
  for (const body of [
    { languageChoice: "fr", language: "en" },
    { language: "en" },
    { languageChoice: null },
  ]) {
    expect(await refusalOf(await setLanguageChoice(headers, body))).toMatchObject({
      status: 400,
      error: "invalid_request",
    });
  }
});
```

In `SettingsNote.test.tsx`, expect `toHaveBeenCalledExactlyOnceWith("ja", "en")` and `(null, "en")`: `lineLanguage()` is `"en"` in tests.

- [ ] **Step 2: Run them; they fail.** Today Zod strips `language`, so the language stays `ja`, the menu stays English, and `{ languageChoice: null }` is accepted.
- [ ] **Step 3: Implement.**

```ts
// session.ts. Required, so a body that leaves either out is refused rather than clearing the
// choice. `language` is LINE's on the device, which the account takes while the choice follows LINE's.
const languageChoiceBody = userInput.pick({ languageChoice: true, language: true }).required();
// in the route: the person's language outside the app too, such as their chat menu's, from now on.
const { languageChoice, language } = c.req.valid("json");
//   .set({ languageChoice, language: languageChoice ?? language })   in place of the spread
//   void deps.lineChatMenu.relink(user.id);                           without the `if`
```

- `apiClient.ts`: `setLanguageChoice: (languageChoice: Me["languageChoice"], language: Me["language"]) => Promise<Me>`. Doc: "POST /api/me/language-choice: Settings' language, or null to follow LINE's, whose `language` the account then takes."
- `httpApi.ts` posts `{ json: { languageChoice, language } }`.
- `SettingsNote.tsx:148` calls `api.setLanguageChoice(choice, lineLanguage())`.

- [ ] **Step 4: Run the three files; they pass.**
- [ ] **Step 5: Commit:** `fix(api): clearing the language choice takes LINE's language and relinks the chat menu at once`

### Task 2: `useSetMe` replaces you in place

**Files:** Modify `apps/frontend/src/api/meContext.ts`, `apps/frontend/src/api/SessionGate.tsx:1,15,219-228`, `apps/frontend/src/api/testing.tsx:1-7,145-168`. Test: `apps/frontend/src/api/SessionGate.test.tsx`.

- [ ] **Step 1: Failing test.** In `SessionGate.test.tsx`, give `render`'s options `app = <Board />`, render `{app}` in place of `<Board />`, then add:

```tsx
/** Turns your NSFW opt-in on in place, as a setting saved on the Settings note does. */
function OptInSwitch() {
  const you = useMe();
  const setMe = useSetMe();
  return (
    <button type="button" onClick={() => setMe({ ...you, nsfwOptIn: true })}>
      {you.nsfwOptIn ? "18+ on" : "18+ off"}
    </button>
  );
}

it("keeps a setting saved in place when an earlier profile refresh finishes afterward", async () => {
  const { signIn, finish } = pendingSignIn({ ...me, lineDisplayName: "Alice B" });
  const host = render(session({ signIn }), undefined, undefined, {
    early: earlyAs(me),
    claims: { ...ALICE_CLAIMS, name: "Alice B" },
    app: <OptInSwitch />,
  });
  await settle();
  expect(signIn).toHaveBeenCalledOnce();
  await act(async () => host.querySelector("button")?.click());
  expect(host.textContent).toBe("18+ on");
  finish();
  await settle();
  expect(host.textContent).toBe("18+ on");
});
```

- [ ] **Step 2: Run it; it fails** (`useSetMe` doesn't exist).
- [ ] **Step 3: Implement.** In `meContext.ts`, restore `SetMeContext` and `useSetMe` exactly as `git show 02d8cb4f^:apps/frontend/src/api/meContext.ts` has them. Give `useSetMe` the doc "Replaces you with the server's newer answer, as a setting saved on the Settings note does."

In `SessionGate.tsx`, add `const setReadyMe = useCallback((me: Me) => setState({ step: "ready", me }), []);`. Render `<MeContext value={state.me}><SetMeContext value={setReadyMe}>{children}</SetMeContext></MeContext>`. The background refresh's existing `state.me === me` check already drops its answer once `setMe` has replaced you.

In `testing.tsx`, bring back `MeHolder` from `git show 02d8cb4f^:apps/frontend/src/api/MeHolder.tsx` as a local, unexported component:

- add a `replace: Ref<(me: Me) => void>` prop, set with `useImperativeHandle(replace, () => setCurrent, [])`;
- in `renderWithApi`, add `const replace = createRef<(me: Me) => void>();` and wrap with `<MeHolder me={me} replace={replace}>`;
- return `setMe: (next: Me) => act(() => replace.current?.(next))`, documented as: replaces you, as a setting saved on the Settings note does.

- [ ] **Step 4: Run `SessionGate.test.tsx` and `SettingsNote.test.tsx`; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): useSetMe replaces you in place, for settings that apply without a restart`

### Task 3: `followLanguageChoice`, and English lets the Japanese face go

**Files:** Modify `apps/frontend/src/i18n/pageLanguage.ts`, `apps/frontend/src/i18n/japaneseFont.ts`. Test: `apps/frontend/src/i18n/pageLanguage.test.ts`.

- [ ] **Step 1: Failing tests.** Add `localStorage.clear()` to `afterEach`. Replace the font test, and add a switch test:

```ts
it("asks for the Japanese face while the app is in Japanese, once, and lets it go in English", async () => {
  followLanguageOnPage(() => Promise.resolve());
  expect(japaneseFontLinks()).toHaveLength(0);
  await i18next.changeLanguage("ja");
  await i18next.changeLanguage("ja");
  expect(japaneseFontLinks()).toHaveLength(1);
  await i18next.changeLanguage("en");
  expect(japaneseFontLinks()).toHaveLength(0);
  await i18next.changeLanguage("ja");
  expect(japaneseFontLinks()).toHaveLength(1);
});

it("switches to a language choice, or to LINE's for none, even when this phone kept it already", async () => {
  keepChosenLanguage("ja");
  await followLanguageChoice("ja");
  expect(currentLanguage()).toBe("ja");
  await followLanguageChoice(null);
  expect(currentLanguage()).toBe("en");
});
```

- [ ] **Step 2: Run; both fail.**
- [ ] **Step 3: Implement.**

```ts
// japaneseFont.ts
/** Takes the Japanese face off the page, so English sets the odd Japanese glyph as an English start does. */
export function releaseJapaneseFont(doc: Document = document): void {
  for (const link of doc.head.querySelectorAll("link"))
    if (link.href === JAPANESE_FONT_CSS) link.remove();
}
// pageLanguage.ts
/** Switches the app to the language `choice` picks: the choice, else LINE's. */
export const followLanguageChoice = (choice: Language | null): Promise<void> =>
  switchTo(startLanguage(choice, line));
```

In `followAccountLanguage`, end with `await followLanguageChoice(choice);`. In `followLanguageOnPage`'s `apply`, use `if (language === "ja") requestJapaneseFont(); else releaseJapaneseFont();` and make its doc say "while it's Japanese".

- [ ] **Step 4: Run `pageLanguage.test.ts`; it passes.**
- [ ] **Step 5: Commit:** `feat(frontend): followLanguageChoice switches the app in place, and English lets the Japanese face go`

### Task 4: The sticker tray follows a language change

**Files:** Modify `tray/StickerTray.tsx:69-107`, `tray/trayEngine.ts:86-100,218`, `tray/trayProblem.ts`, `tray/trayPeel.ts:260`, `StickerBoard.tsx:529-533,932-948`. Tests: `tray/StickerTray.test.tsx`, `tray/trayProblem.test.ts`.

- [ ] **Step 1: Failing tests.** In `StickerTray.test.tsx`, import `onTestFinished` from vitest, `i18next` from `../../i18n/i18n` and `stickerBoard` from the catalog:

```tsx
it("renames its Zipper and folder tabs when the app's language changes, keeping what it has shown", async () => {
  onTestFinished(async () => {
    await i18next.changeLanguage("en");
  });
  render(stickersWithGifts(6));
  await openAndShut();
  await act(() => i18next.changeLanguage("ja"));
  expect(board.querySelectorAll(".tray")).toHaveLength(1);
  expect(board.querySelector(".zip__slider")?.getAttribute("aria-label")).toBe(
    stickerBoard.tray.zipper.ja,
  );
  expect(board.querySelector('.tray__tab[data-filter="gifts"]')?.textContent).toBe(
    stickerBoard.tray.filters.gifts.ja,
  );
});
```

It fails with `zipper.en` if the tray isn't rebuilt, and with `zipperNew.ja` if `seen` is lost. Rewrite `trayProblem.test.ts`, importing `onTestFinished` from vitest, `i18next` and `withBreakHints` from `../../i18n/i18n`, `errors` from the catalog, and `ApiError`:

```ts
const problem = (overrides: Partial<TrayProblem> = {}): TrayProblem => ({
  kind: "place",
  nos: [143],
  error: new Error("Canvas 2D context unavailable"),
  ...overrides,
});
// in the key test, `differing` becomes:
[
  { kind: "cut" },
  { nos: [143, 144] },
  { error: new Error("Another English") },
  { error: new ApiError(0, { error: "network" }) },
];

it("says why in the app's language at the time it's read", async () => {
  onTestFinished(async () => {
    await i18next.changeLanguage("en");
  });
  const offline = problem({
    error: new ApiError(0, { error: "network", detail: "Failed to fetch" }),
  });
  expect(trayProblemWords(offline).reason).toBe(withBreakHints(errors.network.en));
  await i18next.changeLanguage("ja");
  expect(trayProblemWords(offline).reason).toBe(withBreakHints(errors.network.ja));
});
```

In `StickerTray.test.tsx`'s problem tests, read through `trayProblemWords`. Use `[p.kind, p.nos, trayProblemWords(p).reason !== ""]`, and `problems.map(trayProblemWords)` equal to `[{ reason: errors.unexpected.en, detail: "Error: the connection is asleep" }]`.

- [ ] **Step 2: Run both; they fail.**
- [ ] **Step 3: Implement.** `trayProblem.ts`:

```ts
export interface TrayProblem {
  kind: "place" | "cut" | "seen";
  nos: readonly number[];
  /** Why, for the kinds whose sentence ends on it: kept as it failed, so its words follow the app's language. */
  error?: unknown;
  /** The English words behind it, for a report, where there's no error to read them from. */
  detail?: string;
}

/** Why a problem happened, in the app's language now, with the words behind it. */
export function trayProblemWords(p: TrayProblem): { reason: string; detail: string | undefined } {
  if (p.error === undefined) return { reason: "", detail: p.detail };
  if (p.error instanceof BoardNotReady)
    return {
      reason: i18next.t(($) => $.stickerBoard.tray.problem.boardNotReady),
      detail: undefined,
    };
  const { message, detail } = problemOf(p.error);
  return { reason: message, detail };
}

export const trayProblemKey = (p: TrayProblem) => {
  const { reason, detail } = trayProblemWords(p);
  return JSON.stringify([p.kind, p.nos, reason, detail]);
};
```

Delete `reasonOf`. Change `trayPeel.ts:260` to `problem({ kind: "place", nos: [s.no], error })`. In `StickerBoard.tsx`, `markSeen` uses `{ kind: "seen", nos: ..., error: failure }`. The alert uses `joinedDetails(trayProblems.map((p) => trayProblemWords(p).detail))` and `reason: trayProblemWords(p).reason`.

`trayEngine.ts`: add the option `seen = new Set<string>()`, documented as stickers this visit's trays have shown, carried across a rebuilt engine, and replace `const seen = new Set<string>();`. `StickerTray.tsx`:

```tsx
const { i18n } = useTranslation();
/** What this visit's trays have shown, so a tray rebuilt for a new language shows none of it as NEW. */
const seen = useRef(new Set<string>());
// …createTrayEngine(board, { …, seen: seen.current })
// The engine reads its words once, so a new language builds a new one.
}, [board, i18n.language]);
```

- [ ] **Step 4: Run `StickerTray.test.tsx`, `trayProblem.test.ts` and `StickerBoard.test.tsx`; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): the sticker tray follows a language change, and its problems say why in the language of the moment`

### Task 5: The board's names and alerts follow a language change

**Files:** Modify `StickerBoard.tsx:292,382,396-412,492-508,907-956`. Test: `StickerBoard.test.tsx`.

- [ ] **Step 1: Failing tests.** Import `i18next` and `withBreakHints` from `../i18n/i18n`, and `errors` and `api as apiStrings` from the catalog:

```tsx
describe("StickerBoard when the app's language changes", () => {
  afterEach(async () => {
    await i18next.changeLanguage("en");
  });

  it("names a deleted account's sticker in the new language", async () => {
    const gone: Person = { ...people.ken, handle: null, lineDisplayName: null };
    const theirs = boardSticker({ placement: at(0.5), sticker: sticker({ artist: gone }) });
    const view = await visitBoard(theirs);
    const label = () =>
      view.host
        .querySelector(`[data-sticker-id="${theirs.stickerId}"]`)
        ?.getAttribute("aria-label");
    expect(label()).toContain(apiStrings.person.unnamed.en);
    await act(() => i18next.changeLanguage("ja"));
    expect(label()).toContain(apiStrings.person.unnamed.ja);
  });

  it("says why a spot didn't save in the new language", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const view = renderWithApi(
      <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />,
      emptyApi({
        // The board gives an unplaced sticker a spot, and saves it.
        stickerBoard: () =>
          Promise.resolve({
            owner: TEST_OWNER,
            boardStickers: [boardSticker({ placement: null })],
          }),
        saveStickerPlacement: () =>
          Promise.reject(new ApiError(0, { error: "network", detail: "Failed to fetch" })),
      }),
    );
    unmount = view.unmount;
    await act(async () => {});
    const alert = () => view.host.querySelector(".board-alerts")?.textContent;
    expect(alert()).toContain(withBreakHints(errors.network.en));
    await act(() => i18next.changeLanguage("ja"));
    expect(alert()).toContain(withBreakHints(errors.network.ja));
  });
});
```

- [ ] **Step 2: Run; both fail.**
- [ ] **Step 3: Implement.** Adopt the answer again when the language changes:

```ts
/** The language the board's names were made in: "Someone", a deleted account's, is the app's word. */
const [namedIn, setNamedIn] = useState(i18n.language);
if (answer && (answer !== adoptedAnswer || namedIn !== i18n.language)) {
  setAdoptedAnswer(answer);
  setNamedIn(i18n.language);
  // …the rest of the adoption as it is
```

Every spot is held over, so nothing moves or saves, and `followBoardAssembly` does nothing once the board is complete. Keep failures raw:

- `unsaved` becomes `ReadonlyMap<string, ApiError>`, set with `.set(sticker.id, failure)`.
- `checkFailure` becomes `ApiError | null`, set with `setCheckFailure(failure)`.
- At render, `const unsavedErrors = unsavedStickers.flatMap((s) => unsaved.get(s.id) ?? []);` feeds `detail={joinedDetails(unsavedErrors.map(errorDetail))}` and `reasons: [...new Set(unsavedErrors.map(errorMessage))].join("; ")`.
- The check's line uses `detail={errorDetail(checkFailure)}` and `reason: errorMessage(checkFailure)`.

Drop the now-unused `problemOf` and `Problem` imports.

- [ ] **Step 4: Run `StickerBoard.test.tsx`; it passes.**
- [ ] **Step 5: Commit:** `feat(frontend): the sticker board follows a language change: a deleted account's name and its alerts`

### Task 6: Your board fails closed when the NSFW opt-in changes (riskiest)

**Files:** Modify `apps/frontend/src/stickers/nsfw.ts`, `useMyStickerBoard.ts:31-41`, `StickerBoard.tsx:281-290,342,428-432,448,480`. Test: `StickerBoard.test.tsx`.

- [ ] **Step 1: Failing tests** (import `gift` from `testFixtures`, `forget` from `./lastBoard`):

```tsx
describe("StickerBoard when your NSFW opt-in changes", () => {
  const DRAWING = "https://box.test/drawing.webp";
  const VEILED = "https://cdn.test/veiled.webp";
  /** Your NSFW sticker as the server sends it to you opted in, or not. */
  const nsfwSticker = (optedIn: boolean) => {
    const s = sticker({ id: "nsfw", number: 7, nsfw: true, artist: TEST_OWNER });
    return {
      ...s,
      images: { ...s.images, webp: { ...s.images.webp, sticker: optedIn ? DRAWING : VEILED } },
    };
  };
  const boardFor = (optedIn: boolean): LoadedBoard => ({
    owner: { ...TEST_OWNER, nsfwOptIn: optedIn },
    boardStickers: [boardSticker({ placement: at(0.5), sticker: nsfwSticker(optedIn) })],
  });
  const sentFor = (optedIn: boolean) => ({
    gifts: [{ gift: gift(), sticker: nsfwSticker(optedIn), for: null }],
  });

  /** Your board opted in, its drawing on the board and on the badge; `later` answers each load after the first. */
  async function optedInBoard(later: ApiClient["stickerBoard"]) {
    onAPhone();
    const stickerBoard = vi
      .fn<ApiClient["stickerBoard"]>()
      .mockResolvedValueOnce(boardFor(true))
      .mockImplementation(later);
    const pendingGifts = vi
      .fn<ApiClient["pendingGifts"]>()
      .mockResolvedValueOnce(sentFor(true))
      .mockResolvedValue(sentFor(false));
    const view = renderWithApi(
      <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />,
      emptyApi({ stickerBoard, pendingGifts }),
      { ...TEST_ME, nsfwOptIn: true },
    );
    unmount = view.unmount;
    await act(async () => {});
    expect(view.host.innerHTML).toContain(DRAWING);
    return { view, stickerBoard };
  }
  const optOut = (view: ReturnType<typeof renderWithApi>) =>
    view.setMe({ ...TEST_ME, nsfwOptIn: false });
  afterEach(() => vi.useRealTimers());

  it("shows no NSFW drawing from the moment you opt out, until your board loads under the new setting", async () => {
    let answer: (board: LoadedBoard) => void = () => {};
    const { view, stickerBoard } = await optedInBoard(
      () => new Promise((resolve) => (answer = resolve)),
    );
    optOut(view);
    expect(view.host.innerHTML).not.toContain(DRAWING);
    expect(stickerBoard).toHaveBeenCalledTimes(2);
    await act(async () => answer(boardFor(false)));
    expect(view.host.innerHTML).toContain(VEILED);
    expect(view.host.innerHTML).not.toContain(DRAWING);
  });

  it("keeps them hidden, and says the board didn't load, when that load fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { view } = await optedInBoard(() =>
      Promise.reject(new ApiError(0, { error: "network", detail: "Failed to fetch" })),
    );
    optOut(view);
    await act(async () => {});
    expect(view.host.querySelector(".board-problem")).not.toBeNull();
    expect(view.host.innerHTML).not.toContain(DRAWING);
  });

  it("doesn't keep the board on this phone until it has loaded under the new setting", async () => {
    // A key's step is committed, which changes the board's stickers, once the keys go quiet.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { view } = await optedInBoard(() => new Promise(() => {}));
    optOut(view);
    forget();
    selectByKeys(view.host, "nsfw")("ArrowLeft");
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    expect(keptBoardFor(TEST_ME.id)).toBeNull();
  });

  it("hides them in the board kept on this phone when the setting changed after it was kept", () => {
    keepBoard(TEST_ME.id, {
      owner: toPerson({ ...TEST_OWNER, nsfwOptIn: true }),
      stickers: placeUnplaced(boardFor(true).boardStickers.map(toBoardSticker)).stickers,
    });
    onAPhone();
    const view = renderWithApi(
      <StickerBoard onDraw={() => {}} onOpenGift={() => {}} />,
      emptyApi({ stickerBoard: () => new Promise(() => {}) }),
    );
    unmount = view.unmount;
    expect(view.host.innerHTML).not.toContain(DRAWING);
  });
});
```

- [ ] **Step 2: Run; all four fail.** Each turns red again if its line goes: the derived `stickers` or the pending key; the hiding while `failed`; `imagesCurrent` in the keep effect; the comparison with the kept owner's opt-in.
- [ ] **Step 3: Implement.** `stickers/nsfw.ts`:

```ts
/** An image of nothing: what an NSFW sticker shows while its drawing waits for a load under your opt-in now. */
export const NO_DRAWING =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Stickers whose images were picked for the other NSFW opt-in, as they may show: each NSFW one
 * without its drawing, since the browser keeps a drawing it has shown and the blur is the server's.
 */
export const withoutNsfwDrawings = <S extends { nsfw: boolean; urls: StickerUrls }>(
  stickers: readonly S[],
): S[] => stickers.map((s) => (s.nsfw ? { ...s, urls: { ...s.urls, png: NO_DRAWING } } : s));

/** A query's key, for an answer the server shapes by your NSFW opt-in: a change loads it again, and the other's answer never shows. */
export const useNsfwOptInKey = (key: string): string =>
  `${key}?nsfw=${useMyNsfwOptIn() ? "on" : "off"}`;
```

In `useMyStickerBoard`, use `const key = useNsfwOptInKey("sticker-board/me");` as the query's key. In `StickerBoard.tsx`:

```ts
const optedIn = useMyNsfwOptIn(); // moved up from :342, above the state below
/** The board's stickers as loaded and moved; `stickers` is how they show. */
const [loaded, setStickers] = useState<BoardStickerView[] | null>(
  () => fromPhone?.stickers ?? null,
);
// …adopted, owner as they are. A load's owner is you, with the opt-in its images were picked for:
// the browser keeps a drawing it has shown, so until a load under your opt-in now is adopted, NSFW
// stickers show none, and the board isn't kept on this phone.
const imagesCurrent = owner === null || owner.nsfwOptIn === optedIn;
const stickers = useMemo(
  () => (loaded && !imagesCurrent ? withoutNsfwDrawings(loaded) : loaded),
  [loaded, imagesCurrent],
);
```

- The keep effect becomes `if (adopted && !adopted.fromPhone && imagesCurrent && loaded) keepBoard(account.id, { owner: adopted.owner, stickers: loaded });`, with deps `[account.id, adopted, imagesCurrent, loaded]`.
- `pending` keys as `useNsfwOptInKey("pending-gifts")`.
- Notices read `receivedGiftsOf(stickers ?? [])`, which gives the same given stickers as `adopted.stickers` (only placements differ) and is hidden. `noticeReceivesFromNow` keeps `adopted.stickers`: it records, it doesn't show.
- Every other reader (board face, tray, detail, Giving, gratitude) already takes `stickers`.

- [ ] **Step 4: Run `StickerBoard.test.tsx`, `stickers/` and `giving/`; they pass.**
- [ ] **Step 5: Commit:** `feat(frontend): your board shows no NSFW drawing loaded under the other opt-in, and loads again when it changes`

### Task 7: Explore starts its pile over when the opt-in changes

**Files:** Modify `apps/frontend/src/explore/ExploreScreen.tsx:614`. Test: `ExploreScreen.test.tsx` ("older days").

- [ ] **Step 1: Failing test** (import `TEST_ME`):

```tsx
it("starts the pile over from a fresh first page when your NSFW opt-in changes, showing none of it meanwhile", async () => {
  const explore = vi
    .fn<ApiClient["explore"]>()
    .mockResolvedValueOnce(firstPage)
    .mockReturnValue(new Promise(() => {}));
  const host = await openExplore(firstPage, {
    explore,
    explorePile: () => Promise.resolve(lastPage),
  });
  await reachEnd();
  expect(layersOf(host)).toHaveLength(3);
  view?.setMe({ ...TEST_ME, nsfwOptIn: true });
  await wait(0);
  expect(explore).toHaveBeenCalledTimes(2);
  expect(layersOf(host)).toEqual([]);
});
```

- [ ] **Step 2: Run; it fails.**
- [ ] **Step 3: Implement:**

```ts
// The pile's images are picked by your NSFW opt-in: a change loads it from its first page again,
// and the old pages go with <Stickers>, which the loading state unmounts.
const explore = useApiQuery(useNsfwOptInKey("explore"), (api) => api.explore());
```

- [ ] **Step 4: Run `ExploreScreen.test.tsx`; it passes.**
- [ ] **Step 5: Commit:** `feat(frontend): Explore loads its pile again when your NSFW opt-in changes`

### Task 8: The Settings note applies both settings in place; the restart goes

**Files:** Modify `stat-board/SettingsNote.tsx`, `stat-board/StatBoard.tsx:36-50,97`, `StickerBoard.tsx:99,320-325,1086`, `stat-board/settings-note.css:89-96`, `apps/frontend/src/i18n/strings/stickerBoard.ts:166-203`, `DESIGN.md:488`. Delete `stat-board/reopenOnSettings.ts`. Tests: `stat-board/SettingsNote.test.tsx`, `StickerBoard.test.tsx:268-280`.

- [ ] **Step 1: Failing tests.** In `SettingsNote.test.tsx`, drop `restart`, `takeReopenOnSettings` and every restart assertion. Render `<SettingsNote />`, and add `const statuses = (host: HTMLElement) => [...host.querySelectorAll('[role="status"]')].map((p) => p.textContent);`. The language tests:

```tsx
it("saves a choice to your account, keeps it on this phone, and switches the app to it in place", async () => {
  const setLanguageChoice = saving();
  const host = render(setLanguageChoice);
  await choose(host, "日本語");
  expect(setLanguageChoice).toHaveBeenCalledExactlyOnceWith("ja", "en");
  expect(readChosenLanguage()).toBe("ja");
  expect(currentLanguage()).toBe("ja");
  expect(option(host, "日本語").checked).toBe(true);
  expect(statuses(host)[0]).toBe(
    i18next.t(($) => $.stickerBoard.settings.language.applied, { language: "日本語" }),
  );
});

it("switches even when this phone can't keep the choice, and says so in the new language", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal("localStorage", {
    setItem: () => {
      throw new DOMException("The storage is full", "QuotaExceededError");
    },
  });
  const host = render(saving());
  await choose(host, "日本語");
  expect(currentLanguage()).toBe("ja");
  expect(alert(host)).toContain(stickerBoard.settings.language.notKept.ja);
  expect(host.textContent).toContain("The storage is full");
});
```

- "clears both with Same as LINE" becomes "goes back to following LINE": with `keepChosenLanguage("ja")` and the app in Japanese, choosing "LINEと同じ（English）" calls `setLanguageChoice(null, "en")`, clears the kept choice and switches to English.
- The failure test keeps its assertions and adds `expect(currentLanguage()).toBe("en")`.
- The 18+ "saves it" test expects `switchOf(host).checked` true, `keptBoardFor(TEST_ME.id)` null, and `statuses(host)` equal to `["", stickerBoard.settings.nsfw.shown.en]`.
- The "turns it off" test expects `["", stickerBoard.settings.nsfw.blurred.en]`.
- `checked` after the save can only hold if `setMe` ran.

In `StickerBoard.test.tsx`, delete "wait for the front when the board opens turned over…" and its `reopenOnSettingsNextStart` import: a board can no longer open turned over. "end with a turn of the board while they play" still covers chips and turns.

- [ ] **Step 2: Run `SettingsNote.test.tsx`; it fails.**
- [ ] **Step 3: Strings.** In `settings`, delete `language.restarts` and `nsfw.restarts`, reword `notKept`, and add:

```ts
/** Settings note: the status line once a language choice has saved and the app has switched to it; {{language}} is that language's own name, such as "日本語" */
applied: { en: "Croquis is now in {{language}}.", ja: "表示を{{language}}に切り替えました。" },
/** Settings note: the alert when the language saved and the app switched, but this phone couldn't keep it for its next start, over the phone's own words for a report */
notKept: {
  en: "Your language is saved, but this phone couldn’t keep it: the next time you open Croquis, it may start in the old one for a moment.",
  ja: "言語は保存しましたが、この端末には残せませんでした。次にクロッキーをひらいたとき、少しのあいだ前の言語で表示されることがあります。",
},
// under nsfw:
/** Settings note: the status line once Show 18+ stickers has been turned on and saved */
shown: { en: "18+ stickers now show unblurred.", ja: "18+のシールをぼかしなしで表示します。" },
/** Settings note: the status line once Show 18+ stickers has been turned off and saved */
blurred: { en: "18+ stickers are blurred now, yours too.", ja: "18+のシールを、自分のものも含めてぼかして表示します。" },
```

- [ ] **Step 4: SettingsNote.** Delete `useOpenInView`, the `restart` and `openedInView` props, the `saved` and `savedOptIn` state, and both `settings-note__restarts` paragraphs. Imports now include `type Me`, `useMe`/`useSetMe`, `currentLanguage`, and `followLanguageChoice`/`lineLanguage`. `useEffect`, `useEffectEvent` and `reopenOnSettings` go.

```tsx
/** The settings on the note, each saved to your account and applied in place; one saves at a time. */
type Setting = "language" | "nsfw";
/** The account's settings as the note shows them: a saving one shows its new value. */
type Shown = Pick<Me, "languageChoice" | "nsfwOptIn">;
/** Why a setting didn't take: kept as it failed, so its words follow the app's language. */
type Failure = { kind: "notSaved" | "notKept"; error: unknown };
type Status =
  | { step: "idle" }
  | { step: "saving"; setting: Setting; to: Partial<Shown> }
  | { step: "applied"; setting: Setting }
  | { step: "failed"; setting: Setting; failure: Failure };

/**
 * Your Settings, the first paper under the stats on your cork back. Each setting saves to your account
 * and applies in place: `me` takes the server's answer, and every screen follows it. A language is
 * also kept on this phone for the first screens of the next start.
 */
export function SettingsNote() {
  // …t, api, id, note, title, reveal as they are
  const me = useMe();
  const setMe = useSetMe();
  const [status, setStatus] = useState<Status>({ step: "idle" });
  /** Saves a setting, then applies it: `me` takes the answer, and `apply` does what it changes on this phone. */
  const save = async (setting: Setting, to: Partial<Shown>, request: () => Promise<Me>,
    apply: () => Promise<Failure | null> | Failure | null) => {
    if (status.step === "saving") return;
    setStatus({ step: "saving", setting, to });
    let saved: Me;
    try {
      saved = await request();
    } catch (error) {
      const failure = apiError(error);
      console.error(`The ${setting} setting wasn't saved`, failure);
      setStatus({ step: "failed", setting, failure: { kind: "notSaved", error: failure } });
      return;
    }
    setMe(saved);
    const failure = await apply();
    setStatus(failure ? { step: "failed", setting, failure } : { step: "applied", setting });
  };

  const choose = (choice: Choice) =>
    save("language", { languageChoice: choice }, () => api.setLanguageChoice(choice, lineLanguage()), async () => {
      let failure: Failure | null = null;
      try {
        keepChosenLanguage(choice);
      } catch (error) {
        // The app switches anyway: only the next start's screens before sign-in are in the old language.
        console.error("The saved language choice couldn't be kept on this phone", error);
        failure = { kind: "notKept", error };
      }
      await followLanguageChoice(choice);
      return failure;
    });

  const switchNsfw = (nsfwOptIn: boolean) =>
    save("nsfw", { nsfwOptIn }, () => api.setNsfwOptIn(nsfwOptIn), () => {
      // Its images were picked for the other setting; screens follow `me` themselves.
      forgetKeptBoard();
      return null;
    });

  const shown: Shown = status.step === "saving" ? { ...me, ...status.to } : me;
  const saving = (setting: Setting) => status.step === "saving" && status.setting === setting;
  /** A setting's status line: saving, then what took, in the app's language now. */
  const statusLine = (setting: Setting) => {
    if (saving(setting)) return t(($) => $.stickerBoard.settings.saving);
    if (status.step !== "applied" || status.setting !== setting) return "";
    if (setting === "language")
      return t(($) => $.stickerBoard.settings.language.applied, { language: named(currentLanguage()) });
    return me.nsfwOptIn ? t(($) => $.stickerBoard.settings.nsfw.shown) : t(($) => $.stickerBoard.settings.nsfw.blurred);
  };
  /** Why a setting didn't take, in the app's language now. */
  const problem = (setting: Setting) => {
    if (status.step !== "failed" || status.setting !== setting) return null;
    const { message, detail } = problemOf(status.failure.error);
    const words =
      status.failure.kind === "notKept"
        ? t(($) => $.stickerBoard.settings.language.notKept)
        : t(($) => $.stickerBoard.settings[setting].notSaved, { reason: message });
    return <ErrorLine className="settings-note__problem" detail={detail}>{words}</ErrorLine>;
  };
```

In the JSX:

- Radios use `checked={shown.languageChoice === choice}`; the switch uses `checked={shown.nsfwOptIn}` and `onChange={() => void switchNsfw(!shown.nsfwOptIn)}`.
- Each fieldset has `aria-busy={saving(...)}`, `<p className="fine settings-note__status" role="status">{statusLine(...)}</p>` and `{problem(...)}`.

- [ ] **Step 5: The rest of the restart.**
  - Delete `reopenOnSettings.ts`.
  - `StatBoard.tsx`: drop the `reopenedOnSettings` prop and render `<SettingsNote />`.
  - `StickerBoard.tsx`: drop the import, the `reopenedOnSettings` state and prop; `turned` and `wasTurned` start `false`.
  - `settings-note.css`: drop `.settings-note__restarts`; `.settings-note__status` becomes `clear: both; margin: 8px 0 0;`.
  - `DESIGN.md:488`: "…over fine print on who it's for and that changing it restarts Croquis; a failed save…" becomes "…over fine print on who it's for. A saved setting applies at once, and the setting's status line says so; a failed save…".
  - Check that nothing still refers to the removed names: `rg -n "reopenOnSettings|openedInView|reopenedOnSettings|settings-note__restarts|\.restarts\b" apps/frontend/src DESIGN.md` prints nothing.
- [ ] **Step 6: Run `SettingsNote.test.tsx`, `StickerBoard.test.tsx` and `stat-board/`; they pass. Run `pnpm check`.**
- [ ] **Step 7: Commit:** `feat(frontend): Settings apply in place: a language or the 18+ setting saves, takes effect and says so, with no restart`

---

## Verification

- [ ] `pnpm check` passes (needs the Sui CLI). Paste its summary lines.
- [ ] Dev server (`pnpm dev`), in WebKit and Chromium (Playwright; WebKit drops the Secure cookie on localhost, see the webkit-testing memory), signed in with `?as=alice`. Before anything else, in the console: `window.__mounted = document.querySelector(".board")`.
  1. Settings, Show 18+ stickers on: the status line says so. Draw, mark 18+, seal: the sticker is on the board unblurred, with pink foil, and in Explore's pile.
  2. Language 日本語: the note, tab bar, page title, `<html lang>` and the Zipper's name (`.zip__slider` aria-label) switch at once, and the status line reads in Japanese. Then English: `document.querySelectorAll('link[href*="Zen+Kaku"]').length === 0`. Then Same as LINE.
  3. 18+ off: right away, the NSFW sticker shows its mark and no drawing (`[src*="/api/images/"]` matches nothing). `GET /api/sticker-boards/me` goes out again, then the veiled image arrives. The tray's sheet shows no drawing, and Explore's pile shows the veiled image.
  4. Fails closed: route `GET /api/sticker-boards/me*` to 503, turn 18+ on and off: the sticker stays without its drawing, and the board says it didn't load, with Try again.
  5. No restart: after every step, `window.__mounted === document.querySelector(".board")` and `performance.getEntriesByType("navigation").length === 1`. The network log shows no document request.
- [ ] Report the results with screenshots from both engines. The chat menu's relink is covered by `lineMenu.test.ts`, since the dev server has no chat menu.

## Riskiest step

**Task 6.** After an opt-out the server can't stop a drawing the browser cached `private, immutable`, and the blur is the server's veiled copy, not the app's. It leaks if a reader takes the raw `loaded` or `adopted.stickers` in place of the derived `stickers`, or if an answer shaped for the old opt-in is shown or adopted. The tests check:

- the whole board's DOM (board face, notices, gifts-on-their-way badge) for the drawing's URL right after `setMe`;
- that a failed reload keeps it hidden and shows the board's error;
- that the kept board isn't written meanwhile;
- that a board kept before a change on another device stays hidden.

Reviewers: check that every new reader of the board's state takes `stickers`.

## Not in this plan

- **Error text kept translated in state on other screens:** the drawing screen's seal and ticket chips (`sealProblem`, `startProblem`), and the Giving, Receiving and address dialogs. The dialogs are modal and can't be open while Settings is. The drawing screen stays mounted, so its chip keeps its reason in the old language until its next try. Fix it with the same raw-error pattern when that screen is next touched.
- **A tray rebuilt for a new language** closes if it was open, and may play its tug hint once more.
- **The two Kyoto Seika Practice Mode switches:** their spec adds them on this save path.
