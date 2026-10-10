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
      /** Drawing screen, top left: read by screen readers after the timer dot's name once the clock reaches 0:00, under the time's-up seal sheet */
      timeUp: { en: "Time’s up", ja: "タイムアップ" },
      /** Drawing screen, top left: read by screen readers after the timer dot's name while the clock is stopped by a tap on the timer, by the app going to the background, or by another screen covering the drawing screen */
      paused: { en: "{{time}} left, paused", ja: "残り{{time}}、一時停止中" },
      /** Drawing screen, top left: read by screen readers after the timer dot's name while the color sheet is open, which stops the clock */
      color: {
        en: "{{time}} left, paused while you choose a color",
        ja: "残り{{time}}、色を選んでいる間は一時停止中",
      },
      /** Drawing screen, top left: read by screen readers after the timer dot's name while the Smoothing bar is open, which stops the clock */
      smoothing: {
        en: "{{time}} left, paused while you set smoothing",
        ja: "残り{{time}}、手ぶれ補正を調整している間は一時停止中",
      },
      /** Drawing screen, top left: read by screen readers after the timer dot's name while the clear bar is open, which stops the clock */
      clear: {
        en: "{{time}} left, paused while you choose whether to clear the layer",
        ja: "残り{{time}}、レイヤーを消去するか選んでいる間は一時停止中",
      },
      /** Drawing screen, top left: read by screen readers after the timer dot's name while the current layer's options bar is open beside its chip, which stops the clock */
      layerOptions: {
        en: "{{time}} left, paused while you choose layer options",
        ja: "残り{{time}}、レイヤー設定を選んでいる間は一時停止中",
      },
      /** Drawing screen, top left: read by screen readers after the timer dot's name while a finger is on the opacity slider's thumb, which stops the clock */
      opacity: {
        en: "{{time}} left, paused while you set the opacity",
        ja: "残り{{time}}、不透明度を調整している間は一時停止中",
      },
      /** Drawing screen, top left: read by screen readers after the timer dot's name while a layer chip is held up to move it, which stops the clock */
      reorder: {
        en: "{{time}} left, paused while you move a layer",
        ja: "残り{{time}}、レイヤーを移動している間は一時停止中",
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
      /** Drawing screen, top left: the white label under the timer, also announced, for as long as this device can't keep your drawing in progress, so a reload or closing the app would lose it; it goes once the drawing is kept again; the label never wraps by itself */
      notKept: {
        en: "This device can’t keep your drawing,\nso seal it before you close the app",
        ja: "かきかけのシールをこの端末に残せません。\nアプリを閉じる前に仕上げてください",
      },
    },
  },
  /** The seal key, and the chip over it. */
  seal: {
    /** Drawing screen, bottom right: the seal key's name for screen readers; the key shows a check mark, and a tap opens the seal sheet */
    label: { en: "Seal", ja: "仕上げ" },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when it's tapped but everything drawn was erased or undone */
    empty: {
      en: "The sheet is empty, so there’s nothing to seal.",
      ja: "キャンバスが<wbr/>真っ白なので、<wbr/>仕上げるものが<wbr/>ありません。",
    },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when time runs out after everything drawn was erased or undone; the sheet is fresh again and the chip goes with its first stroke */
    emptyAtTimeUp: {
      en: "Time’s up. The sheet was empty, so nothing was sealed.",
      ja: "タイムアップです。<wbr/>キャンバスが<wbr/>真っ白だったので、<wbr/>何も<wbr/>仕上がり<wbr/>ませんでした。",
    },
    /** The chip beside the seal key when a seal failed: what failed, then what to do. Its technical detail goes to the console. */
    failed: {
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when sealing failed on this device before the server was asked; the check is the seal key's icon */
      onThisDevice: {
        en: "Couldn’t seal: something went wrong on this device. Tap the check to try again.",
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
    timeUp: { en: "Time’s up. {{problem}}", ja: "タイムアップです。<wbr/>{{problem}}" },
    /** Drawing screen, bottom left, at 0:00 after a seal that never reached the server failed: the quiet link that lets the sticker in progress go, and its ticket with it, for a fresh sheet */
    startOver: { en: "Start a new sticker", ja: "新しい<wbr/>シールをかく" },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when the server refused the seal at 0:00; the sheet is fresh again and the chip goes with its first stroke; {{reason}} is the refusal's message */
    refusedAtTimeUp: {
      en: "Time’s up. Croquis didn’t accept the seal, so nothing was sealed. {{reason}}",
      ja: "タイムアップです。<wbr/>クロッキーが<wbr/>仕上げを<wbr/>受け付け<wbr/>なかったので、<wbr/>何も<wbr/>仕上がり<wbr/>ませんでした。<wbr/>{{reason}}",
    },
    /** Drawing screen, bottom right: the chip beside the seal key, announced, when a reload brings back a drawing whose seal was on its way, so the sheet stays as it was sealed; tapping the check finishes the seal */
    interrupted: {
      en: "Your sticker was being sealed. Tap the check to finish sealing it.",
      ja: "シールを<wbr/>仕上げている<wbr/>途中でした。<wbr/>チェックを<wbr/>タップして<wbr/>仕上げてください。",
    },
  },
  /** The bottom sheet the seal key opens over the drawing, and that 0:00 raises. */
  sealSheet: {
    /** Seal sheet, over the drawing after a tap on the seal key: its title, and its name for screen readers */
    title: { en: "Seal this sticker?", ja: "このシールを<wbr/>仕上げますか？" },
    /** Seal sheet, raised by the clock reaching 0:00 (or brought back by a reload then): its title, and its name for screen readers, also announced when it turns in place; the drawing can only be sealed now */
    timeUp: { en: "Time’s up", ja: "タイムアップ" },
    /** Seal sheet, a sheet in Kyoto Seika Practice Mode at 0:00: its title in hand lettering, the proctor's call that ends the test as はじめ began it, and its name for screen readers, also announced when it turns in place */
    pencilsDown: { en: "Pencils down", ja: "やめ" },
    /** Seal sheet: the switch row's only words, the sticker detail's own; on, the sticker seals as 18+, and the preview's edge turns pink foil; off on every new sheet */
    nsfw: { en: "Mark 18+", ja: "18+にする" },
    /** Seal sheet: the 18+ switch's name for screen readers, which starts with its visible words */
    nsfwLabel: {
      en: "Mark 18+: blurred for anyone who hasn’t turned on Show 18+ stickers",
      ja: "18+にする：「18+のシールを表示する」をオンにしていない人にはぼかして表示",
    },
    /** Seal sheet: the key, with a check mark, that seals the sticker and starts the seal ceremony */
    seal: { en: "Seal", ja: "仕上げ" },
    /** Seal sheet: the quiet link under Seal that closes the sheet back to the drawing; not offered once time's up */
    notYet: { en: "Not yet", ja: "もう少しかく" },
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
    /** Drawing screen, top right: the Smoothing tile's name for screen readers, the title of the Smoothing bar it opens, and that bar's slider's name */
    smoothing: { en: "Smoothing", ja: "手ぶれ補正" },
    /** Drawing screen, top right: the clear tile at the end of the tool strip, which opens the clear bar for the current layer, named for screen readers; dimmed while that layer is empty */
    clear: { en: "Clear the layer", ja: "レイヤーを消去" },
    /** Drawing screen, tool strip: the Pencil only tile at its start, shown once a pen has drawn on this device, named for screen readers; pressed, only the pen draws on this sheet and fingers tap to undo and redo */
    pencilOnly: { en: "Pencil only", ja: "ペンのみ" },
  },
  colorSheet: {
    /** Color sheet, which slides up over the drawing screen from the color tile, or opens under the tool strip on a large screen: its heading, and its name for screen readers */
    title: { en: "Color", ja: "カラー" },
    /** Color sheet: the small label to the left of the row of recently used colors, 50px wide; hidden from screen readers */
    recent: { en: "Recent", ja: "最近" },
    /** Color sheet: the row of recently used colors, named for screen readers */
    recentColors: { en: "Recent colors", ja: "最近使った色" },
    /** Color sheet: the grid of preset colors, named for screen readers */
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
    /** Drawing screen, left edge: read by screen readers as the size rail moves; {{size}} is the brush's or eraser's size in px; the number shown on the rail doesn't use this text */
    value: { en: "{{size}} px", ja: "{{size}}ピクセル" },
  },
  /** The thin line beside the layer chips that sets the current layer's opacity. */
  opacitySlider: {
    /** Drawing screen, beside the layer chips: the opacity slider's name for screen readers */
    label: { en: "Opacity", ja: "不透明度" },
    /** Drawing screen, beside the layer chips: read by screen readers as the opacity slider moves, and shown beside its thumb while a finger is on it; {{value}} is 0 to 100 */
    value: { en: "{{value}}%", ja: "{{value}}%" },
    /** Drawing screen, beside the layer chips: the white label that sticks out from the opacity slider for a few seconds when a stroke meets a hidden layer (opacity 0), also announced; the label never wraps by itself, so the line break is where it wraps */
    hiddenHint: {
      en: "Hidden. Raise its\nopacity to draw.",
      ja: "非表示中です。不透明度を\n上げるとかけます。",
    },
  },
  /** The layer column under the size rail, and the options bar the current chip opens. */
  layers: {
    /** Drawing screen, the layer column under the size rail: the list of layer chips, named for screen readers */
    label: { en: "Layers", ja: "レイヤー" },
    /** Drawing screen, layer column: a chip's name for screen readers, by the number printed on it, which stays the layer's for life */
    chip: { en: "Layer {{number}}", ja: "レイヤー{{number}}" },
    /** Drawing screen, layer column: a chip's name for screen readers with one of its states after it, such as "Layer 2, hidden"; a chip with several states takes each in turn */
    withState: { en: "{{name}}, {{state}}", ja: "{{name}}、{{state}}" },
    /** Drawing screen, layer column: read after a chip's name by screen readers while its layer is at 0% opacity, which hides it and blocks ink on it */
    hidden: { en: "hidden", ja: "非表示" },
    /** Drawing screen, layer column: read after a chip's name by screen readers while its layer locks its transparent pixels */
    locked: { en: "locked", ja: "透明ピクセルをロック中" },
    /** Drawing screen, layer column: read after a chip's name by screen readers while its layer clips to the layer below; {{base}} is the number of the layer it shows through */
    clippedTo: { en: "clipped to layer {{base}}", ja: "レイヤー{{base}}でクリッピング" },
    /** Drawing screen, layer column: the + tile above the chips, which adds a layer over the current one, named for screen readers; dimmed at ten layers */
    add: { en: "New layer", ja: "新規レイヤー" },
    /** Drawing screen, layer options bar, opened by tapping the current chip: its name for screen readers; {{number}} is the layer's */
    options: { en: "Layer {{number}} options", ja: "レイヤー{{number}}の設定" },
    /** Layer options bar: the toggle tile that keeps the brush and the fill to pixels already on the layer, named for screen readers */
    lock: { en: "Lock transparent pixels", ja: "透明ピクセルをロック" },
    /** Layer options bar: the toggle tile that shows the layer only where the layer below has ink, named for screen readers; dimmed on the bottom layer */
    clip: { en: "Clip to layer below", ja: "下のレイヤーでクリッピング" },
    /** Layer options bar: the tile that moves the layer one place back, under the one below it, named for screen readers; dimmed at the back */
    moveBack: { en: "Move back", ja: "背面へ" },
    /** Layer options bar: the tile that moves the layer one place forward, over the one above it, named for screen readers; dimmed at the front */
    moveForward: { en: "Move forward", ja: "前面へ" },
    /** Layer options bar: the tile that deletes the layer at once, which undo brings back, named for screen readers; dimmed on the last layer */
    delete: { en: "Delete layer", ja: "レイヤーを削除" },
    /** Drawing screen, layer column: announced to screen readers when Move back or a drop puts a layer behind another; {{other}} is that layer's number */
    movedBehind: {
      en: "Layer {{number}} moved behind layer {{other}}",
      ja: "レイヤー{{number}}をレイヤー{{other}}の背面へ移動しました",
    },
    /** Drawing screen, layer column: announced to screen readers when Move forward or a drop puts a layer in front of another; {{other}} is that layer's number */
    movedInFront: {
      en: "Layer {{number}} moved in front of layer {{other}}",
      ja: "レイヤー{{number}}をレイヤー{{other}}の前面へ移動しました",
    },
    /** Drawing screen, the chip over the seal key: announced when a mark or layer change cannot finish because the device lacks canvas memory; it stays until a drawing change succeeds */
    inkFailed: {
      en: "Couldn’t update the drawing: this device is short on memory. Deleting a layer makes room.",
      ja: "端末の<wbr/>メモリ不足で<wbr/>絵を<wbr/>更新できませんでした。<wbr/>レイヤーを<wbr/>削除すると<wbr/>空きが<wbr/>できます。",
    },
  },
  /** The bar under the tools, named like its tile. */
  smoothingBar: {
    /** Smoothing bar, under the tool strip: the small label at the slider's left end, no smoothing; hidden from screen readers */
    raw: { en: "Raw", ja: "弱" },
    /** Smoothing bar, under the tool strip: the small label at the slider's right end, the most smoothing; hidden from screen readers */
    smooth: { en: "Smooth", ja: "強" },
  },
  /** The bar under the tools that asks before the current layer is cleared. */
  clearBar: {
    /** Clear bar, under the tool strip after a tap on the clear tile: its title, which also names it for screen readers */
    title: { en: "Clear the layer?", ja: "レイヤーを<wbr/>消去しますか？" },
    /** Clear bar: the line under the title, also read by screen readers; the timer keeps its time rather than starting over */
    line: {
      en: "Undo brings it back. The timer won’t start over.",
      ja: "「元に戻す」で<wbr/>戻せます。<wbr/>タイマーは<wbr/>リセット<wbr/>されません。",
    },
    /** Clear bar: the quiet link that closes it with nothing cleared */
    cancel: { en: "Cancel", ja: "キャンセル" },
    /** Clear bar: the red button that clears the current layer; undo brings its ink back */
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
