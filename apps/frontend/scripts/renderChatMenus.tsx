// Renders the official account's chat menus to deploy/line/images/: deploy/line/returning-menu.html in each language and
// ticket state, and the default menu, with the app's own styles, words, icons and ticket shape.
//   pnpm --filter frontend chat-menus             render every menu
//   pnpm --filter frontend chat-menus --serve     only serve the page, to work on it in a browser
// It takes the screenshots with Playwright's command line through npx. The page loads Croquis Sans from the app's
// styles, and Dela Gothic One and Zen Kaku Gothic New from Google.
import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { StarFour } from "@phosphor-icons/react";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { app } from "../src/i18n/strings/app";
import { stickerBoard } from "../src/i18n/strings/stickerBoard";
import { tickets } from "../src/i18n/strings/tickets";
import { DrawIcon, ExploreIcon, StickerBoardIcon } from "../src/icons";
import { ticketPath } from "../src/tickets/ticketShape";

const ROOT = resolve(import.meta.dirname, "../../..");
const PAGE = "/deploy/line/returning-menu.html";
const OUT = join(ROOT, "deploy/line/images");
/** Only these folders are served: the page, and the app's styles it links. */
const SERVED = ["/deploy/line/", "/apps/frontend/src/styles/"];
const PLAYWRIGHT = "playwright@1.59.1";
/** LINE takes a menu image of at most 1 MB. */
const MAX_BYTES = 1_000_000;

const STATES = ["plain", "3", "2", "1", "reserve", "none"] as const;
const LANGUAGES = ["en", "ja"] as const;
type Language = (typeof LANGUAGES)[number];

const svg = <P extends object>(Icon: ComponentType<P>, props: P) =>
  renderToStaticMarkup(createElement(Icon, props));

// Tokyo's midnight, printed the way the app prints a time of day (i18n/format.ts): 12:00 AM, or 0:00 in Japanese.
// One image serves every time zone, and the tickets turn over at Tokyo's midnight.
const refillTime = (language: Language) =>
  new Date("2026-01-01T00:00:00+09:00").toLocaleTimeString(language, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

const TICKET_HEIGHT = 34;
const ticket = (w: number) => ({
  w,
  h: TICKET_HEIGHT,
  d: ticketPath({ w, h: TICKET_HEIGHT, corner: 5, notch: 5 }),
});

/** The menu's words from the app's catalog, in one language; a string not yet in Japanese reads in English. */
const wordsIn = (language: Language) => {
  const word = (leaf: { en: string; ja?: string }) => leaf[language] ?? leaf.en;
  return {
    draw: word(stickerBoard.board.draw),
    myBoard: word(app.tabs.myBoard),
    explore: word(app.tabs.explore),
    count: word(tickets.count),
    // As the Draw key's empty backing says it: "New at 12:00 AM".
    refill: word(tickets.newAt).replace("{{time}}", refillTime(language)),
  };
};

/** What the page draws with, handed to it as window.chatMenu. */
const content = {
  words: { en: wordsIn("en"), ja: wordsIn("ja") },
  icons: {
    draw: svg(DrawIcon, { weight: "fill" }),
    myBoard: svg(StickerBoardIcon, { weight: "bold" }),
    explore: svg(ExploreIcon, { weight: "bold" }),
    open: svg(StickerBoardIcon, { weight: "fill" }),
    star: svg(StarFour, { weight: "fill" }),
  },
  // Each ticket is as long as what it prints needs, plus the 16px tucked under the key.
  tickets: { daily: ticket(62), reserve: ticket(56), used: { en: ticket(84), ja: ticket(86) } },
};

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
};

/** Serves the page, with the content injected, and the app's styles and fonts. */
async function serve(port: number) {
  const script = `<script>window.chatMenu = ${JSON.stringify(content).replaceAll("<", "\\u003c")};</script>`;
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const file = resolve(ROOT, `.${path}`);
    if (!SERVED.some((folder) => file.startsWith(join(ROOT, folder)))) {
      response.writeHead(404).end();
      return;
    }
    readFile(file).then(
      (body) => {
        response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "text/plain" });
        response.end(
          path === PAGE ? body.toString("utf8").replace("<head>", `<head>${script}`) : body,
        );
      },
      () => response.writeHead(404).end(),
    );
  });
  await new Promise<void>((done) => server.listen(port, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("The page's server has no port");
  return { origin: `http://127.0.0.1:${address.port}`, close: () => server.close() };
}

interface Menu {
  file: string;
  query: string;
}

const MENUS: Menu[] = [
  ...LANGUAGES.flatMap((lang) =>
    STATES.map((state) => ({
      file: `returning-${lang}-${state}.png`,
      query: `?lang=${lang}&state=${state}`,
    })),
  ),
  { file: "default.png", query: "?menu=default" },
];

const run = promisify(execFile);

async function shoot(origin: string, { file, query }: Menu) {
  const out = join(OUT, file);
  await run("npx", [
    "--yes",
    PLAYWRIGHT,
    "screenshot",
    "--viewport-size=2500,843",
    "--wait-for-selector=html[data-ready]",
    "--timeout=60000",
    `${origin}${PAGE}${query}`,
    out,
  ]);
  const png = await readFile(out);
  // A PNG's header holds its width and height at bytes 16 and 20.
  const [width, height] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  if (width !== 2500 || height !== 843)
    throw new Error(`${file} is ${width} × ${height}, not 2500 × 843`);
  if (png.length > MAX_BYTES)
    throw new Error(`${file} is ${png.length} bytes; LINE takes at most 1 MB`);
  console.log(`✓ ${file} (${Math.round(png.length / 1000)} KB)`);
}

async function main() {
  if (process.argv.includes("--serve")) {
    const { origin } = await serve(Number(process.env.PORT ?? 5212));
    console.log(
      `Serving the chat menu page until you stop this. Add &areas to outline the tap areas.`,
    );
    for (const { query } of MENUS) console.log(`  ${origin}${PAGE}${query}`);
    return;
  }
  const { origin, close } = await serve(0);
  try {
    await mkdir(OUT, { recursive: true });
    // Four browsers at a time.
    for (let i = 0; i < MENUS.length; i += 4) {
      await Promise.all(MENUS.slice(i, i + 4).map((menu) => shoot(origin, menu)));
    }
  } finally {
    close();
  }
}

await main();
