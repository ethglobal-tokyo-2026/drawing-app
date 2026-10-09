import type { Section } from "../catalog";

export const stickerCreation = {
  /** Drawing screen: the white sheet you draw on, named for screen readers */
  canvas: { en: "Canvas", ja: "キャンバス" },
  /** The timer dot, and the white label under it. */
  timer: {
    /** Drawing screen, top left: the timer dot's name for screen readers before the first stroke starts the clock, and on a begun sheet in Kyoto Seika Practice Mode, whose clock never pauses */
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
      /** Drawing screen, top left, a sheet in Kyoto Seika Practice Mode: read by screen readers after the timer dot's name while its two subjects wait for Begin, which starts the clock */
      dealt: {
        en: "{{time}} left, starts when you press Begin",
        ja: "残り{{time}}、はじめを押すとスタート",
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
      /** Drawing screen, top left: read by screen readers after the timer dot's name while the clear bar is open, which stops the clock */
      clear: {
        en: "{{time}} left, paused while you choose whether to clear the sheet",
        ja: "残り{{time}}、キャンバスを消去するか選んでいる間は一時停止中",
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
      /** Drawing screen, top left, a sheet in Kyoto Seika Practice Mode: the white label under the timer while its two subjects wait for Begin, on your first few visits or when you tap the timer; also announced */
      startsWhenYouPressBegin: { en: "Starts when you press Begin", ja: "はじめを押すとスタート" },
      /** Drawing screen, top left, a sheet in Kyoto Seika Practice Mode: the white label under the timer for a few seconds at 10 and at 5 minutes left, as a proctor calls the time; also announced */
      minutesLeft: { en: "{{minutes}} minutes left", ja: "残り{{minutes}}分" },
      /** Drawing screen, top left, a sheet in Kyoto Seika Practice Mode once begun: the white label under the timer for a few seconds when it's tapped, since its clock never pauses; also announced */
      clockRuns: {
        en: "The clock runs, as in the real test",
        ja: "本番と同じく、時計は止まりません",
      },
      /** Drawing screen, top left: the white label under the timer when a reload brings back your drawing in progress, paused, until the clock runs again; also announced */
      pickedUp: { en: "Picked up where you left off", ja: "続きから再開しました" },
      /** Drawing screen, top left: the white label under the timer when a reload couldn't bring back your drawing, so a fresh sheet uses the same ticket, until the first stroke; also announced; the label never wraps by itself */
      ticketCarriesOver: {
        en: "Couldn’t pick up your drawing,\nso its ticket carries over",
        ja: "続きから再開できなかったので、\nチケットはそのまま使えます",
      },
      /** Drawing screen, top left: the white label under the timer when a reload couldn't bring back your drawing, but its seal had reached the server, so it's on your sticker board and a fresh sheet takes its place, until the first stroke; also announced */
      sealedBeforeReload: {
        en: "Your last sticker was sealed",
        ja: "前回のシールは仕上がりました",
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
  /** The seal key, and the chip over it. */
  seal: {
    /** Drawing screen, bottom right: the seal key's name for screen readers until its first tap arms it; the key shows a check mark */
    label: { en: "Seal: tap twice", ja: "仕上げ：2回タップ" },
    /** Drawing screen, bottom right: the chip beside the seal key after its first tap, under its 18+ box, announced to screen readers and the key's name until the second tap, which seals */
    tapAgain: { en: "Tap again to seal", ja: "もう一度タップで仕上げ" },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when it's tapped but everything drawn was erased or undone */
    empty: {
      en: "The sheet is empty, so there’s nothing to seal.",
      ja: "キャンバスが<wbr/>真っ白なので、<wbr/>仕上げるものが<wbr/>ありません。",
    },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when time runs out after everything drawn was erased or undone; the sheet is fresh again and the chip goes with its first stroke */
    emptyAtTimeUp: {
      en: "Time’s up. The sheet was empty, so nothing was sealed.",
      ja: "時間切れです。<wbr/>キャンバスが<wbr/>真っ白だったので、<wbr/>何も<wbr/>仕上がり<wbr/>ませんでした。",
    },
    /** The chip beside the seal key when a seal failed: what failed, then what to do. Its technical detail goes to the console. */
    failed: {
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when sealing failed on this phone before the server was asked; the check is the seal key's icon */
      onThisPhone: {
        en: "Couldn’t seal: something went wrong on this phone. Tap the check to try again.",
        ja: "仕上げられ<wbr/>ませんでした：<wbr/>この端末で<wbr/>問題が<wbr/>起きました。<wbr/>チェックを<wbr/>もう一度<wbr/>タップして<wbr/>ください。",
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when the app's server didn't answer the seal, or its answer couldn't be read; tapping the check sends the same seal again */
      noAnswer: {
        en: "Couldn’t seal: Croquis didn’t answer. Tap the check to try again.",
        ja: "仕上げられ<wbr/>ませんでした：<wbr/>クロッキーから<wbr/>応答が<wbr/>ありません。<wbr/>チェックを<wbr/>もう一度<wbr/>タップして<wbr/>ください。",
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when the app's server failed while sealing */
      serverProblem: {
        en: "Couldn’t seal: something went wrong on our side. Tap the check to try again.",
        ja: "仕上げられ<wbr/>ませんでした：<wbr/>こちら側で<wbr/>問題が<wbr/>発生しました。<wbr/>チェックを<wbr/>もう一度<wbr/>タップして<wbr/>ください。",
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when the sticker was saved but its on-chain seal wasn't confirmed; trying again doesn't use another ticket */
      notOnChain: {
        en: "Your sticker is saved, but isn’t sealed on-chain yet. Tap the check to try again.",
        ja: "シールは<wbr/>保存されましたが、<wbr/>ブロックチェーン<wbr/>上では<wbr/>まだ<wbr/>仕上がって<wbr/>いません。<wbr/>チェックを<wbr/>もう一度<wbr/>タップして<wbr/>ください。",
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when sealing waited on your Sui address (the Privy wallet your stickers are kept in) and it never got ready */
      suiAddress: {
        en: "Couldn’t seal: your Sui address isn’t ready. Tap the check to try again.",
        ja: "仕上げられ<wbr/>ませんでした：<wbr/>Suiアドレスの<wbr/>準備が<wbr/>できていません。<wbr/>チェックを<wbr/>もう一度<wbr/>タップして<wbr/>ください。",
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when sealing waited on your Sui address and LINE's sign-in had expired, so Privy couldn't sign in; tapping the check reconnects with LINE and comes back to the drawing screen, which picks the drawing back up */
      signInExpired: {
        en: "Couldn’t seal: your LINE sign-in expired. Tap the check to reconnect with LINE.",
        ja: "仕上げられ<wbr/>ませんでした：<wbr/>LINEの<wbr/>ログイン情報の<wbr/>有効期限が<wbr/>切れました。<wbr/>チェックを<wbr/>タップして<wbr/>LINEで<wbr/>再ログイン<wbr/>してください。",
      },
    },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when the server refused the seal, or LINE couldn't reconnect; {{reason}} is that error's message, which says what to do */
    refused: {
      en: "Couldn’t seal. {{reason}}",
      ja: "仕上げられ<wbr/>ませんでした。<wbr/>{{reason}}",
    },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when a seal failed at 0:00, in front of that chip's words; {{problem}} is the words */
    timeUp: { en: "Time’s up. {{problem}}", ja: "時間切れです。<wbr/>{{problem}}" },
    /** Drawing screen, bottom left, at 0:00 after a seal that never reached the server failed: the quiet link that lets the sticker in progress go, and its ticket with it, for a fresh sheet */
    startOver: { en: "Start a new sticker", ja: "新しい<wbr/>シールをかく" },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when the server refused the seal at 0:00; the sheet is fresh again and the chip goes with its first stroke; {{reason}} is the refusal's message */
    refusedAtTimeUp: {
      en: "Time’s up. Croquis didn’t accept the seal, so nothing was sealed. {{reason}}",
      ja: "時間切れです。<wbr/>クロッキーが<wbr/>仕上げを<wbr/>受け付け<wbr/>なかったので、<wbr/>何も<wbr/>仕上がり<wbr/>ませんでした。<wbr/>{{reason}}",
    },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when a reload brings back a drawing whose seal was on its way, so the sheet stays as it was sealed; tapping the check finishes the seal */
    interrupted: {
      en: "Your sticker was being sealed. Tap the check to finish sealing it.",
      ja: "シールを<wbr/>仕上げている<wbr/>途中でした。<wbr/>チェックを<wbr/>タップして<wbr/>仕上げてください。",
    },
  },
  /** The 18+ box in the chip beside the armed seal key, for everyone, unticked on every new sheet. */
  nsfw: {
    /** Drawing screen, bottom right, in the chip beside the seal key after its first tap: the 18+ box's only words; ticked, the second tap seals the sticker as 18+. Also the tag after Sealed on the sealed card of a sticker sealed as 18+ */
    mark: { en: "18+", ja: "18+" },
    /** Drawing screen, bottom right, in the chip beside the seal key after its first tap: the 18+ box's name for screen readers */
    label: {
      en: "18+: seal as sensitive content, blurred for anyone who hasn’t turned on 18+ stickers",
      ja: "18+：センシティブな内容として仕上げる（18+のシールをオンにしていない人にはぼかして表示）",
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
    /** Drawing screen, top right: the clear tile at the end of the tool strip, which opens the clear bar, named for screen readers; dimmed while the sheet is blank */
    clear: { en: "Clear the sheet", ja: "キャンバスを消去" },
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
  /** The bar under the tools that asks before the sheet is cleared. */
  clearBar: {
    /** Clear bar, under the tool strip after a tap on the clear tile: its title, which also names it for screen readers */
    title: { en: "Clear the sheet?", ja: "キャンバスを<wbr/>消去しますか？" },
    /** Clear bar: the line under the title, also read by screen readers; the timer keeps its time rather than starting over */
    line: {
      en: "Undo brings it back. The timer won’t start over.",
      ja: "「元に戻す」で<wbr/>戻せます。<wbr/>タイマーは<wbr/>リセット<wbr/>されません。",
    },
    /** Clear bar: the quiet link that closes it with nothing cleared */
    cancel: { en: "Cancel", ja: "キャンセル" },
    /** Clear bar: the red button that clears the sheet; undo brings the drawing back */
    clear: { en: "Clear", ja: "消去" },
  },
  history: {
    /** Drawing screen, bottom left: the undo tile, named for screen readers */
    undo: { en: "Undo", ja: "元に戻す" },
    /** Drawing screen, bottom left: the redo tile, named for screen readers */
    redo: { en: "Redo", ja: "やり直す" },
  },
  /** Drawing screen, at the foot between redo and the seal check: the tile that opens your sticker board, named for screen readers */
  myBoard: { en: "My board", ja: "マイボード" },
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
    /** Sealed card: the fine print under the title; {{no}} is the sticker's number (No.0012), <duration/> its drawing time (3分12秒) and {{day}} the day it was sealed (2026.09.27) */
    finePrint: { en: "{{no}} · <duration/> · {{day}}", ja: "{{no}}・<duration/>・{{day}}" },
    /** Sealed card: the main key while you have tickets left; it opens a fresh sheet for the next sticker */
    keepDrawing: { en: "Keep drawing", ja: "もう1枚かく" },
    /** Sealed card: the small button at the bottom after your last ticket, with a ticket icon; it opens the reserve ticket checkout */
    buyReserveTickets: { en: "Buy reserve tickets", ja: "有償チケットを買う" },
    /** Sealed card: the line under the tickets once this sticker used the day's last daily ticket, whether or not reserve tickets remain; {{time}} is when daily tickets refill (0:00 in Japanese) */
    refill: {
      en: "New daily tickets at {{time}}",
      ja: "{{time}}に新しい無償チケットが届きます",
    },
  },
} as const satisfies Section;
