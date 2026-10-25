=== V1 PLAN (final round — bugs first; production is https://questbound.expo.app) ===
P0
V1 (AB+EV) Crash: leaving the fellowship then "New storyline" crashes; new book still crashes in Expo Go.
   Guard: no active fellowship → route to create/join, never write a book. One full-screen NON-modal "Sage is
   writing your book…" overlay: blocks double taps, progress text, 45 s timeout with Retry, never stacked on
   another pop-up; close all sheets/blur and wait for their close animation before starting. EV: server
   rejects missing/foreign fellowship with a friendly error, never 500.
V2 (EV+AB) UT Campus Demo "The Legend of the Forty Acres", geo_enforced=false (shows distance, never blocks).
   Chapter I "The Forty Acres Awaken" on castle_gate:
   - castle (large, Fellowship): "The Great Tournament" — win any video game together; photo of the victory
     screen with the whole fellowship cheering. No location.
   - drawbridge (medium, Trio): "Salute the Tower" — selfie with the UT Tower behind you. UT Tower.
   - banners (medium, Duet): "The Harvest Horns" — Hook 'em at the seasonal pumpkin display across from the
     University Co-op (Guadalupe St). University Co-op.
   - tower_flag (small, Duet): "The Royal Portraitist" — hand-sketch the Blanton Museum of Art, photograph the
     drawing with the museum behind it. Blanton.
   - moon, moat (small): reuse EV's verified UT missions (Turtle Pond riddle, Littlefield Fountain duet).
   Chapters II–IV: existing verified UT missions, max 1 solo per page. AB: Demo Tools "Start UT campus demo"
   uses it; mission detail shows distance but never blocks when geo_enforced=false.
P1
V3 (AB+AD) Reward pack: newly colored region flickers blank→color→blank→color before glowing. Render it once:
   start uncolored, single fill animation, then glow. No re-mount/double animation.
V4 (AD) The X on the colored-region sheet doesn't close it — fix.
V5 (AB+AD) Storybook: mute button covers the Montage button top-right — move mute so nothing overlaps.
V6 (EV) Far more group quests than solo: max 1 solo per page (prefer 0); rest duet/trio/fellowship.
P2
V7 (MP) Chat notification toast too bouncy: calm standard slide/fade, no bounce.
V8 (AD+AB) Montage switches to different music: keep the same music track (montage just lowers volume or
   keeps it); no second track.
V9 (AD) Storybook tab always opens on the main shelf, never remembers the last view.
=== END ===
