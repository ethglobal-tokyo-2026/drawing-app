# Kyoto Seika Manga Expression Practice Mode: what's left

Built, on main and deployed (server, app, docs and vocabulary). Left:

1. **The deal's redesign.** ad0ll, 2026-10-08: the balloons' silhouette is ugly, and the deal's styling
   needs work.
   - ad0ll picks one of three balloon designs on the mockup page; then the deal (balloons, dice, task
     line, Begin) is restyled around the pick.
   - The English comes off the balloons. Decided; screen readers in English still hear it.
   - Done already: the corner print is each word alone, small and pale.
2. **Chat menus.** This is the coordinator's job and needs the owner's go-ahead, since it changes the live
   LINE account.
   - Run `deploy/line/create-returning-menu.sh` for the 24 Kyoto Seika Practice Mode menus, 12 per
     language; their images are already in `deploy/line/`.
   - Record their IDs in `deploy/line/menus.json`, commit and deploy.
   - Check that a person in the mode gets the ×10 menu and keeps it at midnight.
   - Until then, people in the mode get their language's plain menu, which midnight leaves in place.
3. **On a phone, with the performance recorder, a full 30-minute drawing:**
   - the kept session's size and the undo history;
   - the timelapse's gzipped size against the 2 MB cap;
   - how long its fills take to prepare.

Delete this file once all three are done.
