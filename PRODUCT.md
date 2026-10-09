# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

A phone-first web app inside LINE: a LIFF app on a LINE Login channel, opened from the Official account's chat menu or a Gift Message's link. LINE draws its own header bar above every screen: the page title, a ⋮ menu and a close button.

- Outside LINE's app, on a phone or a computer, the same link opens in the browser, which signs in with LINE Login first.
- On an iPad, LINE opens Croquis in a phone-size sheet, with the phone layout. In Safari or another browser, a touch screen at least 600 × 600 gets screens composed for the room; a smaller window, such as Split View or Slide Over, keeps the phone layout.
- iPhone is the target, and the iPad follows it with screens composed for its room. Android is out of scope unless it works for free, and nothing may block it.
- Phones 320px wide aren't supported.
- Phones are upright only. Inside LINE no web app can lock the orientation, so a phone on its side shows only "Turn your phone upright" until it's turned back; iPads take either way.

## Users

- **Artists, Japan-first.** LINE is where they already are. They draw often and give drawings to other artists, a common practice that gives them a prompt, makes friends and gets feedback. Many draw with a finger; some have an Apple Pencil.
- **Two kinds of artist, one app.** Friend-first artists, the default, draw, feel good and share with friends. Gamer artists also want to win, farming Gratitude for clout, arcade-style. There's no separate mode: the Gratitude combo escalates only for whoever pushes it, each person's figures sit on their stat board, and the leaderboards live in Explore.
- **Suspicious of crypto and money in an art app.** Artists read financial rewards or visible NFTs as a racket and wouldn't use the app; those who want to be paid use Skeb, Patreon or Fanbox.

## Product Purpose

Draw on your phone every day, and give your stickers to other artists with real digital scarcity. A sealed drawing becomes a one-of-one sticker on your sticker board, to keep or to give.

Success means an artist finishes a sticker in one sitting, gives it to a friend, and that friend receives it.

## Positioning

You can hand someone a physical drawing, but nothing makes a digital drawing scarce enough to give. Here, giving a sticker moves it: it leaves your sticker board for theirs, and its Transfer Trail keeps every hand it passed through. The seamless consumer flow for handing a drawing to a friend, from a LINE chat, is the part no neighboring product has.

## Operating Context

