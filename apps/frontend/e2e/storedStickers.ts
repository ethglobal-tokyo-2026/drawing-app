import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";
import { formatNo } from "../src/stickers/format.ts";
import { actorHeaders, envelope, isRecord } from "./helpers.ts";

/** The stickers kept in e2e/storedStickers/, each in a folder of its name. */
export const STORED_STICKERS = [
  "oneStroke",
  "oneStrokeRising",
  "erasedMarks",
  "erasedMarksSideways",
] as const;

/** What captures the stored stickers anew, which a change to the seal form needs. */
const RECAPTURE = "run pnpm --filter frontend e2e:stored-stickers";

/** A sticker the drawing screen sealed once, kept in e2e/storedStickers/<name>/ to seal again. */
export type StoredSticker = (typeof STORED_STICKERS)[number];

/**
 * A seal form as form.json keeps it: the text fields as the drawing screen sent them, and each file
 * part's file name, which names its file beside form.json too, and its type.
 */
interface StoredForm {
  fields: Record<string, string>;
  files: Record<string, { name: string; mimeType: string }>;
}

const folderOf = (name: StoredSticker) =>
  fileURLToPath(new URL(`storedStickers/${name}/`, import.meta.url));

const isStoredForm = (value: unknown): value is StoredForm =>
  isRecord(value) &&
  isRecord(value.fields) &&
  Object.values(value.fields).every((field) => typeof field === "string") &&
  isRecord(value.files) &&
  Object.values(value.files).every(
    (file) => isRecord(file) && typeof file.name === "string" && typeof file.mimeType === "string",
  );

/** `key` of a JSON object; undefined for anything else. */
const fieldOf = (value: unknown, key: string) => (isRecord(value) ? value[key] : undefined);

/**
 * Keeps a seal request's form as `name`'s, in place of the one kept before: every part but the ticket
 * use, which is spent afresh at each seal. Resolves with what it kept.
 */
export async function keepSealForm(name: StoredSticker, form: FormData) {
  const folder = folderOf(name);
  await rm(folder, { recursive: true, force: true });
  await mkdir(folder, { recursive: true });
  const kept: StoredForm = { fields: {}, files: {} };
  for (const [part, value] of form) {
    if (part === "ticketUseId") continue;
    if (typeof value === "string") {
      kept.fields[part] = value;
      continue;
    }
    await writeFile(`${folder}${value.name}`, new Uint8Array(await value.arrayBuffer()));
    kept.files[part] = { name: value.name, mimeType: value.type };
  }
  await writeFile(`${folder}form.json`, `${JSON.stringify(kept, null, 2)}\n`);
  return kept;
}

/** `name`'s kept seal form, as a multipart request's parts. */
async function storedForm(name: StoredSticker) {
  const folder = folderOf(name);
  const kept: unknown = JSON.parse(await readFile(`${folder}form.json`, "utf8"));
  if (!isStoredForm(kept)) throw new Error(`${folder}form.json isn't a kept seal form`);
  const files = await Promise.all(
    Object.entries(kept.files).map(
      async ([part, file]): Promise<[string, typeof file & { buffer: Buffer }]> => [
        part,
        { ...file, buffer: await readFile(`${folder}${file.name}`) },
      ],
    ),
  );
  return { ...kept.fields, ...Object.fromEntries(files) };
}

/**
 * Seals a stored sticker for the person signed in on `page`, through the API as the drawing screen
 * does: a daily ticket spent, and the sticker sealed on it. Their board places it when it next loads.
 * Resolves with the sticker's id and its number as the board names it.
 */
export async function sealStoredSticker(page: Page, name: StoredSticker) {
  const headers = actorHeaders(await envelope(page));
  const spent = await page.request.post("/api/tickets/spend", {
    headers,
    data: { kind: "daily", idempotencyKey: randomUUID() },
  });
  const spendText = await spent.text();
  expect(spent.status(), `POST /api/tickets/spend: ${spendText}`).toBe(201);
  const ticketUseId = fieldOf(fieldOf(JSON.parse(spendText), "ticketUse"), "id");
  if (typeof ticketUseId !== "number")
    throw new Error(`POST /api/tickets/spend spent no ticket: ${spendText}`);

  const sealed = await page.request.post("/api/stickers", {
    headers,
    multipart: { ...(await storedForm(name)), ticketUseId: String(ticketUseId) },
  });
  const sealText = await sealed.text();
  expect(
    sealed.status(),
    `POST /api/stickers refused the stored ${name}; after a change to the seal form, ${RECAPTURE}: ${sealText}`,
  ).toBe(201);
  const sticker = fieldOf(JSON.parse(sealText), "sticker");
  const id = fieldOf(sticker, "id");
  const number = fieldOf(sticker, "number");
  if (typeof id !== "string" || typeof number !== "number")
    throw new Error(`POST /api/stickers sealed no sticker: ${sealText}`);
  return { id, no: formatNo(number) };
}
