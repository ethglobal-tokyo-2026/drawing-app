# Kyoto Seika Manga Expression Practice Mode: what's left

Built, on main and deployed (server, app, docs and vocabulary). Left:

1. **Chat menus.** This is the coordinator's job and needs the owner's go-ahead, since it changes the live
   LINE account.
   - Run `deploy/line/create-returning-menu.sh` for the 24 Kyoto Seika Practice Mode menus, 12 per
     language; their images are already in `deploy/line/`.
   - Record their IDs in `deploy/line/menus.json`, commit and deploy.
   - Check that a person in the mode gets the ×10 menu and keeps it at midnight.
   - Until then, people in the mode get their language's plain menu, which midnight leaves in place.
2. **On a phone, with the performance recorder, a full 30-minute drawing:**
   - the kept session's size and the undo history;
   - the timelapse's gzipped size against the 2 MB cap;
   - how long its fills take to prepare.

Delete this file once both are done.