- **The sticker board is home.** The app opens on it, with three tabs: My board, Explore and Shop. Draw is the board's key, not a tab; while a drawing waits on the drawing screen, it reads Continue drawing.
- **Signing in is LINE's.** Inside LINE the person is already signed in, and the app's server makes their account on first open. Their handle (@alice) starts as their LINE name; the app asks for another before it opens only when that one is taken or can't be a handle. Privy makes their Sui account from the same LINE sign-in: it holds their stickers and pays for reserve tickets.
- **Every day ends at midnight Tokyo time,** for everyone: daily tickets refill, streaks count their days, and Explore's today and this week (from Monday) turn over.
- **Tickets.** Each sticker uses one. Everyone gets three daily tickets a day, ten in Kyoto Seika Manga Expression Practice Mode, which expire with the day. Reserve tickets are bought in the Shop, have no limit and never expire. Daily tickets are always spent first. Draw spends a daily ticket without asking and the canvas opens at once; a reserve ticket is always asked for; with neither left, Draw raises the out-of-tickets card over the board.
- **Drawing is three minutes on the clock.** The clock starts at the first mark on the sheet. It holds while the page is hidden, while the board is over the drawing screen or the phone is on its side, while the seal sheet, the color sheet or the Smoothing bar is open or a finger is on the size rail, and when the artist taps the timer to pause. The seal key opens the seal sheet: the sticker as it will be, an 18+ switch, Seal, and Not yet back to drawing. 0:00 is pencils down: the tools fade and the seal sheet rises with no way back to drawing, and nothing seals until Seal is tapped, even after a reload. The drawing in progress is kept on the device, with its brush size and Smoothing, so a reload picks it up, and is wiped once it's sealed.
- **Kyoto Seika Manga Expression Practice Mode,** a switch in Settings, practices Kyoto Seika's manga expression entrance test. A sheet's ticket gives it 30 minutes on the clock, and the day has ten daily tickets. Before the clock starts, the sheet deals two Kyoto Seika Subjects (題材) of different kinds in manga thought balloons: the word as the test prints it and its reading over any kanji, with no English. Each balloon's die rolls it a new subject; one rolled thirty times blows up, and its subject stays. Begin locks the pair in and starts the clock at once, as a proctor's 「始め」 does, and the pair stays in the sheet's corner as a margin note in non-repro blue, under the ink. The clock calls the time at 10 and 5 minutes left, and never pauses, as in the real test: neither a tool in hand nor the seal sheet holds it, a tap on the timer only says so, and only a hidden page or the board over the drawing screen holds it. A reload brings back the same pair, rolls and Begin, and a sheet keeps the clock and mode its ticket was spent in, so flipping the switch changes the next sheet. The sealed sticker keeps its pair, shown on its detail beside Timelapse, wears the Kyoto Seika Practice Mode foil, and its timelapse plays up to 20 seconds. The switch's name blacks out 精 like a manga censor bar, and its help note says, in its maker's voice, that Croquis has no connection with the university.
- **Tools:** brush, eraser and fill, which treats small gaps in the lines around it as closed; a size rail; a color sheet, with each new drawing starting in a random color from a curated set; and Smoothing, from Raw to Smooth, which steadies a finger's line by trailing it and keeps a Pencil's under the nib. The brush follows pen pressure at once, along the curve picked in Settings (Light, Normal or Firm, or Off for the brush's own size), or speed under a finger or a pen that senses no pressure. Brushes are fully opaque, with no opacity control. Two fingers tap to undo and three to redo, with undo and redo buttons too. Once an Apple Pencil draws on a device, each sheet starts in Settings' Input: Pencil only, where fingers only tap, unless it's set to Pencil and finger. A tile on the drawing screen switches the sheet, and a resting palm draws nothing and holds up no tap. The canvas stays nearly bare, as in Procreate, not ibisPaint. It must not lag. The sheet is the same on every device, shown scaled to fit, so a sticker comes out the same from a phone or an iPad, and turning an iPad mid-drawing keeps its shape. A left drawing hand, in Settings, mirrors the drawing screen.
- **Sealing is a ceremony, not a save.** The device cuts the sticker from the artist's own strokes, a die-cut with a white border sealed in gloss laminate, and sends it with its timelapse. The server stores it, numbers it (No.0147, counted across everyone) and mints it as a one-of-one NFT to the artist's Sui account. The ceremony waits for the server, then the sealed card offers Keep drawing or Back to My board. A sealed sticker's number, Original Artist, drawing time and seal date never change, and an NSFW mark never comes off.
- **The sticker board** is free-form. On a large screen, such as an iPad's browser, it has a layout of its own, with stickers at their phone size: the first time, your phone's arrangement; from then on, arranging either leaves the other as it was. Visitors see the layout for their own screen. Stickers you seal or receive land on it; drag, resize and turn them, or Remove one to the sticker tray. The Zipper opens the sticker tray: every sticker that's been yours, on dated sticker sheets filtered by All, Mine and Gifts, NEW until you've seen it. A sticker you gave leaves its faint outline on its sheet, which opens it among the stickers you gave.
- **Sticker detail:** the sticker large, paging through the rest, with its Original Artist, drawing time and seal date. Timelapse plays how it was drawn, stroke by stroke. The Transfer Trail lists each time it was given, newest first, with the Gratitude it earned and a replay of that combo. Its Original Artist can mark it 18+ there.
- **The stat board** is the back of a sticker board, a corkboard: tap a person's picture and name to turn their board over. It holds their User Stats: Gratitude received as one total, the streak (consecutive days with a sealed sticker), stickers made, received and given, and bests (longest streak, best combo in hits, best day: the most Gratitude in a day); and their Sui address as a QR code. Your own lists where your Gratitude came from, combo by combo, Direct or Residual, and adds Settings, with Language, Show 18+ stickers and Kyoto Seika Manga Expression Practice Mode, then, kept on the device rather than the account, the drawing hand and, on a device a pen has drawn on, Input and Pen pressure.
- **Giving,** from a sticker on your board or its sticker detail, or from Give on someone else's board, which picks one of yours. Give asks nothing first: the sticker comes off your board into a gift bag at once and moves into the gift escrow on chain, and LINE's friend picker opens to send the Gift Message from your own LINE account into the chat you pick: a frosted gift bag (never the sticker), "From @alice" and "Open your gift", whose link ends in the Gift Claim Token. Until it's received, you can take the sticker back out, from Giving or its sticker detail. A gift can be received for a week.
- **Receiving:** the friend opens the gift in LINE, which signs them up if they're new, pulls the tab to tear the bag open, and taps Accept; the sticker lands on their board. Whoever receives it first gets it. It can't be received from a group chat, by its giver, or twice. A gift that waits for someone, given from their board in the app or whose link they opened first, also shows on their board, where they can receive it without the link. The giver gets a LINE message from the Official account ("@bob received your sticker ♡"), and sees who received it the next time their board loads.
- **The Gratitude Mini-game** is the signature interaction, modeled on Death Stranding's likes. Once a received sticker sticks to the board, the app asks whether to send its giver Gratitude now; otherwise the sticker's detail offers Send gratitude until that gift has some. It's once per gift, with no deadline.
  - The first hit starts a draining bar. Each later hit adds time, less as the combo grows, while the drain speeds up, so every combo ends. Each counted tap, stroke pass or shake reversal is one hit, and a multiplier that fast play raises scales each hit's Gratitude.
  - Tap the heart, stroke it back and forth anywhere on the screen, or shake the phone. Stroke and shake are hidden: the heart hints as input heads toward one, and a run of fast passes or reversals unlocks it. Once a combo commits to stroke or shake, other input stops counting. Shake needs iPhone's motion permission, which the app asks for once after sign-in.
  - Effects escalate with the total through the tiers ありがと, 照れ, ドキドキ, オーバーヒート and 昇天, from a blush to over-the-top anime reactions. The ceiling is suggestive comedy with plausible deniability, never explicit: no bodies, undressing, explicit words or moaning audio. LINE's MINI App Policy bans sexual content.
  - The device keeps each finished combo and sends it to the server until it's recorded or refused. The giver gets its Gratitude as Direct. When the Original Artist is neither giver nor receiver, 20% of it goes to them out of the giver's part, as the Original Artist Gratitude Share (Residual).
- **Explore:** search artists by handle; Stickers, every sticker heaped in a pile by the Tokyo day it was sealed, newest day first and paging back by day as you scroll, tagged with who drew each and who a given one last went to; and This week's leaderboards: most Gratitude, best combo in hits, and the current streak. A search result, a leaderboard row or a lifted sticker opens that artist's sticker board, read only, with Give.
- **The Shop** sells reserve tickets through the reserve ticket checkout, which the drawing screen's ticket cards open too: packs priced in yen, bigger packs costing less a ticket, paid in JPYC from the person's Sui account. Each person's first pack of the size the server names (`FREE_FIRST_PACK_TICKETS`) is free, so someone with no JPYC can still buy: it's given on the server, with nothing on Sui. It lists their ticket purchases, read from Sui. Laminates, brushes and backing foils are shelves marked coming soon, each led by what everyone has now (gloss, the brush, holo), with no prices; nothing on them can be bought.
- **The Official account** is how people come back. Its chat menu, in the person's language, shows Draw with the tickets they have left, My board and Explore; someone without an account sees Open Sticker Board.

## Capabilities and Constraints

- **On chain, out of sight.** Each sticker is a one-of-one NFT on Sui, held by its owner's Sui account. Between Giving and Receiving a gift waits in an escrow, so its recipient needs no account yet. The app pays every transaction's network fee, through Shinami Gas Station; reserve tickets are paid in JPYC from the person's Sui account.
- **Storage:** sealed stickers' images live on the app's server. A drawing in progress, and Gratitude combos not yet recorded, wait on the device.
- **NSFW stickers:** anyone can mark a sticker 18+ as they seal it, with the seal sheet's 18+ switch, off on every new sheet; after sealing, only its Original Artist can, from its detail, behind a confirm. A mark never comes off. An NSFW sticker wears pink foil, in place of the holo foil, on every board, sheet and gift. Only someone with Show 18+ stickers on in Settings sees it unblurred or receives it; anyone else sees it blurred inside its cut, even their own. A mark after sealing stops the drawing showing from then on: the CDN's copies are cleared, but anyone who already saw it may have kept one, and while an unmarked sticker shares the same drawing, its files stay public.
- **Foil marks who drew a sticker:** on a sticker board or sheet, a sticker drawn by someone other than the board's owner wears the holo backing foil and names its Original Artist. Your own stickers never wear it, and foil is never a rarity grade. Two foils mark how a sticker was made instead, whoever drew it, your own stickers included: pink foil on an NSFW sticker, and the Kyoto Seika Practice Mode foil on a sticker drawn in Kyoto Seika Manga Expression Practice Mode. Pink wins on a sticker that's both.
- **Languages:** every screen is in Japanese and English. A new account starts in LINE's language (the device's, outside LINE), Settings switches it between English and 日本語, and that language also sets their chat menu and the Official account's messages to them. A Gift Message is in its giver's language.
- **LINE's limits shape the flows.** LINE shares no friend lists and has no web push. People find each other in Explore or through a Gift Message, and notices come from the Official account, which LINE delivers only to people who've added it as a friend. LINE's friend picker leaves out people who turned off sharing with apps and friends added in the last few minutes; once the picker closes without sending, Giving's "Can't find them?" says so and opens LINE's Add friends screen.
- **Strokes must never be lost,** to a reload or to LINE's own gestures.

