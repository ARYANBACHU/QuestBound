=== ROUND 2 PLAN ===
NAMING (everyone, in your own files): the in-app wizard character is now "Sage". Under its name always show
"✦ powered by Muse" (Meta's model). Story narration/system copy that says "Muse" as a character → "Sage".
Keep "Muse" only for the AI credit line. Pop-ups/sheets/modals you own: fix jagged edges — the outer container
and every child that touches an edge share the same borderRadius with overflow:'hidden'. Use the new colorful
theme tokens in every screen you own (mood gradients/tints per chapter, colored chips) — more color, same ink style.

EV (feat/engine):
E1 Join race: a friend who joins before the founder summons the story must never crash. All lib/game.ts hooks are
   null-safe with no storyline; storyline creation is idempotent; status flows over realtime.
E2 Difficulty: generate-storyline and reroll-mission accept difficulty (easy = closer/cheaper/shorter tasks,
   hard = more ambitious/farther); points multiplier easy 0.75 / normal 1 / hard 1.5. replace_active: archive
   the current book (status complete, recap marked abandoned) and start a new one.
E3 GPS: places from google_events get lat/lng (geocode title+address via SerpApi google_maps at generation
   time). submit-proof: for missions whose place has coordinates, require lat/lng within GEO_RADIUS_M
   (secret, default 400 m, haversine, add accuracy_m slack up to 150 m); return distance_m; friendly
   flavor_text if too far or no location. DEMO_FORCE_PASS bypasses.
E4 Points audit: one source of truth. Export pure `pointsFor(userId, missions)` and `leaderboard(members,
   missions)` from lib/game.ts (each participant in completed_by earns mission.points; points = size base
   (large 40 / medium 20 / small 10) × difficulty multiplier, set server-side). Add a tiny test script proving
   totals add up. AB and MP must use these.
E5 Poems in the book: expose `useCompletions(storylineId)` (proof_text, participants, verdict) so AD can show
   full bard verses; bard story_line should quote the first line of the verse.
E6 UT demo mode: `demo: 'ut'` creates "The Legend of the Forty Acres" — 3–4 chapters of real UT Austin campus
   places (e.g. UT Tower/Main Building, Littlefield Fountain, Turtle Pond, Blanton Museum, Texas Union, PCL,
   Gregory Gym, DKR Stadium, Harry Ransom Center, LBJ Library, Speedway). VERIFY each coordinate via SerpApi
   google_maps and save them in fixtures/ut-campus.ts. Missions = discovery, photos, campus trivia riddles;
   GPS radius applies. Mock-mode equivalent too.
E7 usePages(storylineId) if still missing. Redeploy changed functions (token is in env).

AB (feat/shell):
A1 Music: "Shall the bards play?" step in onboarding + toggle in Settings (profile.music_enabled + AsyncStorage).
   expo-audio looping, low volume, pauses in background. Use a CC0/public-domain medieval/fantasy track in
   assets/audio/ and credit it in README. Small mute toggle reachable from the tab bar.
A2 Name step: Muse/Sage reaction only updates after 700 ms of no typing AND when the trimmed name actually
   changed meaningfully (or on blur) — no reaction per keystroke.
A3 Crayon step: big labeled swatches (color name), unmistakable selected state (thick ring, check, scale,
   Sage says the color), taken-by crests, and a mini region filling with the chosen color as preview.
A4 Onboarding layout: no dead space — scale content to fit the screen, place Sage's bubble next to the content,
   fill leftover space with tasteful themed graphics (stars, castle silhouette). Check iPhone SE + Pro Max.
A5 Join race: gate handles a fellowship with no storyline → "Waiting for <founder> to summon the story…" screen
   (realtime; anyone may summon). Every AB screen null-safe.
A6 Ask for different content: mission detail → "Ask Sage for a different mission" (easier / similar /
   harder → reroll). Missions header + Settings → "New storyline" with difficulty picker and a confirm dialog
   (current book goes to the Storybook).
A7 GPS: mission detail requests location for place missions, shows distance + "You're close!" indicator,
   sends lat/lng/accuracy on submit, friendly errors if permission denied.
A8 Points: use EV's pointsFor/leaderboard everywhere.
A9 Wizard sheet: rename to Sage + "✦ powered by Muse". Three states: minimized pill, half, full screen
   (drag handle + buttons). Keep chat history per fellowship in memory + AsyncStorage — reopening must NOT
   regenerate the greeting or suggestions; only call the API when the user sends. Sheet sits flush on the
   keyboard (no gap); tap outside dismisses keyboard.
A10 FAB never blocks content: auto-hide on Storybook reader/montage and while the keyboard is open; draggable,
   snaps to the nearest corner.
A11 UT demo: Demo Tools → "Start UT campus demo" (generateStoryline demo:'ut').

AD (feat/coloring):
D1 More colorful pages: chapter mood backgrounds/gradients, colored storybook frame, keep ink outlines.
D2 Make the expandable story text obvious: fade-out gradient + "Read more ▾" chip; "Show less ▴" when open.
D3 Montage like Snapchat stories: segmented progress bars at top, auto-advance, HOLD = pause, tap right = next,
   tap left = previous, swipe down = close.
D4 Bard poems: show the full verse in the book as an illuminated quote card with the author's crest
   (EV's useCompletions).
D5 Switch to usePages; remove redundant local workarounds.

MP (feat/friends):
M1 Chat keyboard: composer always visible above the keyboard (correct KeyboardAvoidingView offset incl. tab
   bar), list scrolls to newest, keyboardDismissMode="interactive" + tap list to dismiss + a ⌄ hide-keyboard
   button.
M2 Wizard messages in chat show "Sage" + "✦ powered by Muse".
M3 Use EV's pointsFor/leaderboard for member points; reactions on the real table (realtime), remove the
   local-only fallback; subscribe to profiles/fellowships realtime.
M4 Joining before a storyline exists never crashes; Friends tab works with no storyline.

DISTRIBUTION (merge agent, after round 2 merge): see the separate distribution prompt.
=== END PLAN ===

=== UI UPGRADE ===
Goal: ramp the UI from "clean prototype" to "this looks like a shipped game" while keeping quality and
consistency. Study the patterns (not assets) of: Duolingo (mascot everywhere, celebratory moments, bold
chunky buttons with press-depth), Finch and Pokémon GO (a character you bond with, map/place energy), Monument
Valley / Alto (cohesive painterly palettes), and storybook-fantasy films like Shrek and Disney/Pixar fairy
tales for VIBE ONLY — whimsical, cheeky humor, lush storybook swamps/castles/forests. Do NOT use or draw any
existing characters, names, logos or artwork. Everything must be original.

Visual system (merge agent adds tokens to shared/theme.ts now):
- Richer palette: deep enchanted greens, swamp teals, royal purples, warm gold, lantern orange, on top of the
  coloring-book ink style; chapter-mood gradients for screen backgrounds.
- Chunky "game" buttons: rounded 16+, 3–4 px darker bottom edge that compresses on press, bold Nunito.
- Cards as parchment/storybook panels: soft paper texture, ink border, slight drop shadow, consistent radius
  (and overflow hidden — no jagged corners).
- Decorative layer: original SVG flourishes (stars, fireflies, vines, castle/forest silhouettes) to fill empty
  space — subtle, never behind text.
- Celebrations: confetti of crayon shavings + gold sparkles on mission complete/page turn/book complete.

SAGE (the wizard) must be far more visible — our mascot:
- AB creates components/wizard/Sage.tsx: an ORIGINAL wizard character drawn in react-native-svg (round,
  friendly, big hat with stars, beard, staff with a glowing tip), in our ink + crayon style, with expressions
  via prop: idle | happy | thinking | surprised | proud | sleepy, and sizes sm/md/lg. Subtle idle animation
  (blink, hat-star twinkle, gentle bob) — respects reduced motion.
- Sage appears: onboarding every step (lg, beside the speech bubble), all empty states, loading/ritual
  screens ("thinking"), mission pass ("proud") / fail ("surprised"), page turn and book complete
  ("happy" + celebration), wizard FAB (sm face), wizard sheet header, chat messages from Sage, coach marks.
  Always with "✦ powered by Muse" on the sheet header.
- Others (AD, MP, EV fixtures) import Sage from components/wizard/Sage.tsx; until it exists, a placeholder
  with the same props.

Quality bar: one consistent radius/shadow/spacing scale, AA contrast, motion only in response to events
(except Sage's subtle idle), test on iPhone SE + Pro Max, no layout jank, 60fps animations.

Per owner: AB = Sage component + all shell/onboarding/missions/settings/wizard; AD = coloring/storybook
backgrounds, frame, celebrations; MP = chat bubbles/cards/header in the new style, Sage in chat; EV = make
proclamation/flavor text slightly more cheeky and whimsical (still kind) and rename the narrator to Sage.
=== END ===

=== THEME TOKENS ON MAIN (shared/theme.ts, all additive — existing names unchanged) ===
Color moods: MOODS[castle|forest|dragon|feast] { gradient, tint, tintStrong, deep, onDeep }, moodFor(templateId),
  MOOD_FOR_TEMPLATE, SCREEN_GRADIENTS[mood] (3-stop screen background).
Controls: accent.*, chips[tone] { bg, fg, border }, DIFFICULTY_TONE, ON_CRAYON[color] (AA label on a crayon).
Game look: realm.* palette, ui { buttonRadius 18, cardRadius, buttonDepth 4 → buttonDepthPressed 1, borderWidth,
  buttonHeight, pressScale }, gameButton[tone] { face, edge, label }, panel { parchment, border, radius },
  shadow.sm|md|lg, decor.*, celebration { confetti, sparkle, counts, durationMs }, motion.*.
Overlays: scrim.soft|base|strong|heavy|black|paperFade|paper|glareClear|glare — no hard-coded rgba().
Sage: SageExpression, SAGE_EXPRESSIONS, SageSize, SAGE_SIZES (sm 44 / md 88 / lg 160), sageColors, SAGE_CREDIT.
Placeholder until AB lands Sage.tsx: `({ expression, size }: { expression?: SageExpression; size?: SageSize })`.
Types: Difficulty, RerollMissionRequest, GPS fields on SubmitProofRequest + Verdict.distance_m,
  Profile.music_enabled, Storyline.difficulty?. EV: mirror the new fields in supabase/functions/_shared/types.ts.
DB: 0003_round2.sql is already applied to the live project.
=== END TOKENS ===

=== UI REVAMP (overrides UI UPGRADE where they conflict) ===
This round is primarily a UI revamp: fewer, better things; every screen should feel like a polished storybook game.

SIMPLIFY (everyone, own screens): the UI currently feels busy. One focal point per screen. Max one decorative
layer, low opacity, never competing with content. Max one animation playing at a time, except Sage's subtle idle.
Fewer chips/badges/lines of text; group secondary actions behind a "…" menu. Fill empty space with useful content
(e.g. the next mission, a friend's progress) before decoration. Same quality bar.

MAPS LINKS (everyone who shows a place: AD mission sheet, AB mission detail + mission cards, MP proclamations):
Some place links currently open a business website instead of maps. Every "Open in Maps"/place tap MUST call
`openInMaps(place)` from lib/maps.ts, which always opens Apple Maps on iOS and Google Maps elsewhere. If
`place.website` exists, show it as a separate small "Website" link, never as the maps action.
EV: in serp.ts, put the business website into `place.website` (not `link`), always fill lat/lng when SerpApi returns
gps_coordinates, and set `maps_url`. Events: geocode so they get lat/lng too.

AD (feat/coloring):
P1 Book feel: a real page-flip animation when turning chapters (page curls/rotates from the right edge with a
   shadow, 900–1100 ms, heavy haptic). Use the same flip when browsing chapters with arrows/swipe in the Coloring
   tab and in the Storybook reader. Opening a book from the shelf = the cover swings open.
P2 Coloring quality + responsiveness: when a mission completes, the user SEES it being colored. An animated
   crayon scribble stroke sweeps across the region (stroke-dashoffset style), then settles into the textured
   fill, ~1.2 s, with a soft crayon sound (playSfx('crayon'), respects the sound setting) and haptic. Crisper
   art, smoother textures, clean region edges.
P3 100% coloring: a fully completed page must have NO white areas. Background/sky/ground areas outside the 6
   regions progressively tint with the chapter mood as regions complete (e.g. wash opacity = completed/6) and
   reach a full painted wash at 6/6. Fix any art gaps so regions + background cover the whole frame.
P4 Past chapters: completed chapters stay fully viewable (art + every mission + story lines), read-only.
P5 Revamp the Coloring + Storybook screens to the SIMPLIFY rules: the page is the hero; header = chapter title
   + one line + progress; everything else secondary.

AB (feat/shell):
P6 Sage speaking: whenever Sage says something new (speech bubble, wizard reply, coach mark), Sage does a small
   "talk" animation (mouth/bob ~600 ms) and plays a soft, short ping (≤150 ms, low volume, like a gentle chime),
   once per NEW message only, never on re-render or reopen. Add a Settings toggle "Sound effects" (separate from
   Music, AsyncStorage), default on. Export a tiny `playSfx('ping' | 'crayon' | 'page' | 'seal')` helper from
   components/shell/sfx.ts (expo-audio, preloaded, fails silently) for everyone to use. Use CC0 sounds in
   assets/audio/sfx/ and credit them in README. Build this FIRST and push it so AD/MP can import it (until
   then they use a no-op stub with the same signature).
P7 Missions tab: a chapter selector (I · II · III…) to view any unlocked/completed chapter's missions read-only,
   defaulting to the active chapter.
P8 Revamp onboarding, Missions, mission detail, Settings and the wizard sheet to the SIMPLIFY rules: one clear
   primary action per screen, calmer layouts, Sage as the single character focal point where present.

MP (feat/friends):
P9 New Sage messages in chat use the same talk animation + ping (playSfx('ping')), once per new message.
P10 Revamp the Friends tab to the SIMPLIFY rules: chat is the hero; header = fellowship name + crests + Invite;
    proclamation cards cleaner (less ornament, same delight).

EV (feat/engine):
P11 Hooks must return missions for ALL chapters of the storyline (not only the active page), plus usePages, so
   AD/AB can show past chapters.
P12 Place data fixes per MAPS LINKS above; redeploy changed functions.
=== END ===

=== MERGE AGENT NOTES FOR UI REVAMP (on main now) ===
- shared/types.ts `Place` gained `maps_url?: string` and `website?: string` (additive).
- EV: the Deno mirror supabase/functions/_shared/types.ts `Place` already has both fields — fill them in serp.ts.
- lib/maps.ts (merge-agent owned): `mapsUrl(place)`, `openInMaps(place)` (→ Promise<boolean>), plus
  `appleMapsUrl` / `googleMapsUrl`. Accepts any Place (or { title, address?, lat?, lng? }); null-safe.
=== END NOTES ===
