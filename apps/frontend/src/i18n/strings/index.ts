import { api } from "./api";
import { app } from "./app";
import { errors } from "./errors";
import { explore } from "./explore";
import { giving } from "./giving";
import { gratitude } from "./gratitude";
import { identity } from "./identity";
import { line } from "./line";
import { offers } from "./offers";
import { pages } from "./pages";
import { receiving } from "./receiving";
import { stickerBoard } from "./stickerBoard";
import { stickerCreation } from "./stickerCreation";
import { stickers } from "./stickers";
import { tickets } from "./tickets";
import { ui } from "./ui";

/** The catalog: one section per feature folder, plus errors and pages, each string in English and Japanese. */
export const strings = {
  api,
  app,
  errors,
  explore,
  giving,
  gratitude,
  identity,
  line,
  offers,
  pages,
  receiving,
  stickerBoard,
  stickerCreation,
  stickers,
  tickets,
  ui,
};