### Never

- Money for stickers or Gratitude: nothing sells a sticker, and Gratitude never converts to money.
- Rarity, "limited" drops or resale prices.
- AI restyling: a sticker is cut from its artist's own strokes.
- Layers, textured brushes or filters on the drawing screen.
- Web push, which LINE's browser doesn't have.

### Not built yet

- Anti-AI protection: poisoning the image others see, removable only by the sticker's holder.
- Gratitude recorded on chain.
- Telling the giver about new Gratitude, by a LINE message or a mark on their board. They find it only on their stat board and in the sticker's Transfer Trail.
- A sticker's Gratitude shown as a glow behind it.
- Offers: asking for someone's sticker, swapping one of yours for it, or offering Gratitude for it.
- Posts: a feed of text posts with stickers, links and embeds, and posting after a seal or a gift.
- Giving to a random artist.
- Sharing your sticker board as a link or a QR code.
- Terms of Use and a Privacy Policy: the pages the app links to are placeholders.

### Open questions

- **Offered Gratitude:** when an offer is accepted, whether the Gratitude moves to the owner or is used up, and whether spending it lowers the offerer's rank.
- **LIFF app or LINE MINI App channel:** Croquis runs as a LIFF app on a LINE Login channel because its LINE developer account can't create a MINI App channel; a Japanese account may be able to. The code is the same either way.
- **Take the original:** whether a sticker's owner can take its original image file, which destroys the sticker, and how, since LINE's browser can't download files.

