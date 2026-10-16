import { kyotoSeikaSubjectsMarkedForDeletion } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { BIGWHEEL_ID, HANA_ID } from "../session/personSwitch.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";

type Headers = Record<string, string>;

const MARKS = "/api/kyoto-seika/subjects-marked-for-deletion";
const WORD = "風";

let test: TestApp;
let logs: LogLines;
let bigwheel: Headers;
beforeEach(async () => {
  logs = captureLogLines();
  test = await createTestApp({
    personSwitch: { mode: "live", operatorUserId: BIGWHEEL_ID, hanaUserId: HANA_ID },
  });
  insertUser(test.db, { id: BIGWHEEL_ID, lineUserId: "line-bigwheel" });
  insertUser(test.db, { id: HANA_ID, lineUserId: "dev-video-hana" });
  bigwheel = await test.signInAs(BIGWHEEL_ID);
});
afterEach(() => {
  test.sqlite.close();
  vi.restoreAllMocks();
});

const list = (headers: Headers) => test.send("GET", MARKS, { headers });
const mark = (word: string, headers: Headers) =>
  test.send("PUT", `${MARKS}/${encodeURIComponent(word)}`, { headers });
const unmark = (word: string, headers: Headers) =>
  test.send("DELETE", `${MARKS}/${encodeURIComponent(word)}`, { headers });

const markedWords = async (headers: Headers) =>
  (await bodyOf(await list(headers), z.object({ words: z.array(z.string()) }))).words;
const storedWords = () =>
  test.db
    .select()
    .from(kyotoSeikaSubjectsMarkedForDeletion)
    .all()
    .map((row) => row.word);
const flagOf = async (headers: Headers) =>
  (
    await bodyOf(
      await test.send("GET", "/api/me", { headers }),
      z.object({ marksKyotoSeikaSubjects: z.boolean() }),
    )
  ).marksKyotoSeikaSubjects;
const logged = (event: string) => logs.entries.filter((entry) => entry.event === event);

/** BIGWHEEL's headers, acting as Hana. */
async function actingAsHana(): Promise<Headers> {
  const response = await test.send("POST", "/api/session/person", {
    headers: bigwheel,
    body: { userId: HANA_ID },
  });
  const { me, selectionVersion } = await bodyOf(
    response,
    z.object({ me: z.object({ id: z.string() }), selectionVersion: z.string() }),
  );
  return {
    ...bigwheel,
    "x-croquis-user-id": me.id,
    "x-croquis-selection-version": selectionVersion,
  };
}

/** Expects the envelope's flag off and all three routes refused, leaving the marks as they were. */
async function expectRefused(headers: Headers) {
  expect(await flagOf(headers)).toBe(false);
  const before = storedWords();
  for (const response of [
    await list(headers),
    await mark("雪", headers),
    await unmark(WORD, headers),
  ])
    expect(await refusalOf(response)).toMatchObject({ status: 403, error: "operator_only" });
  expect(storedWords()).toEqual(before);
}

it("lets the operator, acting as themself, mark a word, list it and unmark it, each change once", async () => {
  expect(await flagOf(bigwheel)).toBe(true);
  for (const _ of [1, 2]) expect((await mark(WORD, bigwheel)).status).toBe(204);
  expect(test.db.select().from(kyotoSeikaSubjectsMarkedForDeletion).all()).toMatchObject([
    { word: WORD, markedByUserId: BIGWHEEL_ID },
  ]);
  expect(await markedWords(bigwheel)).toEqual([WORD]);
  for (const _ of [1, 2]) expect((await unmark(WORD, bigwheel)).status).toBe(204);
  expect(await markedWords(bigwheel)).toEqual([]);
  expect(logged("kyotoSeika.subject.marked")).toMatchObject([{ word: WORD }]);
  expect(logged("kyotoSeika.subject.unmarked")).toMatchObject([{ word: WORD }]);
});

it("refuses another person, and the operator acting as Hana, without the flag", async () => {
  expect((await mark(WORD, bigwheel)).status).toBe(204);
  await expectRefused(await test.signInAs(insertUser(test.db)));
  await expectRefused(await actingAsHana());
  expect(storedWords()).toEqual([WORD]);
});

it("takes a word up to 64 characters and refuses a longer one, naming the field", async () => {
  expect((await mark("字".repeat(64), bigwheel)).status).toBe(204);
  for (const send of [mark, unmark]) {
    const refused = await refusalOf(await send("字".repeat(65), bigwheel));
    expect(refused).toMatchObject({ status: 400, error: "invalid_request" });
    expect(refused.detail).toContain("word");
  }
  expect(storedWords()).toEqual(["字".repeat(64)]);
});
