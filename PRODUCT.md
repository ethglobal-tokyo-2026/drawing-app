# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

A phone web app inside LINE: a LIFF app on a LINE Login channel, opened from the Official account's chat menu, a Gift Message's link or a croquis-app.eth name's link. LINE draws its own header bar above every screen: the page title, a ⋮ menu and a close button.

- Outside LINE's app, on a phone or a computer, the same link opens in the browser, which signs in with LINE Login first.
- iPhone is the target. Android is out of scope unless it works for free, and nothing may block it.
- Phones 320px wide aren't supported.

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

- **The sticker board is home.** The app opens on it, with three tabs: My board, Explore and Shop. Draw is the board's key, not a tab.
- **Signing in is LINE's.** Inside LINE the person is already signed in, and the app's server makes their account on first open. Their handle (@alice) starts as their LINE name; the app asks for another before it opens only when that one is taken or can't be a handle. Privy makes their wallets from the same LINE sign-in: a smart account on Ethereum Sepolia that holds their stickers, and a Sui account that pays for reserve tickets.
- **Every day ends at midnight Tokyo time,** for everyone: daily tickets refill, streaks count their days, and Explore's today and this week (from Monday) turn over.
- **Tickets.** Each sticker uses one. Everyone gets three daily tickets a day, which expire with the day. Reserve tickets are bought in the Shop, have no limit and never expire. Daily tickets are always spent first. Draw spends a daily ticket without asking and the canvas opens at once; a reserve ticket is always asked for; with neither left, Draw raises the out-of-tickets card over the board.
- **Drawing is three minutes on the clock.** The clock starts at the first mark on the sheet. It holds while the page is hidden, while the color sheet or the Smoothing bar is open or a finger is on the size rail, and when the artist taps the timer to pause. At 0:00 the sticker seals itself; the seal key seals it sooner, on a second tap. The drawing in progress is kept on the phone, with its brush size and Smoothing, so a reload picks it up, and is wiped once it's sealed.
- **Tools:** brush, eraser and fill; a size rail; a color sheet, with each new drawing starting in a random color from a curated set; and Smoothing, from Raw to Smooth. The brush follows pen pressure, or speed under a finger. Brushes are fully opaque, with no opacity control. Two fingers tap to undo and three to redo, with undo and redo buttons too. The canvas stays nearly bare, as in Procreate, not ibisPaint. It must not lag.
- **Sealing is a ceremony, not a save.** The phone cuts the sticker from the artist's own strokes, a die-cut with a white border sealed in gloss laminate, and sends it with its timelapse. The server stores it, numbers it (No.0147, counted across everyone) and mints it as a one-of-one NFT to the artist's smart account. The ceremony waits for the server, then the sealed card offers Keep drawing or Back to My board. A sealed sticker's number, Original Artist, drawing time, seal date and NSFW mark never change.
- **The sticker board** is free-form. Stickers you seal or receive land on it; drag, resize and turn them, or Remove one to the sticker tray. The first sticker you select on a phone says, once, how to open it, let go and put it away. The Zipper opens the sticker tray: every sticker that's been yours, on dated sticker sheets filtered by All, Mine and Gifts, NEW until you've seen it. A sticker you gave leaves its faint outline on its sheet, which opens it among the stickers you gave.
- **Sticker detail:** the sticker large, paging through the rest, with its Original Artist, drawing time, seal date and croquis-app.eth name. Timelapse plays how it was drawn, stroke by stroke. The Transfer Trail lists each time it was given, newest first, with the Gratitude it earned and a replay of that combo.
- **The stat board** is a sticker board's cork back: tap a person's picture and name to turn their board over. It holds their User Stats: Gratitude received (Direct and Residual), the streak (consecutive days with a sealed sticker), stickers made, received and given, and bests (longest streak, best combo in hits, most Gratitude in a day). Your own adds Settings, your board address and Sui address as QR codes, and Age verification.
- **Giving,** from a sticker on your board, or from Give on someone else's board, which picks one of yours: the sticker comes off your board into a gift bag and moves into the gift escrow on chain. LINE's friend picker then sends the Gift Message from your own LINE account into the chat you pick: a frosted gift bag (never the sticker), "From @alice" and "Open your gift", whose link ends in the Gift Claim Token. Until it's sent, you can take the sticker back out. A gift can be received for a week.
- **Receiving:** the friend opens the gift in LINE, which signs them up if they're new, pulls the tab to tear the bag open, and taps Accept; the sticker lands on their board. Whoever receives it first gets it. It can't be received from a group chat, by its giver, or twice. A gift that waits for someone, given from their board in the app or whose link they opened first, also shows on their board, where they can receive it without the link. The giver gets a LINE message from the Official account ("@bob received your sticker ♡"), and sees who received it the next time their board loads.
- **The Gratitude Mini-game** is the signature interaction, modeled on Death Stranding's likes. Once a received sticker sticks to the board, the app asks whether to send its giver Gratitude now; otherwise the sticker's detail offers Send gratitude until that gift has some. It's once per gift, with no deadline.
  - The first hit starts a draining bar. Each later hit adds time, less as the combo grows, while the drain speeds up, so every combo ends. Each counted tap, stroke pass or shake reversal is one hit, and a multiplier that fast play raises scales each hit's Gratitude.
  - Tap the heart, stroke it back and forth anywhere on the screen, or shake the phone. Stroke and shake are hidden: the heart hints as input heads toward one, and a run of fast passes or reversals unlocks it. Once a combo commits to stroke or shake, other input stops counting. Shake needs iPhone's motion permission, which the app asks for once after sign-in.
  - Effects escalate with the total through the tiers ありがと, 照れ, ドキドキ, オーバーヒート and 昇天, from a blush to over-the-top anime reactions. The ceiling is suggestive comedy with plausible deniability, never explicit: no bodies, undressing, explicit words or moaning audio. LINE's MINI App Policy bans sexual content.
  - The phone keeps each finished combo and sends it to the server until it's recorded or refused. The giver gets its Gratitude as Direct. When the Original Artist is neither giver nor receiver, 20% of it goes to them out of the giver's part, as the Original Artist Gratitude Share (Residual).