## Brand Commitments

- **The name is Croquis, クロッキー in Japanese.** A sticker board is a person's board of stickers, never the app.
- **The interface never says NFT, crypto, token, wallet, mint or burn.** Its words are sticker, sticker board, seal, give, receive and Gratitude.
- **The chain appears only where a person needs it, as a plain fact:** a person's Sui address on their stat board and behind the Shop's Deposit, as a QR code with its explorer; JPYC in the Shop and its checkout; and "on-chain" when a seal isn't confirmed there.
- **No financial framing** where a person can see it. Gratitude flows "to" people and never takes money words; Residual, in your gratitude events, is the one exception. The only prices are reserve tickets', in yen.

## Product Principles

1. **Giving is the product.** The gift button is the feature artists would actually use; every screen keeps a give within reach.
2. **Scarcity is felt, not explained.** A given sticker leaves you, and only its faint outline stays on your sticker sheet. Show consequences, never a lecture about blockchains.
3. **Zero steps to the canvas.** Draw, on the board or in the chat menu, opens the canvas at once; only a reserve ticket is asked for.
4. **Clout, not cash.** Gratitude measures attention and devotion. It never looks like money.
5. **An artist's app first.** It reads as made by artists for artists; the technology stays invisible.
6. **Sane on the surface, about to burst at the seams.** It looks colorful, simple, stable, intelligent and sharply designed, with a few accented oddities hinting there's more. Push hard enough and it bursts at the seams: that's the power-user and easter-egg layer. Drawing, Giving, Receiving and Gratitude stay rock solid underneath.
7. **Friends first; intensity is earned by pushing.** The default is calm and warm. The dopamine-and-clout side isn't behind a door: it opens up as you push the combo harder, and the numbers sit a tap away on the stat board and in Explore.

## Accessibility & Inclusion

- Drawing works by finger alone; an Apple Pencil adds pressure.
- Every screen is in Japanese and English, so layouts take either language's longer strings.
- Reduced motion is honored, and nothing needs motion: shake is one of three ways to play, and touch always works.
- Controls are named for screen readers, and gestures have alternatives: the gift bag's pull tab is also a slider, and the Mini-game's heart is a button.
