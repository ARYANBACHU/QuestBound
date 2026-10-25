=== ROUND 3 PLAN (bugs first, then polish) ===
PRIORITY BUGS
B1 (AB + EV) Writing a new book crashes Expo Go. Reproduce in mock AND real mode (New storyline with each
   difficulty, from Missions … menu and Settings). Fix root cause. AB also adds a global error boundary that
   shows a friendly Sage "Something went awry — tap to recover" screen instead of crashing.
B2 (EV + AD) Book status is wrong: Book 1 shows "complete" when only chapter 1 is done; Book 2 shows complete
   without any play. EV: audit storyline status transitions (complete ONLY when every page complete; replaced
   books = status complete + recap.abandoned → must be distinguishable). AD: shelf labels derive from pages
   (e.g. "Chapter 2 of 3", "Finished", "Set aside").
B3 (AD) Montage plays too fast / buggy. One timer, 5 s per slide (3 s for title cards), progress bars exactly in
   sync, hold-to-pause and tap-to-skip reliable, no double timers on re-render.
B4 (AB, MP — everyone with inputs) Keyboard still buggy in places. AB creates ONE shared
   components/shell/KeyboardSafe.tsx (reanimated useAnimatedKeyboard / KeyboardAvoidingView, works in Expo Go)
   and everyone uses it on every screen with a text input (chat, wizard sheet, onboarding name, mission detail
   text/answer, settings). Test each: input always visible, tap outside dismisses.
B5 (AB) Wizard FAB disappears sometimes / weird during pop-ups. Make it reliable: fixed home position bottom-right
   above the tab bar, draggable but clamped on-screen, position persisted; hidden ONLY while a modal/sheet is
   open and ALWAYS restored when it closes. Never lost off-screen.
B6 (AD) Flipping BACK has no sound; flipping forward does. Both directions play playSfx('page') (or a distinct
   'pageBack').

GAMEPLAY
G1 (EV) More group play: per page at most 2 solo missions. Rules: large = whole fellowship; medium = duet or
   TRIO (required_members 3 when fellowship ≥3); small = solo or duet (≥1 of 3 smalls is a duet). Points by
   required members (solo 10, duet 20, trio 30, fellowship 40) × difficulty. Update prompts, validation, fallback
   book, UT demo, mock engine, points test.
G2 (EV) Template variety: pick chapter templates from all 20 by mood fit, no repeats within a book, avoid repeats
   from the fellowship's previous book.
G3 (EV) Storybook art: every chapter gets a Muse Image painting. Add an on-demand `paint-chapter` function (and
   lib/api.ts paintChapter(pageId)) that generates/backs-fills illustration_url for any completed page missing
   one; prompt style: lush, vibrant, classic best-selling fairy-tale picture-book art, storybook painting, warm
   light, no text. Deploy.

UI / FEEL
U1 (AD) Coloring animation is the #1 feature: make it spectacular but clean — crayon scribble sweep → textured fill
   → gentle shimmer → sparkles; plus the background mood wash. Smooth 60fps on device.
U2 (AD; MP draws 8) Art: redraw the 4 existing pages and draw the 16 new ones in a vibrant, classic fairy-tale
   picture-book style (bold shapes, rich colors when filled, charming details), coloring-book ink outlines.
   AD draws castle_gate, enchanted_forest, dragon_peak, royal_feast + mermaid_lagoon, witch_cottage,
   beanstalk_sky, fairy_glen, ice_palace, pirate_cove, candy_village, starlit_tower in assets/pages/.
   MP draws troll_bridge, cloud_kingdom, crystal_cave, owl_library, rose_garden, lantern_festival, swamp_hollow,
   unicorn_meadow in assets/pages/set-mp/ using AD's PageArt format; AD's index.ts imports them (AD adds the
   imports; until MP's land, fall back to a simple placeholder frame per id). Region ids must match
   shared/templates.ts exactly.
U3 (AD) Storybook tab: rename "Illustration" → "Storybook" everywhere. Merge the duplicated views into ONE
   organized chapter view: the Muse painting as the hero image (call paintChapter if missing, with a "Sage is
   painting…" state), then the colored page thumbnail, then tale entries (photos, poems, story lines). New,
   more unique montage icon; smaller, more distinctive type for the montage button/labels.
U4 (AB) Mission complete reward: a satisfying "pack opening" moment (like a trading-card pack reveal): sealed
   card shakes → bursts open with light rays → card flips to reveal the region in your color + points counting
   up + story line, with layered haptics and sfx. ~2.5 s, skippable by tap. Then AD's coloring animation plays
   when you land on the page.
U5 (AB) Tutorial/coach marks: spotlight — dim + blur everything except the highlighted element and Sage's
   bubble; tap to continue. Calmer onboarding.
U6 (AB) Music toggle moves to the TOP of screens (header-right icon), not the bottom tab bar.
U7 (AB) Sound effects for every tap, unique per action and subtle: tap, toggle, open, close, send, success,
   error, reward, page, pageBack, crayon, seal, ping. Generated CC0. GameButton plays 'tap' by default; others
   pass the right one. Respect the Sound effects toggle. Never more than one sfx per action.
U8 (everyone) Background color per theme update: no plain white, no plaid; calm tinted color.
=== END ===