- **Explore:** search artists by handle; Stickers, every sticker heaped in a pile by the Tokyo day it was sealed, newest day first and paging back by day as you scroll, tagged with who drew each and who a given one last went to; and This week's leaderboards: most Gratitude, best combo in hits, and the current streak. A search result, a leaderboard row or a lifted sticker opens that artist's sticker board, read only, with Give.
- **The Shop** sells reserve tickets through the reserve ticket checkout, which the drawing screen's ticket cards open too: packs priced in yen, bigger packs costing less a ticket, paid in JPYC from the person's Sui account. It lists their ticket purchases, read from Sui. Laminates, brushes and backing foils are shelves marked coming soon, each led by what everyone has now (gloss, the brush, holo), with no prices; nothing on them can be bought.
- **The Official account** is how people come back. Its chat menu, in the person's language, shows Draw with the tickets they have left, My board and Explore; someone without an account sees Open Sticker Board.

## Capabilities and Constraints

- **On chain, out of sight.** Each sticker is a one-of-one NFT on Ethereum Sepolia, held by its owner's smart account. Between Giving and Receiving a gift waits in an escrow contract, so its recipient needs no account yet. Each person gets a croquis-app.eth name from their handle, and each sticker `<number>.<artist>.croquis-app.eth`, which follows whoever holds it. The app pays for sealing, Giving and Receiving; reserve tickets are paid from the person's Sui account.
- **Storage:** sealed stickers' images and NFT metadata live on the app's server. A drawing in progress, and Gratitude combos not yet recorded, wait on the phone.
- **NSFW stickers:** an adult can mark a sticker for adults as they seal it, and it wears pink foil, in place of the holo foil, on every board, sheet and gift. Only an adult sees it plainly or receives it; anyone else sees it blurred inside its cut.
- **Age verification,** on your own stat board, proves you're 18 or older with an Orb-verified World ID; one World ID verifies one live account. It's the only source of Age status, so everyone who hasn't verified is unknown.
- **Foil marks who drew a sticker:** on a sticker board or sheet, a sticker drawn by someone other than the board's owner wears the holo backing foil and names its Original Artist. Your own stickers never wear it, and foil is never a rarity grade.
- **Languages:** every screen is in Japanese and English. The app follows LINE's language unless the person picks one in Settings, and that language also sets their chat menu and the Official account's messages to them. A Gift Message is in its giver's language.
- **LINE's limits shape the flows.** LINE shares no friend lists and has no web push. People find each other in Explore, through a Gift Message or by a croquis-app.eth name's link, and notices come from the Official account, which LINE delivers only to people who've added it as a friend. LINE's friend picker leaves out people who turned off sharing with apps and friends added in the last few minutes; Giving's "Can't find them?" says so and opens LINE's Add friends screen.
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
- **The chain appears only where a person needs it, as a plain fact:** croquis-app.eth names, which open in the ENS app; your own board address (Ethereum Sepolia) and Sui address on your stat board, each as a QR code with its explorer; World ID where age matters; JPYC and the Sui credit ("Payments on" with Sui's full logo, a credit, never a link) in the Shop and its checkout; and "on-chain" when a seal isn't confirmed there.
- **No financial framing** where a person can see it. Gratitude flows "to" people and never takes money words; Residual, on the stat board's receipt, is the one exception. The only prices are reserve tickets', in yen.

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
