# Finish sticker lighting

User authorization: finish the researched phone/tablet feedback in a worktree, merge, deploy, and remove completed work. Existing material identity and artwork colors stay authoritative.

## Decisions

- Keep one orientation reference during a visible session. A held inspection must not fade with elapsed time; returning restores the starting image. After backgrounding, wait for a fresh sensor reading before centering again. Bound the shared virtual eye smoothly in front of the screen at extreme turns; ordinary mirror geometry stays exact.
- Trial a 20 cm light centered above the screen. Derive phone/tablet placement from the actual shared eye, including the tablet's flat-view adjustment. Validate the phone, tablet portrait/landscape, and iPad LINE-sized presentation.
- Reduce direct reflected source radiance before its spatial profile, leaving physical crease illumination and print exposure intact. The proposed two paper whites at normal incidence is a comparison target, not a measured preference or a promise of legible art inside the light. Metal reflection and diffraction use the same displayed source.
- Generate and select room maps from the same device-class geometry; preserve generating parameters so a stale map fails verification. Revisit the size-dependent glare approximation.
- Implement conservative shadow skipping and support-local draping only with regression evidence. Keep the crease's shape continuous and monotone and its bake cost comparable.

## Tasks

- [ ] Motion: replace elapsed-time resets, cover long holds, returns, interrupted sensing, and extreme view geometry. Update browser fixtures that assumed a timer reset.
- [ ] Light: behavior tests for centered offscreen resting reflection, smaller footprint, and consistent generated geometry; choose placement from actual render comparisons. Generate both maps and verify exposure, source samples, shadows, ink readability, and foil.
- [ ] Creases: demonstrate the distant-support failure; validate the local algorithm against stair/corner cases before replacing global subdivision. Carry the bake's maximum slope through worker/surface ownership and skip shadow sampling only when provably zero.
- [ ] Performance: use an in-page driver to distinguish display cadence from material submission and copying. Preserve the diagnostic until the conclusion is reviewed.
- [ ] Acceptance: related unit tests, meaningful red edits, project checks, full sticker/crease/foil/shadow browser run in Chromium and WebKit with bounded concurrency, and independent whole-branch review.
- [ ] Visual review: populated board, detail and Shop; all foil styles; phone and tablet; resting, upright, flat and raking poses; tilt/hold/return and background/resume.
- [ ] Integrate representative commits into main, deploy the clean commit, compare public assets and health responses, and remove completed plans/specs/worktrees and experiment scripts. Preserve unrelated work.

## Review focus

- A page resuming before its first fresh sensor reading must retain its image.
- Missing alpha, heading-origin resets, screen rotation and controller replacement must retain their existing guarantees.
- Smaller light must not leave the old room map or an inconsistent foil source.
- Long holds must not erase contrast; extreme eye directions must stay finite.
- A distant intermediate support must not alter a local cliff, and approaching it must not create a jump or bump.

Physical LINE-device appearance and cadence cannot be established by browser emulation. Record that limitation explicitly rather than claiming device qualification.
