# Product

<!-- impeccable:product-schema 1 -->

Sources: `../source-doc.md` (ad0ll's spec, sent 2026-09-21) and the answers ad0ll gave on 2026-09-21 to the VM session's init questions, which are quoted in that doc. Each fact below comes from one of those unless marked **[inferred]**.

## Platform

web

A phone web app that runs inside LINE, in LINE's **LIFF browser** (ad0ll's answer: "LINE Mini App (LIFF)"). This is not "LINE's in-app browser", which is a different browser that lacks LINE's share picker and ⋮ menu. LINE draws a header bar above every screen: the page title with the site's domain under it, a ⋮ menu, and a close button. Every screen starts below that bar. The spec's fallback, a PWA covering iOS and desktop, was superseded by the LINE answer.

- **Channel type is open.** ad0ll's developer account can't create a LINE MINI App channel today, so as things stand this ships as a LIFF app on a LINE Login channel. The code is the same either way. A Japanese LINE account may unlock the MINI App channel, which ad0ll is weighing (2026-09-22).
- **Desktop is a plain website.** On a computer, the same URL opens in the normal browser, with Log in with LINE by QR code or email. LINE doesn't host apps on desktop.
- **iPhone is the hackathon target; Android is out of scope unless it works for free** (ad0ll, 2026-09-23). All testing is on iPhones. Design choices shouldn't block Android, and the team keeps prepared answers for judges' Android questions in `research/android-qa.md`.

## Stack

Static HTML/CSS: a **board** showing every screen side by side in phone frames under LINE's header, at full visual fidelity rather than grey boxes. ad0ll's answer was "Static wireframe board", and later instructions ask for designs that "all look really, really good." This reading was stated in the 2026-09-22 shape round and not corrected. The canvas is live so a judge can actually draw, and the giving and gratitude flows are interactive.

## Users

- **Artists, Japan-first.** LINE is where they already are. They draw often, and they give drawings to other artists: it's a common practice that gives them a prompt, makes friends, and gets feedback. Many draw with a finger (as Krita and Procreate artists sometimes do); some have an Apple Pencil.
- **Hackathon judges.** They read the interface in English, because they don't read Japanese (ad0ll's answer). The copy is English; the audience is Japan-first.

**Two kinds of artist, one app** (ad0ll, 2026-09-23):

- **Friend-first artists (the default):** draw, feel good, share with friends.
- **Gamer artists:** also want to win. They farm gratitude in a dopamine-driven, arcade-style clout layer that people only see if they choose to take part.

How to balance the two: there's no separate layer or mode (ad0ll, 2026-09-24). The gratitude combo escalates only when you push it, so friends who tap a few times send warm gratitude, and people who mash reach the wild upper tiers. Figures such as total gratitude and streak live on each person's stat board, and leaderboards live in Explore.

These artists are **suspicious of crypto and money in an art app.** ad0ll, an artist, writes that they would read financial rewards or visible NFTs as "a racket" and would not use the app. If they wanted to be paid, they'd use Skeb, Patreon, or Fanbox.

## Product Purpose

Draw on your phone every day, and **give your drawings to other artists** with real digital scarcity. A finished drawing becomes a one-of-one sticker on your **sticker board**. Its image data is protected with anti-AI poisoning (Nightshade or similar), and only whoever holds the sticker can remove that protection. You can keep it, give it away, or trade it.

Success means an artist finishes a drawing in one sitting, gives it to a friend, and that friend receives it.

## Positioning

You can hand someone a physical drawing, but no existing system makes a _digital_ drawing scarce enough to give. Here, giving one moves it: it leaves your sticker board, and old links to it redirect to its new owner (ad0ll, 2026-09-22, tentative; the spec had them stop working). The seamless consumer flow for handing a drawing off is the part no neighbouring product has.

## Operating Context

