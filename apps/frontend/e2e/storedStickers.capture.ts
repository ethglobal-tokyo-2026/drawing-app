import { expect, test, type BrowserContextOptions, type Page } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { sealWithErasedMarks } from "./erasedMarks.ts";
import {
  boardSticker,
  canvas,
  drawKey,
  openSealSheet,
  say,
  sealFromBoard,
  sealOnSheet,
  signIn,
  tapKey,
} from "./helpers.ts";
import { ipadOnItsSide } from "./ipad.ts";
import { keepSealForm, STORED_STICKERS, type StoredSticker } from "./storedStickers.ts";

// Run by playwright.stored-stickers.config.ts alone, whose comment says when.

const { stickerCreation, ui } = strings;

/** A seal request's form as fetch sends it, in base64, with the content type naming its boundary. */
interface SentBody {
  type: string;
  base64: string;
}

declare global {
  interface Window {
    sealBodies?: Promise<SentBody>[];
  }
}

const language = "en";

/**
 * drawStroke's stroke mirrored, from the sheet's lower left up to its upper right, sealed from the
 * board. Resolves with the sticker's number. A fresh sheet takes no ink until its ticket is spent, so
 * a stroke it refused is drawn again.
 */
async function sealRisingStroke(page: Page) {
  await tapKey(drawKey(page, language));
  const sheet = canvas(page, language);
  const undo = page.getByRole("button", { name: say(stickerCreation.history.undo, language) });
  await expect(page.locator(".drawing-screen")).not.toHaveAttribute("inert");
  await expect(async () => {
    await sheet.hover();
    const box = await sheet.boundingBox();
    if (!box) throw new Error("The canvas isn't on screen");
    const x = box.x + box.width * 0.3;
    const y = box.y + box.height * 0.4 + 96;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let step = 1; step <= 12; step++) await page.mouse.move(x + step * 12, y - step * 8);
    await page.mouse.up();
    await expect(undo).toBeEnabled({ timeout: 5_000 });
  }).toPass();
  await openSealSheet(page, language);
  const { card, no } = await sealOnSheet(page, language);
  await card.getByRole("button", { name: say(ui.backToBoard, language) }).click();
  await expect(boardSticker(page, language, no)).toBeVisible();
  return no;
}

/**
 * How each stored sticker is drawn and sealed from the board, and on what screen when not the phone's:
 * a sheet takes its shape from the screen it's drawn on.
 */
const sealsFromBoard: Record<
  StoredSticker,
  { draw: (page: Page) => Promise<string>; screen?: BrowserContextOptions }
> = {
  oneStroke: { draw: (page) => sealFromBoard(page, language) },
  oneStrokeRising: { draw: sealRisingStroke },
  erasedMarks: { draw: (page) => sealWithErasedMarks(page, language) },
  erasedMarksSideways: {
    draw: (page) => sealWithErasedMarks(page, language),
    screen: ipadOnItsSide,
  },
};

/**
 * From the page's first load on, keeps each seal request's body in the page as the app hands it to
 * fetch: Chromium gives Playwright no body made of files, as a seal's is.
 */
const keepSealBodies = (page: Page) =>
  page.addInitScript(() => {
    const send = window.fetch.bind(window);
    const bodies: Promise<SentBody>[] = [];
    window.sealBodies = bodies;
    const base64Of = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result.replace(/^data:[^,]*,/, ""))
            : reject(new Error("The seal body was read as no data URL"));
        reader.onerror = () => reject(reader.error ?? new Error("The seal body couldn't be read"));
        reader.readAsDataURL(blob);
      });
    window.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      // Only a form: fetch encodes it again as it sends, where a stream would already be used up.
      if (
        init?.method === "POST" &&
        url.pathname === "/api/stickers" &&
        init.body instanceof FormData
      ) {
        const sent = new Response(init.body);
        bodies.push(
          sent.blob().then(async (blob) => ({
            type: sent.headers.get("content-type") ?? "",
            base64: await base64Of(blob),
          })),
        );
      }
      return send(input, init);
    };
  });

/** The form of the first seal request the page sent, read as the API reads a multipart body. */
async function firstSealForm(page: Page) {
  const sent = await page.evaluate(() => window.sealBodies?.[0]);
  if (!sent?.type.startsWith("multipart/form-data"))
    throw new Error(`The page sent no multipart seal request: ${JSON.stringify(sent?.type)}`);
  return new Response(Buffer.from(sent.base64, "base64"), {
    headers: { "content-type": sent.type },
  }).formData();
}

for (const name of STORED_STICKERS) {
  const { draw, screen } = sealsFromBoard[name];
  test.describe(() => {
    if (screen) test.use(screen);

    test(`keeps the seal form of ${name}`, async ({ page }) => {
      await keepSealBodies(page);
      await signIn(page, "stored-stickers", language);
      await draw(page);
      const { fields, files } = await keepSealForm(name, await firstSealForm(page));
      const parts = [
        ...Object.keys(fields),
        ...Object.entries(files).map(([part, file]) => `${part} (${file.name})`),
      ];
      console.log(`Kept ${name}'s seal form: ${parts.join(", ")}`);
    });
  });
}
