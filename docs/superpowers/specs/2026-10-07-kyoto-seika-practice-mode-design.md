# Kyoto Seika Manga Expression Practice Mode

Proposal for review, revised 2026-10-07 after your second round of answers. Nothing is built. Mockups were
laid over the running app and checked in Chromium at 360–430 wide and in WebKit at 390, in English and
Japanese.

A switch in Settings on your stat board, **Kyoto no Yuumei na Bijutsu Daigaku Entrance Exam Mode**
(京都の有名な美術大学入試モード), turns every new sticker into practice for Kyoto Seika's Manga Expression test:
a 30-minute clock, 10 daily tickets a day, and two Kyoto Seika Subjects (題材) dealt in manga thought balloons,
each with a die that rolls a new one. Begin locks the pair in and starts the clock; the pair stays in the
sheet's lower right as a faint margin note in non-repro blue, under the ink.

Success: flip the switch, open Draw, roll until the pair suits you, press Begin, draw for up to 30 minutes,
seal, and do it again, ten times a day.

## The test it practices

- Five subjects are given; the applicant picks two, combines them in one B4 page (one picture or panels,
  color or monochrome, dialogue and sound effects allowed) and writes up to 200 characters on it, in 180
  minutes. Kyoto Seika's English name for the test is Manga Expression.
  Guide pp. 34–35: https://www.kyoto-seika.ac.jp/pdf/2027/guide.pdf
  English brochure: https://www.kyoto-seika.ac.jp/pdf/2027/eng_KyotoSeikaUniversity.pdf
- It has run once, for 2026 entry (2025-11-16): 風, 再会, 地図, SNS, 双子.
  https://www.kyoto-seika.ac.jp/admissions/pn05ej000000ojgv-att/pn05ej000000ojqp.pdf
- A sample set came first: 光, 瞬間, 果物, スポーツ, 小学生.
  https://www.kyoto-seika.ac.jp/admissions/pn05ej0000008zcv-att/pn05ej000000fx9w.pdf
- All ten are bare nouns of at most four characters, and each set holds one of each of five kinds: a
  phenomenon (風, 光), a moment or event (再会, 瞬間), a thing (地図, 果物), a modern or loanword topic (SNS,
  スポーツ) and people (双子, 小学生). Two sets suggest that pattern; they don't prove it.
- International applicants need JLPT N2 or above (guide, 外国人留学生入試 requirements).

## Decisions

### Decided

1. **The name:** Kyoto Seika Manga Expression Practice Mode, in full. On screen it's the joke name.
2. **10 daily tickets** while the mode is on, instead of 3; reserve tickets work as usual after them. The
   allowance follows the switch at each spend: on after 3 used, 7 are left; off after 5 used, none are.
   Flipping the switch never refills. Anyone can turn it on for 10 free tickets, and that's fine for now.
3. **30 minutes on the clock.** One constant.
4. **A Begin key starts the drawing** (shaped below). Begin locks the pair in and starts the clock at once,
   as a proctor's 「始め」 does, so thinking time counts as in the real test. Before Begin the sheet takes no
   ink, and the tools are hidden.
5. **Deal two, each with its own die,** always from two different kinds. A roll never brings back either
   balloon's word or one of the last 40 dealt on this phone, and never pairs two words that share their
   English (泉 and 春 are both "spring").
6. **Both languages on every balloon:** the word as the test prints it, its reading as furigana when it has
   kanji, and its English. No meaning line: the words are high-school level, and a meaning would force a
   pick among a word's senses (owner's call, 2026-10-07).
7. **Nouns only, up to six characters**, as the test gives them; six lets in プレゼント, クリスマス, ランドセル
   and 宇宙飛行士. Action nouns (散歩, 料理, 再会) carry the verbs.
