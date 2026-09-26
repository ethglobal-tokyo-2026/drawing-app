# Scope: daily drawing app (draft for ad0ll's approval)

2026-09-23. Built from `PRODUCT.md`, `../source-doc.md` and `research/`. The **Build** column is what the 36-hour hackathon build must make work. **Design** is what gets a screen now. Everything marked `default` is my recommendation, pending your confirmation.

Tiers:

- **MVP:** rock solid, part of the demo path.
- **Stretch:** built if time allows; it's designed now either way.
- **Later:** after the hackathon. It may still get a screen now.
- **Never:** ruled out.

## 1. Arrive and sign up

| Feature                                                                             | Build                           | Notes                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Open from LINE: the Official Account menu (Draw · Explore · You), links, gift cards | MVP                             | LIFF app on a LINE Login channel; switch to a MINI App channel if a Japanese account unlocks one   |
| Sign up in one pass: LINE consent → terms → handle → invisible wallet               | MVP                             | The handle is suggested from the LINE name; underneath it's an ENS name, and Japanese handles work |
| Public read-only profile, sticker board and sticker pages (no login)                | MVP                             | So judges without LINE can look                                                                    |
| Desktop                                                                             | Later                           | A plain website with Log in with LINE                                                              |
| iPhone (LINE's in-app browser, WebKit)                                              | MVP                             | The only platform tested                                                                           |
| Android                                                                             | Later, unless it works for free | Not tested; nothing may block it. Judges' answers are in `research/android-qa.md`                  |

## 2. Draw

| Feature                                                                                       | Build   | Notes                                                                  |
| --------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| 5-minute session: clock starts at the first stroke, pauses while hidden, seals itself at 0:00 | MVP     |                                                                        |
| Brush (fully opaque), eraser, size, color picker                                              | MVP     | Procreate-bare canvas                                                  |
| Undo and redo: two-finger tap, three-finger tap, plus buttons                                 | MVP     |                                                                        |
| Stabilizer slider                                                                             | MVP     | Cheap                                                                  |
| Pinch to zoom, two-finger pan                                                                 | Stretch | Magma and Kleki both have it                                           |
| Fill                                                                                          | Stretch |                                                                        |
| Autosave during the session, wiped at Seal                                                    | MVP     |                                                                        |
| **Daily drawing limit** (the app pays every transaction)                                      | MVP     | `default` **3 seals a day**; a streak counts any day with at least one |
| Layers, opacity, textured brushes, filters                                                    | Never   | Out of scope in the spec                                               |

## 3. Seal

| Feature                                                                  | Build            | Notes                                                                             |
| ------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------- |
| Human check at Seal (World ID)                                           | MVP              | Sponsor track. Skipping it still seals the sticker, marked unverified             |
| Anti-AI protection (the image others see is poisoned)                    | MVP (simplified) | A server-side adversarial-noise pass; real Nightshade is out of reach in 36 hours |
| **Die-cut sticker from the artist's own strokes** (dome gloss, holo rim) | MVP              | No AI, about a day of work. One sticker with two faces: Sticker and Flat          |
| Seal ceremony: cut → pour → place (2.4 s, tap to skip)                   | MVP              |                                                                                   |
| Fine print on every sticker: No., time spent, date, artist               | MVP              |                                                                                   |
| Stroke replay (proof it was drawn by hand)                               | Stretch          | Needs strokes uploaded at Seal                                                    |
| AI restyling of drawings into stickers                                   | **Never**        | Breaks the anti-AI promise; the die-cut gives you the sticker                     |

## 4. Sticker board and stickers

| Feature                                                                                                                 | Build   | Notes                                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| Binder of stickers, both yours and received                                                                             | MVP     |                                                                                  |
| Glue ghost where a given sticker was, filling with the hearts sent back                                                 | MVP     | Scarcity felt without explanation                                                |
| Zip pocket for gifts in transit, in and out                                                                             | MVP     |                                                                                  |
| Sticker detail: Sticker / Flat, artist, dates, holo while the artist holds it, Transfer Trail (@alice → ~~@ken~~ → you) | MVP     |                                                                                  |
| Old links redirect to the sticker's current owner                                                                       | MVP     |                                                                                  |
| Owner sees the clean, unprotected version                                                                               | Stretch | Needs key gating                                                                 |
| Take the original (destroys the sticker, hold to tear)                                                                  | Later   | LINE's browser can't download files, so this has to hand off to Safari or Chrome |

## 5. Giving and receiving

| Feature                                                                                                                                                                                                                                                                                                       | Build | Notes |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- |
| Recipient binding, revised 2026-09-23. The hand-over step and in-person exchange were **rejected as friction**. Confidence comes from sending to one friend's private chat. **Accept delivers the sticker immediately.** Alice gets a receipt, not a gate. The rows below replace the earlier hand-over rows. |

| Feature                                                                                                                                                                                                      | Build | Notes                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------- |
| **Accept delivers immediately**                                                                                                                                                                              | MVP   | No waiting, no word, no code                                                                          |
| **Notification to Alice:** "Bob received your sticker ♡"                                                                                                                                                     | MVP   | No take-back and no grace window (ad0ll: "we just can't have this friction")                          |
| **Mistakes are prevented at send time:** the one-friend picker, a **gift tag** naming who it's for (on the card and the receive screen), receiving blocked when opened in a group chat, each card works once | MVP   |                                                                                                       |
| Dropped: the "I'd love to keep it!" reply step, the confirmation word, the in-person code                                                                                                                    | —     | Too much friction. An optional "Reply in chat" button is Later                                        |
| Dropped: "Not for me" (sending a gift back) and returning unopened gifts after a week                                                                                                                        | —     | ad0ll: "We don't have time for this complexity in the hackathon." An unopened card stays "on its way" |

_The older rows below are kept for reference. Anything about hand-over, the word, the in-person code, or waiting for Alice is superseded by the table above._

| Feature                                                                                                         | Build   | Notes                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| **Direct gift to @bob:** Recent (people you've given to), handle search, or a profile                           | MVP     | Tied to Bob before it's sent; every repeat gift works this way                                                       |
| **Send in a LINE chat to one friend** (LINE's single-friend picker)                                             | MVP     | For friends not on the app yet                                                                                       |
| The gift card shows a **frosted sleeve**, never the drawing                                                     | MVP     | Cards can be forwarded; the drawing appears only when it lands on Bob's sticker board                                |
| **Accepting is the sign-up.** It then posts "I'd love to keep it!" as Bob into the same chat                    | MVP     | `liff.sendMessages` can post only into the chat the card was opened from, so a forwarded copy replies somewhere else |
| **Alice taps Hand it over** in that reply, or in the app's message showing the accepter's LINE picture and name | MVP     |                                                                                                                      |
| Auto hand-over after 24 h, only if clean: opened in a 1:1 chat, the only accepter, and Alice was told           | MVP     | Groups never auto-hand-over                                                                                          |
| If two people accept, each sees a word (e.g. MOCHI); Alice asks Bob for his                                     | Stretch | Tiebreaker                                                                                                           |
| **Hand it over in person:** Bob scans a one-time code on Alice's screen; she taps "It's them"                   | Stretch | For people who aren't LINE friends                                                                                   |
| "Not friends yet?" opens LINE's Add friends screen                                                              | MVP     | ID search is off for under-18s and adults who haven't done LINE's age check                                          |
| ~~Take it back any time before it's handed over; unopened gifts return after 7 days~~                           | Cut     | Superseded: no take-back, and no return of unopened gifts                                                            |
| LINE message to Alice when Bob accepts ("… would love to keep No.0147")                                         | MVP     | From the app's LINE account; she added it when she signed up                                                         |
| Needs the `chat_message.write` scope                                                                            | MVP     | Already planned to stop swipe-down minimize; adds one line to LINE's consent screen                                  |
| **Surprise an artist** (random recipient; a pass sends it on)                                                   | Stretch |                                                                                                                      |
| Post about it after giving                                                                                      | Stretch |                                                                                                                      |

## 6. Gratitude

| Feature                                                                      | Build | Notes |
| ---------------------------------------------------------------------------- | ----- | ----- |
| Proposed model, from `research/two-audiences.md`, pending your confirmation: |

- **Front (表).** Everyone sees a calm front with no numbers.
- **Flip side (裏).** The arcade is a flip side you choose to enter. You peel your own name label to get there, and pressing it flat takes you back.
- **Visibility.** A figure about an artist shows only when both that artist and the viewer are on the flip side.

| Feature                                                                                                                           | Build           | Notes                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Send gratitude** from a received sticker                                                                                        | MVP             | One tap sends it ("Sent to @alice ♡"); a quick second tap starts the combo                                                                                                                                                                                                                                                                                                                     |
| **Front combo, capped at the Calm tier** (a blush, a sweat drop, rising ♡); no count, no bar                                      | MVP             | Every tap still counts. Gratitude never expires, and the giver never sees "seen" or "no gratitude"                                                                                                                                                                                                                                                                                             |
| One total recorded per combo, before the payoff animation plays                                                                   | MVP             |                                                                                                                                                                                                                                                                                                                                                                                                |
| Giver's side: LINE message ("@mika sent you gratitude ♡"), and a heart dot fills the sticker's ghost                              | MVP             | No count on the front                                                                                                                                                                                                                                                                                                                                                                          |
| **The door:** an air bubble under your name label; push it to the edge, then peel                                                 | MVP             | Screen readers get a button                                                                                                                                                                                                                                                                                                                                                                    |
| **Flip side, full combo:** count, drain bar, every tier, the intensity dial (steam, heart eyes, 「haa… haa…」, shaking, overflow) | MVP             | Sound is off by default                                                                                                                                                                                                                                                                                                                                                                        |
| **The combo is a timer game** (ad0ll, after the first gallery review)                                                             | MVP             | The bar drains from the first combo tap. Each tap adds time, less as the combo grows (Mullet Mad Jack). Tap speed drives a multiplier on each tap's gain (Death Stranding's likes). The gratitude amount is always visible, with the multiplier beside it and nothing on the heart. Pop-in text is temporary and drawn from a large bank for each tier. There's no grid paper on these screens |
| Flip side, hidden **stroke** mode (hints, then five fast passes unlock it)                                                        | MVP             | Only on the Mini-game screen; scrolling past the edge is blocked so a stroke can't minimize LINE                                                                                                                                                                                                                                                                                               |
| Flip side, hidden **shake** mode                                                                                                  | Stretch         | The motion prompt shows only after you opt in; hidden if LINE blocks it                                                                                                                                                                                                                                                                                                                        |
| Flip side: your sticker board's back (totals split into daily, inspired and magic; your bests)                                    | MVP             | Inspired = gratitude for your gifts; magic = gratitude sent with a hidden technique                                                                                                                                                                                                                                                                                                            |
| Flip side: the Boards (most gratitude, best combo, longest streak), reset weekly                                                  | MVP (one board) | Each row leads with the artist's latest sticker                                                                                                                                                                                                                                                                                                                                                |
| Streaks: hidden on the front; on the flip side a missed day drops one rung, never to zero; days turn over at 4:00                 | MVP             | No streak guilt                                                                                                                                                                                                                                                                                                                                                                                |
| Secrets: easter eggs hidden in the app                                                                                            | Stretch         | 11 candidates in `research/two-audiences.md` §5; four are MVP. No collection, count or badges (ad0ll: "You just see them when you see them and it's fun when you do")                                                                                                                                                                                                                          |

## 7. Explore and profiles

| Feature                                                         | Build   | Notes                                                                                              |
| --------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| Handle search                                                   | MVP     |                                                                                                    |
| Today's seals, plus an activity feed (drew, gave)               | MVP     | The front shows no figures, no "top" strip and no sorting by gratitude                             |
| Profile: handle, avatar (from LINE), sticker board, Give button | MVP     | Streak and totals appear only on the flip side                                                     |
| Compose posts: text, an attached sticker, links and embeds      | Later   | The spec wants a Bluesky-style feed; the activity feed carries the demo                            |
| Offers: request, swap, or gratitude                             | Stretch | Gratitude offers only between two flip-side users; what happens to offered gratitude is still open |

## 8. Backend (never named in the interface)

| Feature                                                                              | Build | Notes                 |
| ------------------------------------------------------------------------------------ | ----- | --------------------- |
| Sticker as a one-of-one on-chain token, plus a holding contract for gifts in transit | MVP   |                       |
| Gas paid by the app (sponsored accounts or a gasless chain)                          | MVP   | Hence the daily limit |
| ENSv2 handles, with stickers as names under them                                     | MVP   | Sponsor track         |
| Storage of the protected image and die-cut mask                                      | MVP   |                       |
| On-chain gratitude, one write per combo                                              | MVP   |                       |

## Never

- USDC or money anywhere
- Gratitude converting to money
- Rarity, "limited" drops, or anything shaped like a price (the sticker boom's resale-rate culture is exactly the racket to avoid)
- AI restyling
- Web push, which LINE's browser doesn't support

## Open decisions (defaults in brackets)

1. Daily limit **[3 seals a day]**
2. Offers **[stretch]**
3. Feed compose **[later; activity feed only]**
4. Offered gratitude **[moves to the owner; the leaderboard counts gratitude earned]**
5. **Gift delivery** **[settled 2026-09-23: accept delivers immediately; Alice gets a receipt with a 24 h "Not them? Take it back"; the card shows a frosted sleeve]**
6. Take the original **[later]**
7. **Take every gratitude figure off the front,** including the counts in your sketch (🎁500, "You got 5k gratitude") **[yes; they move to the flip side]**
8. **Split the gratitude moment:** one tap sends; a second tap starts the combo; the front stops at the Calm tier; the drain bar, count, full escalation, stroke and shake live on the flip side **[yes]**. This changes the flow you described, where the drain bar starts on the first tap for everyone.
9. The door to the flip side: an air bubble under your name label, pushed to the edge and then peeled **[yes]**
10. Streaks hidden on the front. On the flip side a missed day drops one rung, never resets, and days turn over at 4:00 **[yes]**
11. "Inspired" = gratitude for your gifts; "magic" = gratitude sent with a hidden technique **[yes]**
12. Offering gratitude for a sticker works only between two flip-side users; everyone else can request or swap **[yes]**
13. **The escalation ladder** (`research/references.md`, from manga reaction symbols, 漫符): ありがと → 照れ → ドキドキ → オーバーヒート → 昇天.
    - **Settled with you (2026-09-23):** it's sexual through hints, with plausible deniability, and never explicit. It appears only on the flip side, when you mash or use hidden gestures, and the dial can go up for the presentation.
    - So the upper tiers keep the innuendo the research flagged: 「ハァハァ」, the nosebleed gag, steam, trembling. They build to a 昇天 ("ascension") climax that reads both ways.
    - The friend-first front stops at 照れ (blushing).
14. **Can a gift from a friend be passed on?** In kids' sticker trading it never is. Should gifted stickers be keepsakes that can't be regifted or offered? **[no: they stay transferable, and the Transfer Trail always shows who it came from]**