- **Opening the app is drawing.** One button starts a drawing; nothing sits in between.
- **Every drawing is a 5-minute session** (ad0ll, 2026-09-22). The clock starts at the **first stroke**, not when the canvas opens, and **pauses while the app is hidden** (minimized or switched away), resuming on return (ad0ll, 2026-09-22). At 0:00 it goes straight to sealing. Strokes in progress may sit in app-private storage during the session so a reload doesn't lose them; that storage is **wiped at sealing** (ad0ll, 2026-09-22). This is the spec's own solution to its storage problem: progress never needs durable storage, and image data never lands on the device, which keeps stickers scarce. It also makes "daily drawing" one small daily ritual, and gives each sticker an honest time-spent figure. The sketch shows ⌛5:00 on the canvas.
- **Sealing is a ceremony, not a save.** Sealing protects the image, makes it a one-of-one, saves it to cloud storage, adds it to the sticker board, and then offers to post it to your feed. Its metadata is the artist, time spent, and date created.
- **Giving is two-sided.** The sticker transfers only once the recipient receives it. After that, the giver is prompted to post about it.
- **Gratitude is a combo minigame** (ad0ll, 2026-09-23, replacing the flat five-second window). It's modelled on Death Stranding's likes, and it's the product's signature interaction.
  - A received sticker shows a **Send gratitude** button. It opens a big, softly pulsing heart and a one-line instruction to tap.
  - The first tap starts a **bar that drains**. Fast tapping wins some of it back, but the drain keeps speeding up, so after about 5 seconds it outruns anyone's tapping and the combo ends. Each tap is one gratitude.
  - **Effects escalate with the combo.** Early taps are modest. A long combo gets more and more anime, and more and more over the top, in suggestive, uncomfortable, played-for-laughs ways, even though you're only tapping.
  - **The intent** (ad0ll, 2026-09-23): "sexual but with hints and plausible deniability". Nothing in the app is explicitly sexual. It gets weird and possibly sexual only when you mash, or use the hidden gestures, in the gamer experience. The friend-first default never sees it. For the presentation, the dial can be turned up.
  - **The ceiling:** suggestive anime-comedy, never explicit. Allowed: blushing, steam, heart eyes, trembling, 「haa… haa…」, the nosebleed gag, screen shake, rising ♡. Never: bodies, undressing, explicit words, moaning audio. LINE's MINI App Policy bans sexual content, so deniability is the rule. One intensity dial scales every effect.
  - **Three ways to feed the combo** (ad0ll, 2026-09-23): tap, stroke and shake.
    - **Tap** is the default.
    - **Hidden stroke mode** is a nod to the Moero Chronicle and Fire Emblem touch minigames: a thumb stroking up and down the screen. It doesn't count at first; about 5 fast passes unlock it. You have to lift your finger to tap again.
      - **The grip:** on the Vita you pinched the console, index finger on the rear touch panel and thumb on the screen, and went at it. Expect people to hold their phone the same way (ad0ll, 2026-09-23). The phone only reads the thumb on the front glass, so detection has to accept a thumb stroking anywhere on the screen, not just on the heart.
    - **Shake** means shaking the phone.
  - **No mixing:** once you start stroking or shaking, you're committed to that method for the rest of the combo.
  - **Hint before unlock** (ad0ll, 2026-09-23). When your input is heading toward a hidden method, the heart hints at it, very subtly at first. A slight tremor when you shake the phone, for example, then stronger as you get closer, until the method unlocks.
  - **One arc, three looks:** all three methods follow the same escalation, but each has its own animation. Stroking gets motion lines, shaking sends the heart bouncing around the screen, and tapping has its own. Some are simple, some are elaborate.
  - **Shake needs motion permission on iPhone.** iOS only allows motion sensing after a permission prompt, triggered by a tap. Whether LINE's browser shows that prompt has to be tested on a phone. If LINE blocks it, shake is unavailable inside LINE and the method picker hides it.
  - **Recording:** the phone counts taps locally. It sends one total when the combo ends (or when the page closes), the server checks and saves it, then writes it on-chain once. The giver learns about it from one LINE message and an animation the next time they open the app.

## Capabilities and Constraints