8. **The corner print, in non-repro blue:** a vertical margin note (below). A new material color for
   DESIGN.md (proposed #8CC8E8), a print on paper like Cork, not a coded hue.
9. **The sealed sticker keeps its pair,** fixed at seal like the drawing time. Its detail shows
   「題材 風 × 再会」 under the seal date, to you and to anyone you give it to.
10. **A sticker drawn in Kyoto Seika Practice Mode wears a foil of its own that reads as manga**
    (Kyoto Seika Practice Mode foil, below).
11. **Dark Kyoto Seika Subjects stay, behind a second switch.** 41 subjects (death, war and its machines,
    crime against people, alcohol, tobacco, gambling, drugs, the tsunami) are dealt only with "Dark subjects
    too" on, a switch under the mode's, off by default. Ghosts, devils, thieves, swords and poison stay in the
    main deal as manga staples. The dark switch keeps its state while the mode is off; dark subjects are
    dealt only while both are on.
12. **Settings apply without restarting the app:** Language and Show 18+ stickers today, and the two new
    switches. Built (Settings without a restart, below).

13. **Proctor's time calls** at 10 and 5 minutes left, as the timer's white label ("10 minutes left" /
    残り10分), besides today's 30 s and 10 s warnings.
14. **The mode belongs to the ticket.** A sheet keeps the clock and allowance its ticket was spent with, so
    flipping the switch mid-drawing neither cuts a 30-minute drawing to 3 minutes nor stretches a 3-minute
    one; it changes the next sheet.
15. **A timelapse plays up to 20 s on a sticker drawn in Kyoto Seika Practice Mode.** Such a sticker records
    its timelapse like any other; today a timelapse plays at most 6 s. Its detail says so beside Timelapse
    (below).
16. **The Kyoto Seika Practice Mode foil is direction A, tone,** and reacts to tilt (below). Pink foil wins on
    an 18+ sticker.
17. **The list is data in the repo; its build isn't.** The Python build goes once the list is final.
18. **Chat menus count to 10, for Kyoto Seika Practice Mode too.** Not a hard limit: menus of its own (×10
    down to ×1, plus reserve and none) let the midnight reset move people in the mode to ×10 and everyone
    else to ×3 (below).

19. **The mode's name on screen hides one character of the university's, like a manga censor bar:**
    「京都█華大学 入試モード」 / "Kyoto ███ka University Entrance Exam Mode", so it's plainly a censor and
    plainly Seika. A help button beside the switch opens a short note: what the mode does, and one line in
    its maker's voice that they added it for their own application and that Croquis has no connection with
    the university (Settings, below). No legal language.
20. **Anyone can mark a sticker 18+, at seal or after:** its own spec, `docs/superpowers/specs/2026-10-07-mark-18-plus-anytime-design.md`.
21. **The upper balloon deals from an evocative tier:** 618 subjects a student can picture a scene for at
    once (夜, 再会, 秘密基地, 怪獣, タイムマシン), picked by hand from every kept one. The lower balloon deals
    from the whole list, and each die re-rolls within its own balloon's pool, so every pair has at least one
    strong word and the rest of the list still turns up.
22. **Vocabulary, in AGENTS.MD:**
    - _Kyoto Seika Manga Expression Practice Mode_ (decision 1), Kyoto Seika Practice Mode for short, as in
      the foil's name. Never "practice mode", and no nouns coined from it ("practice sticker"): a sticker
      drawn in Kyoto Seika Practice Mode. Code and data use the stem `kyotoSeika` (`kyoto_seika` in SQL,
      `kyoto-seika/` for the folder), as Residual is `residual` in code.
    - _Kyoto Seika Subject_ (題材): one of the two words dealt for a sticker drawn in Kyoto Seika Practice Mode.
      The guide's word is 題材, in Japanese only: Seika publishes no English version of this test's rules, and
      its English brochure names only the test, "Manga Expression". On screen: 題材 in Japanese, "subject" in
      English (JMdict's first gloss for 題材).
    - _Kyoto Seika Practice Mode foil_: the foil a sticker drawn in Kyoto Seika Practice Mode wears
      (decision 10).
    - _Daily ticket_ changes: "one of the three free tickets each user gets per day" becomes three a day,
      ten in Kyoto Seika Manga Expression Practice Mode (decision 2).

    The balloons, dice, Begin key and corner print are screen elements and get code names only.

## Design brief

Shaped with impeccable inside the established world (DESIGN.md): an extension of the drawing screen, no new
visual world. Operate mode; the delight is in the deal and in Begin.

- **Who and when:** an artist practicing for the test, often a JLPT N2 learner, on a fresh sheet.
- **Delight thesis:** the deal feels like thinking in manga, and Begin like the moment an exam starts. Two
  thought balloons bob over the blank sheet, a roll puffs one word out and the next in, Begin tucks them
  into the margin as a note in manga paper's non-repro blue, and the clock starts.

### The deal (a fresh sheet in Kyoto Seika Practice Mode)

- **On screen:** the timer dot reading 30:00, the two balloons with their dice, and the Begin key at the
  sheet's foot. The tool strip, size rail, undo and redo are hidden until Begin, as in an exam where you
  wait for 「始め」. On the first visits the white label under the timer reads "Starts when you press Begin" /
  「はじめを押すとスタート」 in place of "Starts when you draw".
- **Balloons:** manga thought balloons (もくもく), bumps round an ellipse, Canvas white with a 2.25 px Ink
  edge and the Lift shadow, since they float. A trail of three beads runs toward the sheet's left edge, the
  thinker off the page. The first sits upper left at −3°, the second lower right at +2.5°, overlapping by
  about 46 px, and the pair centers in the space between the timer's label and the Begin key. Spreading them
  to fill that space was tried at 430 × 932 and left them looking unrelated.
- **Inside, top to bottom:** the reading (12 px Graphite, ruby, only over kanji), the word (`--font-jp` 800:
  46 px for one or two characters, 42 for three, 36 for four, 32 for five, 28 for six, 40 for a Latin
  acronym), the English (16 px, 750).
- **Short phones:** the balloons tighten (word 36 px, less padding) rather than scaling down, so nothing goes
  under the 11 px floor; where even that doesn't fit, they draw closer.
- **Dice:** small label stock (32 px face over a 3 px lip, 44 px touch) on each balloon's lower-right edge,
  holding Phosphor's die (bold).
- **Begin:** the screen's one key, Seal Yellow ("yellow is now"), with the Draw icon: "Begin" / 「はじめ」,
  the proctor's word. Centered at the sheet's foot, 196 px wide, in the thumb's reach.
- **A touch on the sheet before Begin** draws nothing: the Begin key nudges, as the timer does for a stroke
  on a paused sheet.

### Motion (tunable values; reduced motion honored)

Prototyped over the running drawing screen and recorded in both languages; the values below are the
prototype's.

- **Arrive:** each balloon's three beads pop in from the thinker's side (220 ms, spring), then the cloud
  puffs out with a squash and stretch (scale 0.55 × 0.5 → 1.06 × 0.96 → 0.98 × 1.03 → 1, 420 ms), then the
  word stamps in, tilted and large to settled (1.35 → 1, −6° → 0°, 260 ms, spring). The second balloon
  starts 260 ms after the first. Reduced motion: they're simply there.
- **Float:** ±3 px and ±0.6°, periods 3.4 s and 4.1 s, so the two never sync. Stops while the page is
  hidden; none under reduced motion.
- **Roll:** the die tumbles two turns with a hop (420 ms); the cloud squashes (0.95 × 0.97 → 1.03 × 1.01 →
  1, 300 ms) and five small puffs of smoke burst from it; the old word shrinks to 0.7 and fades (120 ms),
  and the new one pops past full size and settles (220 ms, spring). Reduced motion: the word swaps.
- **Begin:** the shared press, then the key drops 56 px and fades (220 ms); the balloons shrink toward the
  corner and fade (360 ms, `--ease-out`) as the margin note fades in (200 ms); the tools fade in 120 ms
  later, as after Keep drawing; the clock starts on the press. Reduced motion: one frame.

### Rolling too much (easter egg)

Each die counts its own rolls on the sheet. Rolling the same balloon again and again earns a running
commentary, in manga hand lettering (書き文字): white Dela Gothic One with a thick ink outline, tilted −6°,
popping in (scale 0.3 → 1.15 → 1) and peeling off after 1.6 s. One line at a time per balloon: a new one
knocks the last off. It sits outside its balloon, above the upper one and below the lower one, so the word
stays readable.

| Roll  | Japanese               | English                     |
| ----- | ---------------------- | --------------------------- |
| 10    | ええ、また？           | Eh? Again?                  |
| 13    | まだ決めてないの？     | Still deciding?             |
| 16    | いい題材じゃない？     | Isn't that a good one?      |
| 19    | 次こそ神題材だとでも？ | Holding out for god-tier?   |
| 22    | ボタンが壊れちゃう！   | You'll break the button!    |
| 25    | もう知らないよ？       | Don't say I didn't warn you |
| 26–30 | 5, 4, 3, 2, 1          | 5, 4, 3, 2, 1               |
| 30    | ドカーン！             | KA-BOOM!                    |

- Your lines, corrected: Ee? Mata? → ええ、また？; Mada kimete nai? → まだ決めてないの？; Ii subject desu ne? →
  いい題材じゃない？ (said as a tease); Tsugi no kotoba wa kami → 次こそ神題材だとでも？ ("you think the next one's
  god-tier?"; 神 is "god-tier" here, as in slang); Button korawarete shimau → ボタンが壊れちゃう！ (こわれる, and ちゃう
  is the spoken しまう). Roll 25 is mine, so the warnings run every third roll up to the countdown.
- **The balloon reacts too, with manga's emotion marks (漫符):** a sweat drop at roll 10, an anger vein at
  19, and from 22 it shivers. From 26 the die smokes.
- **Countdown:** from roll 26 the line is a big Seal Yellow number over the die, 5 down to 1.
- **The bang, at roll 30:** a manga explosion burst (white, Tomato and Seal Yellow, ink outlined) blows from
  the die with KA-BOOM! / ドカーン！ and a spray of die chips, and the balloon jolts. The die is left charred
  black, cracked and smoking, and takes no more rolls: that balloon's subject is the one to draw. The other
  balloon's die still works. Screen readers hear "The die blew up. This subject stays."
- Reduced motion: the lines and the countdown fade in and out in place, the burst fades instead of
  blowing, and the marks hold still.
- The counts and the charred die go with the sheet; the kept session keeps them, so a reload doesn't fix
  the die.

### The corner print (drawing)

- A vertical margin note (縦書き), like the notes on a manga page's margin, in non-repro blue: a small boxed
  題材 label, then each subject top to bottom with its reading as furigana on its right, as vertical text
  carries it, and its English set sideways on its left. 24 px words, 20 px for four characters or more;
  11 px furigana; 11.5 px English.
- Inside the sheet, under the transparent ink canvas, so ink covers it. 16 px from the sheet's right edge,
  its foot 150 px above the sheet's: clear of the seal key, the 18+ switch above it, and the first visits'
  seal hint beside it. It takes no touches. A short pair stands about 130 px tall; the longest about 240.
- Mockups compared it with a two-line horizontal print, which ran 216 px into the drawing with long words.

### The clock

- "30:00" doesn't fit the 48 px dot: its digit cells take 3.56 em, 46 px at 13 px, across a 48 px circle.
  The dot grows to 56 px while the clock reads 10:00 or more; under that it's the usual 48 px.

### Ten daily tickets

- Ten stubs overflow both ticket cards today (seen with the API answering ten a day): the sealed card's row
  of small stubs runs past both edges, and the out-of-tickets card shows four large ones, cut off.
- More than three daily stubs wrap in rows of five, like a strip of 回数券: small stubs as they are (224 px
  a row), large ones scaled to fit (about 55 px).
- The sealed card measures the sticker's flight to its slot once, as the card arrives. In the mockup, with
  two rows styled in before the seal, the sticker still landed over "Sealed", likely because the card grows
  after that measurement. Its height has to be final first, or the flight measured at landing.
- The Draw key's ticket reads ×10 and needs no change.

### Settings

- A third setting on the Settings note, under 18+: the legend "Entrance exam" / 入試 with a help button after
  it, the switch, the line under it, and a credit line linking to a Sources page.
- The switch's name is the parody (decision 19): "Kyoto ███ka University Entrance Exam Mode" / 「京都█華大学
  入試モード」, 精 ("Sei") blacked out with an ink bar like a manga censor bar (伏せ字). A tap on the bar lifts its
  corner, and a white label peels on under it: "Redacted for grown-up reasons" / 「大人の事情により伏せています」
  (大人の事情, "grown-up circumstances", is what Japanese TV and manga say when they can't name something).
  Screen readers hear the name uncensored: the bar is a sight gag.
- The help button is Phosphor's Question after the legend, Graphite and bold at rest, Ink and fill while
  open, 44 px to touch, named "About this mode". It opens the setting's note in place under the legend, a
  disclosure rather than a dialog, with a dashed rule under it as the card's rows have: how a sheet works in
  Ink, then the maker's line in Graphite, in 14 px body type (13.5 px Japanese). Mocked in English and
  Japanese, in Chromium and WebKit (`data/scratch/mockups/out/help-*.png` in the `seika-exam` worktree).
- While the mode is on, "Dark subjects too" sits under it, indented with a rule at its left, with its own
  line: "Death, war, crime, alcohol and tobacco." It has no divider above it; the mockup's clone of the 18+
  setting drew one through the credit line.

### The tag beside Timelapse

Where the detail offers Timelapse, a sticker drawn in Kyoto Seika Practice Mode says what it is: under the
drawing time and Timelapse, an ink label-tape tag, tilted −2°, with a tone swatch matching its foil,
"Entrance exam practice" / 「入試練習」, and beside it the pair, 「風 × 再会」, at 20 px with 11 px furigana
over each kanji word.

### Furigana

Only Kyoto Seika Subjects get furigana, nowhere else in the app. Every kanji word shows its reading: over it in the balloons and on the detail, to its right in the vertical
corner note. Group ruby (the whole word's reading, spaced over it), as JMdict gives a word's reading, not
each kanji's. Furigana never goes under the 11 px floor, so the words it sits on are set at 20 px or more.
A word whose kanji are rare is printed in kana and needs none (the review's 24 respellings).

### Accessibility

- The balloons are a group named "Your subjects"; each die is a button ("Roll another subject: 風, wind");
  a polite live region reads each new subject; the dice and Begin take keyboard focus in reading order.
- Begin's name says what it does: "Begin: start the 30-minute timer".
- Once drawing, the canvas's name includes the pair, since the faint print is no use to a screen reader.

### Copy (catalog, English and Japanese)

- Settings legend "Entrance exam" / 入試. Switch "Kyoto ███ka University Entrance Exam Mode" / 京都█華大学<wbr/>入試モード
  (two lines in English, one in Japanese). Under it: "Practice for the manga expression test: a
  {{minutes}}‑minute timer, {{tickets}} daily tickets a day, and two subjects to combine." / マンガ表現の練習に。
  タイマー{{minutes}}分、無償チケット1日{{tickets}}枚、題材を2つ組み合わせてかきます。 Credit: "Subjects from
  JMdict, WordNet and Wiktionary. Sources" / 題材：JMdict、WordNet、ウィクショナリー 出典. Status lines: "On:
  your next sticker deals two subjects." / オンにしました。次のシールから題材が2つ出ます。, and "Off: your next
  sticker has the usual clock." / オフにしました。次のシールはいつもの時間です。
- Help button "About this mode" / このモードについて. Its note: "Each new sticker deals two subjects to
  combine, and the die beside each deals another. Begin starts the {{minutes}} minutes at once, as in the
  real test." / シールをかくたびに題材が2つ配られ、横のサイコロで別の題材にできます。「はじめ」を押すと、試験の
  「始め」と同じく{{minutes}}分のタイマーが動きだします。 Then: "Croquis’s maker is applying to Kyoto Seika too,
  and built this mode to practice. Neither Croquis nor its maker has any connection with the university." /
  クロッキーの作者も京都精華大学の受験生で、自分の練習のためにこのモードを作りました。クロッキーも作者も、大学とは
  関係ありません。
- Dark switch: "Dark subjects too" / 重い題材も出す; "Death, war, crime, alcohol and tobacco." / 死、戦争、
  犯罪、お酒、たばこなど。
- Begin / はじめ. Timer label: "Starts when you press Begin" / はじめを押すとスタート.
- Balloons group "Your subjects" / 題材. Die "Roll another subject" / 別の題材にする.
- Time calls "{{minutes}} minutes left" / 残り{{minutes}}分. Detail line (decision 9): 題材 {{first}} ×
  {{second}}.
- The glossary gains subject → 題材, and Begin → はじめ.

## Kyoto Seika Practice Mode foil

A sticker drawn in Kyoto Seika Practice Mode wears a foil of its own that reads as manga (decision 10).

### What real special foils say

- **The manga cards print the manga in black and white, under foil.** One Piece Card Game's super parallels
  (collectors' "manga rare") lay the original manga's black-and-white panels behind the character
  (https://www.onepiece-cardgame.com/products/boosters/op09.php). Their gold version tints those panels under
  one metal.
- **Rays read as focus lines.** Dragon Ball Fusion World's MANGA BOOSTER parallels put Toriyama's art over a
  holo ray burst, silver or gold (https://dragon-ball-official.com/news/01_3514.html). Bikkuriman's
  hologram stickers have the same burst.
- **Foil stamps a person's hand.** Weiss Schwarz stamps voice actors' signatures in gold foil
  (https://ws-tcg.com/products/sfn_bp/).
- **Manga's own print is ink, tone and non-repro blue:**
  - screentone: dot tone by lines per inch and density, gradation tones, and highlights scraped out of the
    tone (https://ja.wikipedia.org/wiki/スクリーントーン);
  - focus lines (https://ja.wikipedia.org/wiki/効果線);
  - manuscript paper's blue guides, printed in a color that doesn't print (https://www.icscr.jp/faq/manga-paper9/).

What reads as manga is black ink on paper white, not the foil: a rainbow alone always reads as holo, and pink
is taken. So the band is ink first, with one foil reaction.

### Three directions, mocked on the real foil band

Each was laid over the board's foil band on a sticker given on the mock chain, and shot at 3× in Chromium,
board and detail; A in WebKit too. In all three, the ink stays still and the foil reaction follows the app's
one light.

- **A, recommended: tone (網点).** The band is a gradation screentone, shaded away from the app's one light:
  open dots on the lit top left, closing toward the bottom right. White sparkles scraped out of the tone
  catch the light and slide with the phone's tilt, which is the foil.
  - Of the three, it's the only one that reads as manga at a glance on the board, at 5 px. It also keeps the
    world's lighting: the shaded side is the side the app's shadows fall on.
  - Built with CSS: a dot grid over a gradient, thresholded by `filter: contrast()` into real dots that grow,
    on a layer that doesn't move, so it's painted once. Only the sparkle layer moves, by `translate`.
- **B: manuscript paper (原稿用紙).** An ink panel border round the band's outer edge, paper white, the
  margin's non-repro-blue ruler ticks, and a pearl sheen over the paper.
  - The one only a manga artist would place, since Seika applicants draw on this paper. It also matches the
    corner print's blue.
  - At board size it reads as a blue ruler.
- **C: beta flash (ベタフラッシュ).** A solid ink band with white flash lines tapering toward the sticker,
  and an iridescent sweep in the white.
  - Dramatic in a manga, but at 5 px the lines read as a barcode, as plain focus lines on white did.
- **Considered and dropped:** solid ink with gold foil (from the gold super parallel and foil-stamped manga
  titles). In the mock it read as luxury, not manga, and gold sits next to Seal Yellow.

### Where it shows

- **Whoever drew it,** everywhere pink foil shows today (boards, tray sheets, the detail, the receive
  dialog, the View dialog and Explore's lifted sticker): it marks how the sticker was made, not whose hands
  it's in. On a sticker drawn in Kyoto Seika Practice Mode by someone else, it takes holo's place, and the
  artist chip still names who drew it.
- **Pink wins:** an 18+ sticker drawn in Kyoto Seika Practice Mode wears pink foil, which protects people.
  Its detail still shows its pair.
- **Like holo and pink, not on** the sealed card, the gift bag, the Gratitude mini-game or Explore's pile.
- DESIGN.md has no rule for pink foil today, and its Other Hand Rule says foil never shows on your own
  stickers. The build writes both exceptions into it.

### In the code

- `FoilTone` gains `"kyoto-seika"`; `StickerFigure` picks pink, then Kyoto Seika, then holo; the tray's own
  copy of the foil markup (`traySheets.ts`) does the same.
- The sticker's pair (`kyotoSeikaSubjects`) is what marks it, carried as `nsfw` is: API shape, view types,
  board and tray stickers.
- `.sticker-foil--kyoto-seika` in `sticker-foil.css`, with the tone, the scraped sparkles and their tokens.
- **Tilt:** the sparkles follow the app's one light (`light.ts`): pointer, and the phone's tilt once the
  motion permission the app already asks for is granted. They slide across the tone as the phone turns,
  and the tone's shading turns with the light, so its open side always faces it. The shading repaints only
  when the light moves, at most every 45 ms.
- Reduced motion: the sparkles hold where the light last was. A board resting behind its cork pauses
  them, as it pauses the holo's flow.
- Check on a phone with the performance recorder: a board full of stickers drawn in
  Kyoto Seika Practice Mode, and the contrast filter on the tray's sheets.

## Server and data

- `users.kyoto_seika_practice_on_at` and `users.kyoto_seika_dark_subjects_on_at` (timestamps, null while
  off), the table's new last columns. `me` gains both; `POST /api/me/kyoto-seika-practice` sets them, as
  `/me/nsfw-opt-in` does.
- `ticket_uses.kyoto_seika_practice` (boolean, last): the mode the ticket was spent in. It fixes that sheet's
  clock and counts toward the day's allowance.
- Limits in `packages/db/src/schema/limits.ts`: `KYOTO_SEIKA_TIME_USED_S = 30 * 60`,
  `KYOTO_SEIKA_DAILY_TICKETS_PER_DAY = 10`.
- `ticketsOf` answers `dailyPerDay` from the person's mode; `dailyLeft` = that allowance less today's daily
  uses.
- Spending: daily while daily tickets are left, otherwise reserve. Today it's "the day's first three uses",
  which a mixed day breaks: 3 daily, 1 reserve, then the mode leaves daily uses at index 4–10.
- `ticket_uses_kind` CHECK becomes "a reserve ticket is never among the day's first three uses", which holds
  on every day.
- `stickers_time_used` CHECK rises to `KYOTO_SEIKA_TIME_USED_S`; the seal route refuses a `timeUsed` over its
  ticket's limit, since the CHECK can't see the ticket.
- `stickers.kyoto_seika_subjects` (JSON, the two words and their English, null on any other sticker; the
  table's new last column), sent with the seal, required for a ticket spent in Kyoto Seika Practice Mode and
  refused for any other. It reaches every sticker the API answers as `kyotoSeikaSubjects`, which marks the
  sticker for its foil too. The sticker's object on Sui doesn't carry it.
- Changing CHECKs rebuilds both tables: a generated migration with their `updated_at` triggers appended.

## Chat menus (decision 18)

The Official account's chat menu shows Draw with the tickets left, as one fixed image per count: LINE can't
change a menu's image, so each count is its own menu. Today each language has plain, 3, 2, 1, reserve and
none (`deploy/line/menus.json`), and the midnight batch moves everyone on a counted menu back to 3.

- **Kyoto Seika Practice Mode menus per language:** 10 down to 1, plus reserve and none: 12 more menus per
  language. Counts 4–10 are new images (7 per language, from the existing `chat-menus` render); 1–3,
  reserve and none reuse today's images under their own menu IDs.
- **Midnight:** one batch, two sets of moves: everyone on a Kyoto Seika Practice Mode menu to ×10, everyone
  else to 3. LINE's batch moves people by the menu they're on, which is why the mode needs menus of its own.
- **Switching the mode** relinks the person at once (the relink after a spend already exists).
- **Limits:** LINE allows 1,000 rich menus per Official Account; this brings Croquis to 37. Creating
  menus is limited to 100 an hour and batches to 3 an hour, which the one midnight batch stays within.
  A menu's chat bar text is at most 20 characters, so ×10's reads "Draw, 10 left".
- Its own deploy step: render the images, create the menus with `create-returning-menu.sh`, record their
  IDs in `menus.json`.

## App

- New feature folder `apps/frontend/src/kyoto-seika/`: the subject list and its loader, dealing, the
  balloon's geometry and the pair's layout (pure, tested), the balloons, the Begin key, the corner print.
- The subject list is a JSON module loaded only when a sheet opens in Kyoto Seika Practice Mode, with its
  licence and notices beside it.
- The session gains a phase before `primed` for a sheet in Kyoto Seika Practice Mode: dealt, waiting for
  Begin, the sheet locked. Begin starts the clock, so the clock's "waits for the first stroke" doesn't apply.
- The clock's length comes from the sheet's ticket, not the `SESSION_MS` constant; the start card's
  "{{minutes}}-minute" line and the warnings follow it.
- The kept session stores the ticket's mode and the pair, so a reload brings back the same balloons, or the
  same note once begun.
- Settings: the two switches on the Settings note, and the Sources page.

## Settings without a restart

Built and on main: Language and Show 18+ stickers apply in place, Show 18+ stickers failing closed. The two
new switches use the same `save` path (Settings, above).

## Subject list

### Sources

Every one allows commercial use; the shipped list is CC BY-SA 4.0.

| Source                                                                                                                         | Gives                                                      | Licence                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| JMdict, EDRDG: https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project                                            | the word, reading, part of speech and English gloss        | CC BY-SA 4.0: https://www.edrdg.org/edrdg/licence.html                   |
| Princeton WordNet 3.0                                                                                                          | the category, for sorting kinds only                       | WordNet License (BSD-style notice)                                       |
| Japanese Wiktionary, through kaikki.org: https://kaikki.org/jawiktionary/                                                      | a check of each word's sense, for choosing only            | CC BY-SA 4.0                                                             |
| Japanese WordNet 1.1, NICT: https://bond-lab.github.io/wnja/                                                                   | the link from a word to WordNet's sense, for choosing only | NICT's notice on every copy: https://bond-lab.github.io/wnja/license.txt |
| JLPT lists, Jonathan Waller (http://www.tanos.co.uk/jlpt/), keyed to JMdict by https://github.com/stephenmk/yomitan-jlpt-vocab | the level, for choosing only                               | CC BY; the keyed set CC BY-SA 4.0                                        |
| wordfreq: https://github.com/rspeer/wordfreq                                                                                   | frequency, for choosing only                               | data CC BY-SA 4.0                                                        |
| KANJIDIC2, EDRDG                                                                                                               | the school grade of each kanji, for choosing only          | CC BY-SA 4.0                                                             |

Japanese WordNet's own definitions read as machine translation (別れ 「礼儀正しく出発する行為」), so none is
shown. Ruled out: 日本語教育語彙表 (research use only, no redistribution), BCCWJ frequency lists (research and
education only), 分類語彙表 (non-commercial).

EDRDG wants its credit on an About or Sources screen, not only a launch screen: the switch's credit links to
a Sources page with every credit above, and the data file carries the Princeton notice and the CC BY-SA
attributions.

### The review

Every one of the draft's 2,206 nouns was read by hand: `2026-10-07-kyoto-seika-subject-cuts.md`.

- **Kept: 1,280,** 24 of them printed in kana (団扇 → うちわ, 薬缶 → やかん) and 14 with a fixed sense
  (紅葉 → こうよう, autumn leaves; マッチ, the match you strike, not a contest).
- **Behind the dark switch: 40** (decision 11).
- **Cut: 886:** too hard or dated 129, wrong or ambiguous sense 63, awkward 21, over six characters 12,
  duplicates 204, not a picture 457.
- Of the 50 hardest you saw, 9 stay as they are (蜃気楼, 影絵, ばい菌, 縁日, 鬼ごっこ, 渡り鳥, 宝探し, 雪崩,
  花壇), 7 print in kana, and 34 go, 聴診器 among them.
- **Added: 186 nouns WordNet lacks,** the test's own kind of word (小学生, 落ち葉, サブスク, 対決, 居場所,
  旅立ち), from a read of the 1,692 most common such nouns in JMdict, and 1 more behind the dark switch.

**The list: 1,507 subjects,** 41 of them dark: moments 378, things 429, phenomena 235, people 181,
loanwords 284; 618 in the evocative tier (decision 21).

**What ships:** the word, its reading and its English, all from JMdict, with the kind, tier and dark mark
the review gave it. English is respelled American (colour → color). A second read of every row caught English
words that missed the sense (感動 excitement → deep emotion, ネット network → Internet, 言葉 language →
words); each now comes from the right sense. Meaning lines were built and then dropped (decision 6).

### What's left

- Your critique of the cuts and of the tier.
- Known gaps: words newer than the JLPT lists and JMdict's commonness marks (推し) come in only by hand, and
  nouns WordNet lacks beyond the 1,692 most common weren't read.
- The list ships as a JSON module (word, reading, English, kind, tier, dark); the build
  that made it stays outside the repo (decision 17).

## Out of scope for now

- The 200-character explanation.
- Dealing five and picking two.
- B4 proportions: the sheet keeps the phone's shape.

## Checks during the build

- The timelapse, which every sticker drawn in Kyoto Seika Practice Mode records like any other: a synthetic
  30-minute session through the app's own encoding gzips to 136 KB at 60 Hz, 258 KB at 120 Hz and 478 KB at
  240 Hz (Apple Pencil), far under the 2 MB cap; confirm with a real one.
  Playback per decision 15. The pass that prepares a timelapse's fills gives up after 30 s: time it on a
  30-minute drawing with many fills.
- The ink engine over 30 minutes of strokes: undo history and the kept session's size. A long synthetic
  session, then the performance recorder.
- The sealed card with two rows of stubs (above).
- The Kyoto Seika Practice Mode foil at the tray sheet's 3 px band, and on a board full of stickers drawn in
  Kyoto Seika Practice Mode with the performance recorder.
- Turning Show 18+ stickers off in place: no NSFW drawing shows from memory or the browser's cache, and a
  failed reload keeps them hidden.
- The balloons on short phones without going under 11 px (above).
- Japanese in the English app falls back to Hiragino Sans (Zen Kaku Gothic New loads only in Japanese).
- 360, 390 and 430 wide and a short phone; English and Japanese; reduced motion; WebKit and Chromium.

## Build order

1. The subject list, after your critique.
2. Server and data, with tests: spending across modes, the seal's limit per ticket, the switches, the
   sticker's pair.
3. The session's dealt phase, Begin and the clock, and the kept session.
4. The Settings switches and the Sources page.
5. The balloons, dice, Begin and corner print: impeccable build with its craft floor, then `animate` and
   `delight` for the motion, `harden` for long words, short phones and both languages.
6. The Kyoto Seika Practice Mode foil and the sticker detail's 題材 line: impeccable build, `overdrive` for the foil's
   light.
7. Ten stubs and the sealed card's slot.
8. The 56 px timer dot.
9. Settings without a restart: language, then Show 18+ stickers with its fail-closed hiding. Its own
   branch, since it touches Settings everywhere; it can land before Kyoto Seika Practice Mode.
10. Docs: AGENTS.MD vocabulary, PRODUCT.md, DESIGN.md (balloons, Begin, non-repro blue, the timer, ten
    stubs, and the foil rules: pink and Kyoto Seika Practice Mode foil beside the Other Hand Rule).
11. Verification: the checks above, `impeccable detect`, and the finish reviewer.
