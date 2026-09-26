import type { Translation } from "../catalog";
import type { en } from "../en";
import { api } from "./api";
import { app } from "./app";
import { errors } from "./errors";
import { explore } from "./explore";
import { giving } from "./giving";
import { gratitude } from "./gratitude";
import { identity } from "./identity";
import { offers } from "./offers";
import { pages } from "./pages";
import { receiving } from "./receiving";
import { stickerBoard } from "./stickerBoard";
import { stickerCreation } from "./stickerCreation";
import { stickers } from "./stickers";
import { tickets } from "./tickets";
import { ui } from "./ui";

/** The Japanese catalog. A missing key falls back to English. */
export const ja: Translation<typeof en> = {
  api,
  app,
  errors,
  explore,
  giving,
  gratitude,
  identity,
  offers,
  pages,
  receiving,
  stickerBoard,
  stickerCreation,
  stickers,
  tickets,
  ui,
};
