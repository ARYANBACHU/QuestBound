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
