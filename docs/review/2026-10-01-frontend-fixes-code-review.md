# Frontend fixes code review

2026-10-01. The code review of the fixes for [the frontend code review](2026-09-29-frontend-code-review.md), which the lanes in [the fix plan](../superpowers/plans/2026-09-29-frontend-review-fixes.md) made and merged to main. It looks for bugs the fixes introduced, and for cases a fix meant to cover but missed. Findings are added here as each reviewer reports.

## Scope

| Reviewer | Area                                                                                                                                                                                  | Commits                                                                                                                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1       | Tickets and payments: JPYC payment signing and kept digests, unadded purchases, the tickets provider, the API's purchase route; the ticket card shell; the drawing screen's spend key | e8d4c16f faee4912 c9e1bff2 162ed331 80c4a5fc; e3eb1dea eb482607; 224915c0's spend key changes                                                                                                                                                                                                        |
| R2       | Sealing and drawing: the locked retry phase, the drawing kept per person, the ink engine, the seal ceremony, dates in Tokyo's day                                                     | 224915c0 d7b06404 ed946d89; cc80b134 f2bd32b6; 39932965 40be7f6e 6e09c0ed; 99374f9f e6de165d 87476767 e0b292dc                                                                                                                                                                                       |
| R3       | Giving, receiving and Gratitude                                                                                                                                                       | b4604cc4 35dbf1a2; c9ad9db7 9c8410e7 a320b9ef; f9c9fb92 4274f47b c2a9d19f cc274d5a; 267c3976 16c02f44 1941761d 128cc97e 139b921c                                                                                                                                                                     |
| R4       | App shell, shared controls, sticker board, sticker tray, device storage and query cache, shared helpers                                                                               | c9cb450a 4f43c8bc e1cd7e40 db282201 9d3e41e2 e58a0e27 7ccdcb53 cf5c0fef; 5e9734a6 cedd346e f6700496 5ac915c5 efd5f362; 9e4da649 4474c573 2adf342e 6e141a9a cc30d487 77c3dc97 63982791 0e51c734 44cce135; 8b3ae5cc efae28f7; 4993e41f 5931c72f e522109c f872794c; 6b690fd5 ac575dba 27ea19f3 66580d31 |

Splitting trayEngine.ts (CLEAN-19), which runs alongside this review, is out of its scope.

## How

Each reviewer reads its commits whole and the code around each change on main: callers, callees and the tests the commit added. It asks what input, timing, platform or earlier state makes the change wrong, whether a new state has a way out, and whether a new test fails without its fix. Each finding is traced through the code, or run in a scratch test, before it's written down. A finding that needs a phone to confirm says how.

Severity is the review's: _high_ is lost data, money, a ticket, a gift or Gratitude, or the app unusable until a reload; _medium_ a wrong result or a stuck screen with a way out; _low_ cosmetic, or rare with little harm.

## Findings

In progress.
