import type { Section } from "../catalog";

export const stickerCreation = {
  /** Drawing screen: the white sheet you draw on, named for screen readers */
  canvas: { en: "Canvas", ja: "キャンバス" },
  /** The timer dot, and the white label under it. */
  timer: {
    /** Drawing screen, top left: the timer dot's name for screen readers before the first stroke starts the clock */
    label: { en: "Timer", ja: "タイマー" },
    /** Drawing screen, top left: the timer dot's name for screen readers while the clock runs; a tap pauses it */
    pause: { en: "Pause timer", ja: "タイマーを一時停止" },
    /** Drawing screen, top left: the timer dot's name for screen readers after you paused it; a tap resumes it */
    resume: { en: "Resume timer", ja: "タイマーを再開" },
    /** Drawing screen, top left: the small white tag with a pause icon that hangs off the timer dot whenever the clock is stopped; hidden from screen readers */
    paused: { en: "Paused", ja: "一時停止" },
    /** Drawing screen, top left: read out once by screen readers, as a polite announcement, when the clock reaches 30 seconds left and again at 10; {{seconds}} is 30 or 10 */
    warning: { en: "{{seconds}} seconds left", ja: "残り{{seconds}}秒" },
    /** Read out with the dot: the time left on its face, and why the clock is stopped. */
    status: {
      /** Drawing screen, top left: read by screen readers after the timer dot's name while the clock runs; {{time}} is minutes:seconds, such as 4:32 */
      running: { en: "{{time}} left", ja: "残り{{time}}" },
      /** Drawing screen, top left: read by screen readers after the timer dot's name before the first stroke starts the clock */
      waiting: {
        en: "{{time}} left, starts when you draw",
        ja: "残り{{time}}、かき始めるとスタート",
      },
      /** Drawing screen, top left: read by screen readers after the timer dot's name while the clock is stopped by a tap on the timer, by the app going to the background, or by another screen covering the drawing screen */
      paused: { en: "{{time}} left, paused", ja: "残り{{time}}、一時停止中" },
      /** Drawing screen, top left: read by screen readers after the timer dot's name while the color sheet is open, which stops the clock */
      color: {
        en: "{{time}} left, paused while you choose a color",
        ja: "残り{{time}}、色を選んでいる間は一時停止中",
      },
      /** Drawing screen, top left: read by screen readers after the timer dot's name while the smoothing bar is open, which stops the clock */
      smoothing: {
        en: "{{time}} left, paused while you set smoothing",
        ja: "残り{{time}}、手ぶれ補正を調整している間は一時停止中",
      },
      /** Drawing screen, top left: read by screen readers after the timer dot's name while a finger is on the size rail, which stops the clock */
      size: {
        en: "{{time}} left, paused while you set the brush size",
        ja: "残り{{time}}、ブラシのサイズを調整している間は一時停止中",
      },
    },
    /** The label under the dot. */
    note: {
      /** Drawing screen, top left: the white label under the timer for a few seconds when you draw on a paused sheet, also announced; the label never wraps by itself, so the line break is where it wraps */
      tapToKeepDrawing: {
        en: "Tap the timer\nto keep drawing.",
        ja: "タイマーをタップすると\n続きをかけます。",
      },
      /** Drawing screen, top left: the white label under the timer after Start on your first few visits, or when you tap the timer before the first stroke; also announced */
      startsWhenYouDraw: { en: "Starts when you draw", ja: "かき始めるとスタート" },
      /** Drawing screen, top left: the white label under the timer when a reload brings back your drawing in progress, paused, until the clock runs again; also announced */
      pickedUp: { en: "Picked up where you left off", ja: "続きから再開しました" },
      /** Drawing screen, top left: the white label under the timer when a reload couldn't bring back your drawing, so a fresh sheet uses the same ticket, until the first stroke; also announced; the label never wraps by itself */
      ticketCarriesOver: {
        en: "Couldn’t pick up your drawing,\nso its ticket carries over",
        ja: "続きから再開できなかったので、\nチケットはそのまま使えます",
      },
      /** Drawing screen, top left: the white label under the timer when a reload couldn't bring back your drawing in progress, and it had no ticket to carry over, until the first stroke; also announced */
      lost: {
        en: "Couldn’t pick up where you left off",
        ja: "前回の続きから再開できませんでした",
      },
      /** Drawing screen, top left: the white label under the timer, also announced, for as long as this phone can't keep your drawing in progress, so a reload or closing the app would lose it; it goes once the drawing is kept again; the label never wraps by itself */
      notKept: {
        en: "This phone can’t keep your drawing,\nso seal it before you close the app",
        ja: "かきかけのシールをこの端末に残せません。\nアプリを閉じる前に仕上げてください",
      },
    },
  },
  /** The start card's notes about this sheet. */
  startNote: {
    /** Drawing screen, the card that comes up when a ticket couldn't be spent on a fresh sheet (Draw, Keep drawing, or the reserve ask's key): a note under its line; {{reason}} is the server's error message */
    ticketFailed: {
      en: "Couldn’t use a ticket. {{reason}}",
      ja: "チケットを使えませんでした。{{reason}}",
    },
  },
  /** The seal key, and the chip over it. */
  seal: {
    /** Drawing screen, bottom right: the seal key's name for screen readers until its first tap arms it; the key shows a check mark */
    label: { en: "Seal: tap twice", ja: "仕上げ：2回タップ" },
    /** Drawing screen, bottom right: the chip beside the seal key after its first tap, announced to screen readers and the key's name until the second tap, which seals */
    tapAgain: { en: "Tap again to seal", ja: "もう一度タップで仕上げ" },
    /** Drawing screen, bottom right: the chip beside the seal key after its first tap while the 18+ switch is on, announced to screen readers and the key's name until the second tap, which seals the sticker as 18+ */
    tapAgainNsfw: { en: "Tap again to seal as 18+", ja: "もう一度タップで18+として仕上げ" },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, for a few seconds after the first stroke on each of your first few visits; it says how the key works, and that two fingers tap to undo */
    hint: {
      en: "Tap the check twice to seal. Tap with two fingers to undo.",
      ja: "チェックを2回タップで仕上げ。2本指でタップすると元に戻せます。",
    },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when it's tapped but everything drawn was erased or undone */
    empty: {
      en: "The sheet is empty, so there’s nothing to seal.",
      ja: "キャンバスが真っ白なので、仕上げるものがありません。",
    },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when time runs out after everything drawn was erased or undone; the sheet is fresh again and the chip goes with its first stroke */
    emptyAtTimeUp: {
      en: "Time’s up. The sheet was empty, so nothing was sealed.",
      ja: "時間切れです。キャンバスが真っ白だったので、何も仕上がりませんでした。",
    },
    /** The chip beside the seal key when a seal failed: what failed, then what to do. Its technical detail goes to the console. */
    failed: {
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when sealing failed on this phone before the server was asked; the check is the seal key's icon */
      onThisPhone: {
        en: "Couldn’t seal: something went wrong on this phone. Tap the check to try again.",
        ja: "仕上げられませんでした：この端末で問題が起きました。チェックをもう一度タップしてください。",
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when the app's server didn't answer the seal, or its answer couldn't be read; tapping the check sends the same seal again */
      noAnswer: {
        en: "Couldn’t seal: no answer from the server. Tap the check to try again.",
        ja: "仕上げられませんでした：サーバーの応答がありません。チェックをもう一度タップしてください。",
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when the app's server failed while sealing */
      serverProblem: {
        en: "Couldn’t seal: the server ran into a problem. Tap the check to try again.",
        ja: "仕上げられませんでした：サーバーで問題が起きました。チェックをもう一度タップしてください。",
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when the sticker was saved but its on-chain seal wasn't confirmed; trying again doesn't use another ticket */
      notOnChain: {
        en: "Your sticker is saved, but isn’t sealed on-chain yet. Tap the check to try again.",
        ja: "シールは保存されましたが、ブロックチェーン上ではまだ仕上がっていません。チェックをもう一度タップしてください。",
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when sealing waited on the board address (the Ethereum Sepolia account that holds the stickers) and it never got ready */
      boardAddress: {
        en: "Couldn’t seal: your board address isn’t ready. Tap the check to try again.",
        ja: "仕上げられませんでした：ボードアドレスの準備ができていません。チェックをもう一度タップしてください。",
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when sealing waited on the board address and LINE's sign-in had expired, so Privy couldn't sign in; tapping the check reconnects with LINE and comes back to the drawing screen, which picks the drawing back up */
      signInExpired: {
        en: "Couldn’t seal: your LINE sign-in expired. Tap the check to reconnect with LINE.",
        ja: "仕上げられませんでした：LINEのログイン情報の有効期限が切れました。チェックをタップしてLINEで再ログインしてください。",
      },
    },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when the server refused the seal, or LINE couldn't reconnect; {{reason}} is that error's message, which says what to do */
    refused: { en: "Couldn’t seal. {{reason}}", ja: "仕上げられませんでした。{{reason}}" },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when a seal failed at 0:00, in front of that chip's words; {{problem}} is the words */
    timeUp: { en: "Time’s up. {{problem}}", ja: "時間切れです。{{problem}}" },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when a reload brings back a drawing whose seal was on its way, so the sheet stays as it was sealed; tapping the check finishes the seal */
    interrupted: {
      en: "Your sticker was being sealed. Tap the check to finish sealing it.",
      ja: "シールを仕上げている途中でした。チェックをタップして仕上げてください。",
    },
  },
  /** The 18+ switch over the seal key, shown only to adults verified with World ID. */
  nsfw: {
    /** Drawing screen, bottom right, over the seal key: the switch's words; on, the sticker seals as 18+ */
    mark: { en: "18+", ja: "18+" },
    /** Drawing screen, bottom right, over the seal key: the 18+ switch's name for screen readers */
    label: {
      en: "18+: seal as sensitive content, blurred for anyone not verified as an adult",
      ja: "18+：センシティブな内容として仕上げる（年齢確認済みの成人以外にはぼかして表示）",
    },
  },
  /** The tool strip's tiles, named for assistive tech. */
  tools: {
    /** Drawing screen, top right: the tool strip's name for screen readers */
    label: { en: "Tools", ja: "ツール" },
    /** Drawing screen, top right: the brush tile in the tool strip, named for screen readers */
    brush: { en: "Brush", ja: "ブラシ" },
    /** Drawing screen, top right: the eraser tile in the tool strip, named for screen readers */
    eraser: { en: "Eraser", ja: "消しゴム" },
    /** Drawing screen, top right: the paint bucket tile in the tool strip, named for screen readers */
    fill: { en: "Fill", ja: "塗りつぶし" },
    /** Drawing screen, top right: the color tile in the tool strip, which opens the color sheet, named for screen readers */
    color: { en: "Color", ja: "カラー" },
    /** Drawing screen, top right: the smoothing tile's name for screen readers, the title of the smoothing bar it opens, and that bar's slider's name */
    smoothing: { en: "Smoothing", ja: "手ぶれ補正" },
  },
  colorSheet: {
    /** Color sheet, which slides up over the drawing screen from the color tile: its heading, and its name for screen readers */
    title: { en: "Color", ja: "カラー" },
    /** Color sheet: the small label to the left of the row of recently used colors, 50px wide; hidden from screen readers */
    recent: { en: "Recent", ja: "最近" },
    /** Color sheet: the row of recently used colors, named for screen readers */
    recentColors: { en: "Recent colors", ja: "最近使った色" },
    /** Color sheet: the grid of 30 preset colors, named for screen readers */
    swatches: { en: "Swatches", ja: "パレット" },
    /** Color sheet: the hue and saturation pad, named for screen readers */
    huePad: { en: "Hue and saturation", ja: "色相と彩度" },
    /** Color sheet: read by screen readers as the hue and saturation pad moves; {{hue}} is 0 to 359 and {{saturation}} 0 to 100 */
    huePadValue: {
      en: "Hue {{hue}} degrees, saturation {{saturation}}%",
      ja: "色相{{hue}}度、彩度{{saturation}}%",
    },
    /** Color sheet: the brightness bar under the pad, named for screen readers */
    brightness: { en: "Brightness", ja: "明るさ" },
    /** Each swatch's name, for assistive tech. A color mixed on the pad goes by its hex. */
    swatchNames: {
      /** Color sheet: screen readers' name for the Ink preset color, #1C1824, a violet near-black */
      ink: { en: "Ink", ja: "墨色" },
      /** Color sheet: screen readers' name for the Charcoal preset color, #4A4453, a dark gray */
      charcoal: { en: "Charcoal", ja: "チャコール" },
      /** Color sheet: screen readers' name for the Graphite preset color, #6E6878, a mid gray */
      graphite: { en: "Graphite", ja: "グラファイト" },
      /** Color sheet: screen readers' name for the Stone preset color, #A39E93, a warm light gray */
      stone: { en: "Stone", ja: "ストーン" },
      /** Color sheet: screen readers' name for the Sand preset color, #D9D4CB, a pale gray beige */
      sand: { en: "Sand", ja: "砂色" },
      /** Color sheet: screen readers' name for the White preset color, #FFFFFF */
      white: { en: "White", ja: "白" },
      /** Color sheet: screen readers' name for the Cream preset color, #FFF1D6 */
      cream: { en: "Cream", ja: "クリーム" },
      /** Color sheet: screen readers' name for the Peach preset color, #FFE0C7, a pale skin tone */
      peach: { en: "Peach", ja: "ピーチ" },
      /** Color sheet: screen readers' name for the Tan preset color, #E8B48C, a tanned skin tone */
      tan: { en: "Tan", ja: "小麦色" },
      /** Color sheet: screen readers' name for the Brown preset color, #9A6444 */
      brown: { en: "Brown", ja: "茶色" },
      /** Color sheet: screen readers' name for the Yellow preset color, #FFD93B */
      yellow: { en: "Yellow", ja: "黄色" },
      /** Color sheet: screen readers' name for the Amber preset color, #FFB547, a golden orange */
      amber: { en: "Amber", ja: "琥珀色" },
      /** Color sheet: screen readers' name for the Apricot preset color, #F7A541 */
      apricot: { en: "Apricot", ja: "アプリコット" },
      /** Color sheet: screen readers' name for the Orange preset color, #FF7A45 */
      orange: { en: "Orange", ja: "オレンジ" },
      /** Color sheet: screen readers' name for the Tomato preset color, #FF5A36, a red orange */
      tomato: { en: "Tomato", ja: "朱色" },
      /** Color sheet: screen readers' name for the Red preset color, #E8484F */
      red: { en: "Red", ja: "赤" },
      /** Color sheet: screen readers' name for the Brick preset color, #B8472E */
      brick: { en: "Brick", ja: "レンガ色" },
      /** Color sheet: screen readers' name for the Chestnut preset color, #7A4A2E */
      chestnut: { en: "Chestnut", ja: "栗色" },
      /** Color sheet: screen readers' name for the Caramel preset color, #C58A4A */
      caramel: { en: "Caramel", ja: "キャラメル" },
      /** Color sheet: screen readers' name for the Cocoa preset color, #4A2F25, a dark brown */
      cocoa: { en: "Cocoa", ja: "ココア" },
      /** Color sheet: screen readers' name for the Blush preset color, #FFB8C9, a soft pink */
      blush: { en: "Blush", ja: "桜色" },
      /** Color sheet: screen readers' name for the Salmon preset color, #FF9E9E */
      salmon: { en: "Salmon", ja: "サーモンピンク" },
      /** Color sheet: screen readers' name for the Pink preset color, #FF4F9A, a hot pink */
      pink: { en: "Pink", ja: "ピンク" },
      /** Color sheet: screen readers' name for the Lilac preset color, #CDBEFF, a pale purple */
      lilac: { en: "Lilac", ja: "藤色" },
      /** Color sheet: screen readers' name for the Grape preset color, #9B7BFF, a violet */
      grape: { en: "Grape", ja: "紫" },
      /** Color sheet: screen readers' name for the Navy preset color, #3B3F8F, a deep indigo */
      navy: { en: "Navy", ja: "紺色" },
      /** Color sheet: screen readers' name for the Blue preset color, #2F6BFF */
      blue: { en: "Blue", ja: "青" },
      /** Color sheet: screen readers' name for the Sky preset color, #7CC6FF, a light blue */
      sky: { en: "Sky", ja: "空色" },
      /** Color sheet: screen readers' name for the Aqua preset color, #38D3DC, a turquoise */
      aqua: { en: "Aqua", ja: "アクア" },
      /** Color sheet: screen readers' name for the Ice preset color, #BDEFF2, a pale aqua */
      ice: { en: "Ice", ja: "水色" },
      /** Color sheet: screen readers' name for the Pumpkin preset color, #D96A00, a deep orange */
      pumpkin: { en: "Pumpkin", ja: "かぼちゃ色" },
      /** Color sheet: screen readers' name for the Ochre preset color, #B07F00, a dark mustard yellow */
      ochre: { en: "Ochre", ja: "黄土色" },
      /** Color sheet: screen readers' name for the Leaf preset color, #4E9A1C, a yellow green */
      leaf: { en: "Leaf", ja: "黄緑" },
      /** Color sheet: screen readers' name for the Green preset color, #0E9A6E, an emerald green */
      green: { en: "Green", ja: "緑" },
      /** Color sheet: screen readers' name for the Forest preset color, #1B6E47, a dark green */
      forest: { en: "Forest", ja: "深緑" },
      /** Color sheet: screen readers' name for the Teal preset color, #00868B, a blue green */
      teal: { en: "Teal", ja: "青緑" },
      /** Color sheet: screen readers' name for the Cerulean preset color, #1478C8, a mid blue */
      cerulean: { en: "Cerulean", ja: "セルリアンブルー" },
      /** Color sheet: screen readers' name for the Violet preset color, #6C3AC4, a deep purple */
      violet: { en: "Violet", ja: "すみれ色" },
      /** Color sheet: screen readers' name for the Magenta preset color, #B4299A, a purple pink */
      magenta: { en: "Magenta", ja: "マゼンタ" },
      /** Color sheet: screen readers' name for the Plum preset color, #9C2067, a dark berry red */
      plum: { en: "Plum", ja: "プラム" },
    },
  },
  sizeRail: {
    /** Drawing screen, left edge: the size rail's name for screen readers while the brush or the fill is in hand */
    brush: { en: "Brush size", ja: "ブラシのサイズ" },
    /** Drawing screen, left edge: the size rail's name for screen readers while the eraser is in hand */
    eraser: { en: "Eraser size", ja: "消しゴムのサイズ" },
    /** Drawing screen, left edge: read by screen readers as the size rail moves; {{size}} is 1 to 48; the number shown on the rail doesn't use this text */
    value: { en: "{{size}} px", ja: "{{size}}ピクセル" },
  },
  /** The bar under the tools, named like its tile. */
  smoothingBar: {
    /** Smoothing bar, under the tool strip: the small label at the slider's left end, no smoothing; hidden from screen readers */
    raw: { en: "Raw", ja: "弱" },
    /** Smoothing bar, under the tool strip: the small label at the slider's right end, the most smoothing; hidden from screen readers */
    smooth: { en: "Smooth", ja: "強" },
  },
  history: {
    /** Drawing screen, bottom left: the undo tile, named for screen readers */
    undo: { en: "Undo", ja: "元に戻す" },
    /** Drawing screen, bottom left: the redo tile, named for screen readers */
    redo: { en: "Redo", ja: "やり直す" },
  },
  /** The white label at the foot of the drawing screen while the seal is on its way, which screen readers hear too. */
  sealCeremony: {
    /** Drawing screen, after tapping the check to seal: the white label at the foot of the screen while the server records the seal, and what screen readers hear */
    sealing: { en: "Sealing your sticker…", ja: "シールを仕上げています…" },
    /** Drawing screen, when sealing takes a while: the line added under “Sealing your sticker…” on a fresh label */
    takesAWhile: { en: "It can take up to half a minute.", ja: "30秒ほどかかることがあります。" },
    /** Drawing screen, when sealing takes longer still: the line that replaces “It can take up to half a minute.” */
    takingLonger: { en: "It’s taking longer than usual.", ja: "いつもより時間がかかっています。" },
  },
  /** The backing card the sticker lands on. */
  sealedCard: {
    /** Sealed card, the backing card the new sticker lands on at the end of the seal ceremony: its title, under the sticker */
    title: { en: "Sealed", ja: "仕上がりました" },
    /** Sealed card: the fine print under the title; {{no}} is the sticker's number (No.0012), <duration/> its drawing time (3分12秒), {{day}} the day it was sealed (2026.09.27) and <handle/> your @handle */
    finePrint: {
      en: "{{no}} · <duration/> · {{day}} · <handle/>",
      ja: "{{no}}・<duration/>・{{day}}・<handle/>",
    },
    /** Sealed card: the main key while you have tickets left; it opens a fresh sheet for the next sticker */
    keepDrawing: { en: "Keep drawing", ja: "もう1枚かく" },
    /** Sealed card: the button at the bottom while you have tickets left, or the main key after your last ticket; it goes to your sticker board */
    goToStickerBoard: { en: "Go to sticker board", ja: "シールボードへ" },
    /** Sealed card: the small button at the bottom after your last ticket, with a ticket icon; it opens the reserve ticket checkout */
    buyReserveTickets: { en: "Buy reserve tickets", ja: "有償チケットを買う" },
    /** Sealed card: the line under the tickets once this sticker used the day's last daily ticket, whether or not reserve tickets remain; {{time}} is when daily tickets refill (0:00 in Japanese) */
    refill: {
      en: "New daily tickets at {{time}}",
      ja: "{{time}}に新しい無償チケットが届きます",
    },
  },
} as const satisfies Section;