- **Drawing tools:** paintbrush and eraser, each with a resizable size, plus a **color picker for the brush** (ad0ll, 2026-09-22). Each new drawing starts in a random color from a curated set, so drawings vary (ad0ll, 2026-09-27). **Brushes are fully opaque: no transparency or opacity control** (ad0ll, 2026-09-22). A fill tool is nice to have. **Stabilization** (stroke smoothing) as one slider (ad0ll, 2026-09-23: "nice to have if easy"; it is easy). **Anything beyond that is explicitly out of scope.** Autosave to temporary on-device storage. It must not lag.
- **Visual reference for drawing: Procreate** (Procreate Pocket on phones), **not ibisPaint** (ad0ll, 2026-09-23: "ibispaint is ugly as sin"). That means the canvas stays nearly bare, with a thin rail for size and a compact top-right cluster for brush, eraser and color.
- **Rendering:** JavaScript on the standard 2D canvas, as Kleki's brush engine does, switching to WebGL only if strokes aren't smooth on a real phone. Undo is stored as strokes, not full snapshots.
- **Gestures:** "whatever gestures people expect" (ad0ll, 2026-09-22). That means the convention Procreate, Magma and Kleki share: **two-finger tap to undo, three-finger tap to redo**. **[inferred]** Pinch to zoom and two-finger drag to pan, since Magma and Kleki have them and artists will try them; they change the view, not the tools. Small undo and redo buttons back the gestures up.
- **Never lose a stroke to LINE's own gestures.** In LINE, swiping down on the page can minimize the app, and web code alone can't reliably stop it. The app must run in a setup where LINE doesn't minimize it: a LIFF app with the `chat_message.write` scope on, or an unverified MINI App, where LINE offers minimize only to verified apps. Check on a real phone on day one.
- **Sticker board** (your wallet, in the product's own word): every sticker you own, whether you made it or were given it.
- **Sticker detail:** full screen, swiping left and right between stickers. Shows the artist, date created, and date you got it; a special mark when the artist still owns their own sticker; and its Transfer Trail. The owner can **take the original file**, which destroys the sticker (the spec's "burn").
- **Profile:** username, avatar, and sticker board address. A top hero with Edit (own profile) and **Give** (someone else's). Two tabs: **Feed** (emulate Bluesky or Twitter: text posts, attached drawings, deep links and embeds to posts and drawings) and **Sticker board**. On someone else's sticker board, each sticker has an **Offer** button to request it.
- **Offers:** a plain request, a swap for one of your own drawings, or **gratitude** (ad0ll, 2026-09-22, reversing the earlier "gratitude is never offered"). **No USDC anywhere.**
- **Gratitude is clout, never money** (ad0ll, 2026-09-22). It's never convertible to money, but kept on-chain. It can now be offered for a sticker. What happens to offered gratitude when an offer is accepted is **open**: whether it moves to the owner or is used up, and whether spending it lowers your rank. You earn it by drawing daily and keeping streaks, and from the gratitude Mini-game when someone receives your sticker. It ranks you on a leaderboard that brings attention to your work. The sketch breaks a total down into daily streak, inspired, and magic. What "inspired" and "magic" measure is undefined.
- **Global feed:** drawing activity across the app ("User drew [sticker]", "User gave [sticker] to User"). **User search.**
- **Sticker boards are public** (ad0ll, 2026-09-22). Profiles, sticker boards and stickers can be viewed without logging in, including by judges who don't use LINE. LINE Login is asked for only when someone acts: draws, gives, offers or receives.
- **Every artist picks a unique handle** (@alice). LINE display names aren't unique, so the handle is what people search for.
  - **Underneath, the handle is the artist's ENS name.** It's unique by construction, and the artist's stickers hang off it. The interface shows only @alice, never ".eth".
  - Handles can be Japanese: ENS accepts hiragana, katakana and kanji, and can mix in a–z. Run input through the standard ENS normalizer, and treat 。 as invalid, since only "." separates name parts.
- **Finding people is in-app only.** LINE doesn't share anyone's friend list with apps, and since February 2023 an app can't even tell which chat it was opened from. So people find each other through Explore, handle search, a profile link shared in a LINE chat, or its QR code.
- **Cold gifts pull people in** (ad0ll, 2026-09-23). The target case: an artist on the app wants to give a drawing to a classmate who isn't. Here is the flow, with LINE's limits:
  1. **Pick the classmate.** If they're LINE friends, the artist picks them from LINE's own friend and chat list (the share picker).
     - If not, a button opens LINE's own **Add friends** screen (`line.me/R/nv/addFriends`), where the artist searches the classmate's LINE ID, adds them, comes back, and picks them.
     - No app can search LINE users itself.
     - The one-friend picker shows **only** the Friends list, not recent chats or groups. It hides friends who set LINE's _External app access_ to "Never allowed", and friends added in the last few minutes. **Can't find them?** opens the full picker, where recent chats may appear.
  2. **The sticker moves to escrow.** While the gift is in transit, only the giver can see it, marked as pending, and it's hidden from everyone else.
  3. **The classmate gets a Gift Message in their LINE chat, sent as the artist:** the drawing, "Alice sent you a drawing", and **Accept**. The app itself can't send this: LINE only delivers the Official Account's messages to people who have added it.
  4. **Receiving is the sign-up.** The classmate is already logged into LINE. On a LIFF app they see one LINE consent screen; a Japan MINI App channel skips it. Then they accept the app's terms, and the server creates their account, wallet and ENS handle. The sticker lands on their new sticker board.
  5. **Making sure Bob gets it, with no extra steps** (ad0ll, 2026-09-23). A hand-over step and an in-person exchange were rejected as too much friction. The confidence comes from how the gift is sent:
     - The one-friend picker sends the Gift Message to exactly one private chat. It shows a frosted sleeve, never the drawing.
     - **Bob's Accept delivers the sticker immediately.**
     - The artist gets a **receipt, not a gate**: "Bob Tanaka received No.0147 ♡", with his LINE picture. A quiet "Not them? Take it back" link works for 24 hours; the on-chain transfer finalizes after that window, so taking it back is just a refund.
     - Delivery is held for the artist only in rare cases: the Gift Message was opened in a group chat, or a second person tried the same one.
     - Unopened gifts return after 7 days. People already on the app get gifts directly by handle.
     - LINE ID search needs both people to have passed LINE's carrier age check, which many adults haven't done. So the one-friend picker is the main path, not ID search.
- **Every transaction is paid by the app**, through gas-sponsored accounts or a gasless chain. That's why there's a **daily limit on drawings** per artist (ad0ll, 2026-09-23). The number is open.
- **Give to a random artist** (ad0ll, 2026-09-23): an option from any sticker on your sticker board. The app picks a recipient among artists on the app. They can still receive it or decline it, and a declined gift goes to someone else.
- **Wallets are invisible and made for you** **[inferred]**. A LINE account doesn't come with a usable wallet. LINE's own wallet products have closed or merged into Unifi, an opt-in wallet on a different chain. So the app's server creates each artist's wallet on first open, tied to their LINE ID, and handles every transaction. Nobody sees a wallet, a key or a signature prompt.
- **Notices go through the app's LINE Official Account** **[inferred]**; ad0ll was fine either way. It's the only way to reach someone outside the app, because LINE's browser has no web push. The same account's chat carries a Draw · Explore · You menu, which is how people come back daily. Pending gifts and offers also show inside the app.
- **Navigation** (from the sketch): three tabs, **DRAW · Explore · You**.
- **Sponsors** (backend only; never surfaced in consumer copy): ENS gives each artist a sub-registry that resolves their sticker board, and transfers update it. Sui/Walrus or Filecoin for file storage.
  - **Exception: the Sui credit** (ad0ll, 2026-09-27). "Payments on" with Sui's full logo, unmodified and in black, sits under the reserve ticket checkout's Pay key and at the foot of the Shop's reserve tickets section. It's a credit, not a link.
- **Open, and not to be invented as settled:** what the sketch's "inspired" and "magic" gratitude categories measure; how the leaderboard is scoped; what happens to gratitude offered for a sticker; LIFF app or MINI App channel.
- **The name is Croquis, クロッキー in Japanese** (ad0ll, 2026-09-26). A sticker board is a person's board of stickers, never the app.

## Brand Commitments

- **Never say "NFT", "crypto", "token", "wallet", "mint" or "burn" in the interface** (ad0ll: "I would want the fact that they're NFTs to be hidden in copy in the app"). The product's own words are **sticker board**, **sticker** or **drawing**, **give**, **offer**, **gratitude**, and **take the original**.
- **Your own stat board shows your addresses** (ad0ll, 2026-09-26): the board address on Ethereum Sepolia and your Sui address, each as a QR code on paper pinned under its chain's mark. Tapping one opens Copy address and its explorer (Etherscan, Suiscan). The copy still never says wallet.
- No financial framing anywhere a user can see it.

## Evidence on Hand

ad0ll's hand-drawn sketch (a photo in the 2026-09-22 conversation; the file is not on disk), transcribed:

- **Drawing screen:** a full canvas with ⌛5:00 at top right, a pull-tab on the left edge, and a handle at the bottom. A second state shows a left tool column (eraser, fill, pencil) and a bottom **🎁 Finish** bar.
- **Sticker board:** a vertical thumbnail strip on the left, the current sticker large with a 🔒 badge (protected), and a popup: _"You got 5k gratitude — Details: 1k daily streak · 5k inspired · 3k magic."_
- **Sticker board list:** rows of a thumbnail, an address (0xabcd, 0xabe, 0xdef), and a **Give** button. Addresses shown to users would contradict the brand commitment above, so this is a sketch-level placeholder.
- **Tab bar:** DRAW · Explore · You.
- **Explore / global feed:** a search bar, "User drew [sticker] 🎁500", "User gave [sticker] to User".
- **User search:** a query field over results User A, User B, Bluser C.
- **Another user's profile:** back button, avatar, 🎁500 gratitude, name, a grid of their stickers, and a **Give** button.

**No real content exists:** no artwork, users, handles, or gratitude figures. Everything in the drafts is authored demonstration material and must be labelled as such.

## Product Principles

1. **Giving is the product.** ad0ll calls the gift button "critical"; it's the feature artists would actually use. Every screen should keep a give within reach.
2. **Scarcity is felt, not explained.** A given sticker leaves you. Old links follow it to its new owner. Taking the original costs the sticker. Show these as consequences, never as a lecture about blockchains.
3. **Zero steps to the canvas.** Opening the app is starting to draw.
4. **Clout, not cash.** Gratitude measures attention and devotion. It never looks like money.
5. **An artist's app first.** It should read as something made by artists for artists; the technology stays invisible.
6. **Sane on the surface, about to burst at the seams** (ad0ll, 2026-09-23). It looks colorful, simple, stable, intelligent and sharply designed. A few accented oddities hint there's more. Push hard enough and it bursts at the seams: that's the power-user and easter-egg layer. Drawing, giving, receiving and gratitude stay rock solid underneath.
7. **Friends first; intensity is earned by pushing.** The default experience is calm and warm. The dopamine-and-clout side isn't behind a door: it opens up as you push the combo harder, and the numbers sit a tap away on the stat board and in Explore. (The hidden "flip side" reached by peeling your name label was dropped on 2026-09-24. ad0ll: the interaction "didn't look good".)

## Decisions of 2026-09-23 (latest; these override older lines)

- **Stickers and the Sticker Board.** Drawings produce **stickers**; you still draw the same way.
  - The sticker board is **free-form**: drag stickers to move them, resize them, and remove them to a tray.
  - A list of stickers that aren't on the board lets you drop them in or tap to add them.
  - Stickers you make, and stickers you receive, land on the board by default.
- **Gratitude per sticker shows as a subtle glow,** not a number. Where a user's own data lives (profile, totals) is open.
- **Stickers have ENS v2 names** under the artist's name.
- **Tickets.** Everyone gets **3 daily tickets a day**, refilled at midnight JST; unused ones expire. **Reserve tickets** are bought with Sui, have no limit and never expire. Daily tickets are spent first.
  - After sealing, an animated dialog shows the sticker being sealed.
  - It offers **Keep drawing** (spends a daily ticket) or **Go to sticker board**.
  - With no daily tickets left, drawing asks before spending a reserve ticket, or offers the **reserve ticket checkout**.
  - An **out-of-tickets** dialog appears when daily and reserve tickets are all used.
  - **Reserve ticket checkout:** packs of 1, 3, 5 and 10 for ¥100, ¥270 (10% off), ¥375 (25% off) and ¥600 (40% off), paid in JPYC on Sui. It shows every amount, the balance included, in yen only.
  - Every picture of tickets shows the tickets the next drawing can use (ad0ll, 2026-09-26): daily tickets while any are left, with reserve tickets as one ticket and its count; one reserve ticket once the daily ones are used; a zero never shows. The board's Draw key carries them tucked behind its right end, not inside it. Reserve tickets look bought: Blue, in the stickers' resin, with an Ink outline and a star.
  - The **Shop** tab (ad0ll, 2026-09-27): reserve tickets are the one thing on sale, then coming-soon shelves of laminates, brushes and backing foils, each led by what you have now, with no prices. They show intent only; nothing on them can be bought.
- **On-chain copy is allowed in the hackathon build** (for example, in the seal dialog). The real app would hide the complexity.
- **Gift delivery: no take-back and no grace window.**
  - Prevent mistakes at send time: the one-friend picker, a gift tag naming who it's for, receiving blocked when opened in a group chat, and each Gift Message works once.
  - The giver just gets "Bob received your sticker ♡".
- **AI sticker generation from the sketch** is coming later. It stays out of the designs until ad0ll is ready.
- **Designs first:** ad0ll wants to see the UI and UX before any working tech.

## Visual Direction (in progress)

- **Sticker Trade Book (シール帳)** is the leaning (ad0ll, 2026-09-23: "probably the right design"), from the 2026-09-23 direction round. It draws on Japan's 2024–26 sticker-trading boom: binders, puffy glossy stickers, trading.
- **Open scope question:** should a sealed drawing become a sticker? ad0ll calls this a scope change.
- **Proposed, not decided:** mask the hand drawing, turn it into a sticker with AI, and share the drawing and the sticker in one go. This conflicts with the app's anti-AI promise. A sticker border can also be cut from the drawing's own ink without any AI.

## Accessibility & Inclusion

Drawing must work by finger alone, since the Pencil is a nice-to-have. The copy is English for the judges, and Japanese localisation is a known future need, so layouts should tolerate longer strings.
