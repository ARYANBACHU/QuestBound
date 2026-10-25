/**
 * DESIGN TOKENS — SHARED (FROZEN). Look: a fairy-tale COLORING BOOK.
 * Bright paper, thick indigo-ink outlines, crayon colors as the only saturated color.
 * The one signature moment in the app: a region filling with a player's crayon color.
 */

export const ink = {
  ink: '#211A3B', // outlines, primary text
  inkSoft: '#4A4368', // secondary text
  muted: '#8A84A3', // hints, locked states
  paper: '#FCFBFF', // app background (cool white, NOT cream)
  page: '#FFFFFF', // the coloring page itself
  lavenderMist: '#EEEAFB', // sheets, chat background
  gold: '#C9A227', // royal seal, completion, rewards
  danger: '#C2413B',
} as const;

/** Each player picks one crayon. It colors every region they complete. */
export const CRAYONS = {
  rose: '#E8547A',
  marigold: '#F2B33D',
  fern: '#3FA66B',
  lagoon: '#2F8FD8',
  violet: '#8A5CD6',
  ember: '#E8743B',
  teal: '#1FA7A0',
  plum: '#A23E7A',
} as const;
export type CrayonColor = keyof typeof CRAYONS;
export const CRAYON_LIST = Object.keys(CRAYONS) as CrayonColor[];

/** Text color that passes WCAG AA (≥4.5:1) on each crayon fill — use for labels drawn ON a crayon swatch. */
export const ON_CRAYON: Record<CrayonColor, string> = {
  rose: ink.ink,
  marigold: ink.ink,
  fern: ink.ink,
  lagoon: ink.ink,
  violet: '#FFFFFF',
  ember: ink.ink,
  teal: ink.ink,
  plum: '#FFFFFF',
};

// ---------------------------------------------------------------------------------------------
// ROUND 2 — MORE COLOR, SAME COLORING-BOOK LOOK (additive; every token above is unchanged)
// Rules: outlines + body text stay ink.ink. Crayons still mean "a player did this".
// Mood colors are soft washes behind the ink (backgrounds, frames, headers). Accents are for UI
// controls (buttons, chips, toggles). Contrast notes are WCAG ratios, checked by the merge agent.
// ---------------------------------------------------------------------------------------------

export type MoodId = 'castle' | 'forest' | 'dragon' | 'feast';

export interface Mood {
  id: MoodId;
  label: string;
  /** Two-stop gradient for headers / page frames (LinearGradient colors). ink.ink ≥7.5:1, inkSoft ≥4.9:1 on both stops. */
  gradient: readonly [string, string];
  /** Soft screen background tint (ink.ink ≥14:1). */
  tint: string;
  /** Stronger tint for cards, chips, selected rows (ink.ink ≥12:1). */
  tintStrong: string;
  /** Deep mood color for titles, icons, borders, or a filled button (≥5.8:1 on tint; onDeep text ≥6.3:1). */
  deep: string;
  onDeep: string;
}

/** Chapter moods. castle: dusk lavender→rose · forest: mint→teal · dragon: ember→marigold · feast: gold→plum. */
export const MOODS: Record<MoodId, Mood> = {
  castle: {
    id: 'castle', label: 'Dusk at the castle',
    gradient: ['#CDBDF5', '#F6B8CC'], tint: '#F4EFFF', tintStrong: '#E7DDFC', deep: '#5A3E9E', onDeep: '#FFFFFF',
  },
  forest: {
    id: 'forest', label: 'Deep in the forest',
    gradient: ['#BDEDD6', '#86D4CB'], tint: '#EAF8F2', tintStrong: '#D2F0E6', deep: '#0E6B63', onDeep: '#FFFFFF',
  },
  dragon: {
    id: 'dragon', label: "Dragon's fire",
    gradient: ['#F8AE88', '#F9D47E'], tint: '#FFF3EA', tintStrong: '#FDE2CF', deep: '#A33F18', onDeep: '#FFFFFF',
  },
  feast: {
    id: 'feast', label: 'The royal feast',
    gradient: ['#F3D57E', '#D8B4D4'], tint: '#FCF2F8', tintStrong: '#F4DDEC', deep: '#7A2D5E', onDeep: '#FFFFFF',
  },
};
export const MOOD_LIST = Object.keys(MOODS) as MoodId[];

/** Which mood each coloring-page template uses (keys = TemplateId in shared/templates.ts). */
export const MOOD_FOR_TEMPLATE = {
  castle_gate: 'castle',
  enchanted_forest: 'forest',
  dragon_peak: 'dragon',
  royal_feast: 'feast',
} as const satisfies Record<string, MoodId>;

/** Mood for a template id (falls back to castle for unknown ids). */
export function moodFor(templateId: string | null | undefined): Mood {
  const id = (MOOD_FOR_TEMPLATE as Record<string, MoodId>)[templateId ?? ''];
  return MOODS[id ?? 'castle'];
}

/**
 * UI accents for buttons, chips, toggles, links. `x` = filled background (text = onX, ≥5.1:1),
 * `xSoft` = chip/pill background (x as text on it ≥4.9:1; ink.ink ≥13:1).
 */
export const accent = {
  primary: '#5B3FD1', // royal violet — main buttons
  primaryPressed: '#4630B0',
  primarySoft: '#ECE7FF',
  onPrimary: '#FFFFFF',
  secondary: '#0D736B', // enchanted teal — secondary actions, "You're close!"
  secondarySoft: '#DDF4EF',
  onSecondary: '#FFFFFF',
  warm: '#A8431A', // ember — attention, "harder", streaks
  warmSoft: '#FFE9DC',
  onWarm: '#FFFFFF',
  rose: '#B8325A', // hearts, reactions, friends
  roseSoft: '#FDE4EB',
  onRose: '#FFFFFF',
  gold: '#7A5C0B', // text-safe gold (ink.gold itself is for seals/fills, not small text)
  goldSoft: '#FBF1D0',
  onGold: '#FFFFFF',
} as const;

/** Chip presets: { bg, fg, border } — fg on bg is AA. */
export const chips = {
  neutral: { bg: ink.lavenderMist, fg: ink.ink, border: ink.ink },
  primary: { bg: accent.primarySoft, fg: accent.primary, border: accent.primary },
  secondary: { bg: accent.secondarySoft, fg: accent.secondary, border: accent.secondary },
  warm: { bg: accent.warmSoft, fg: accent.warm, border: accent.warm },
  rose: { bg: accent.roseSoft, fg: accent.rose, border: accent.rose },
  gold: { bg: accent.goldSoft, fg: accent.gold, border: accent.gold },
} as const;
export type ChipTone = keyof typeof chips;

/** Difficulty chip tones (easy / normal / hard). */
export const DIFFICULTY_TONE = { easy: 'secondary', normal: 'primary', hard: 'warm' } as const satisfies Record<string, ChipTone>;

/** Backdrops and overlays. Use instead of hard-coded rgba(). Ink-tinted so they read as "the book dims". */
export const scrim = {
  soft: 'rgba(33,26,59,0.35)', // sheets (wizard)
  base: 'rgba(33,26,59,0.4)', // modals, confirm dialogs
  strong: 'rgba(33,26,59,0.45)', // tool panels, pickers
  heavy: 'rgba(33,26,59,0.7)', // full-screen viewers (montage, photo)
  black: 'rgba(0,0,0,0.85)', // camera / story playback
  paperFade: 'rgba(252,251,255,0)', // transparent paper — start of "Read more" fade
  paper: 'rgba(252,251,255,1)', // end of "Read more" fade (matches ink.paper)
  glareClear: 'rgba(255,255,255,0)', // Magic Mirror shimmer
  glare: 'rgba(255,255,255,0.75)',
} as const;

/** Crests are each player's avatar. Emoji now; swap for art later without changing ids. */
export const CRESTS = {
  dragon: { emoji: '🐉', title: 'Dragon' },
  unicorn: { emoji: '🦄', title: 'Unicorn' },
  owl: { emoji: '🦉', title: 'Owl' },
  fox: { emoji: '🦊', title: 'Fox' },
  stag: { emoji: '🦌', title: 'Stag' },
  wolf: { emoji: '🐺', title: 'Wolf' },
  swan: { emoji: '🦢', title: 'Swan' },
  frog: { emoji: '🐸', title: 'Frog Prince' },
} as const;
export type CrestId = keyof typeof CRESTS;
export const CREST_LIST = Object.keys(CRESTS) as CrestId[];

/** Interest options shown in onboarding; the engine uses the ids to search SerpApi. */
export const INTERESTS: { id: string; label: string; group: string }[] = [
  { id: 'coffee', label: 'Coffee & cafés', group: 'Feasts' },
  { id: 'food_trucks', label: 'Food trucks', group: 'Feasts' },
  { id: 'brunch', label: 'Brunch', group: 'Feasts' },
  { id: 'desserts', label: 'Desserts', group: 'Feasts' },
  { id: 'cooking', label: 'Cooking together', group: 'Feasts' },
  { id: 'live_music', label: 'Live music', group: 'Music & stage' },
  { id: 'karaoke', label: 'Karaoke', group: 'Music & stage' },
  { id: 'comedy', label: 'Comedy shows', group: 'Music & stage' },
  { id: 'hiking', label: 'Hiking', group: 'Outdoors' },
  { id: 'swimming', label: 'Swimming', group: 'Outdoors' },
  { id: 'parks', label: 'Parks & picnics', group: 'Outdoors' },
  { id: 'sunsets', label: 'Sunset spots', group: 'Outdoors' },
  { id: 'board_games', label: 'Board games', group: 'Games' },
  { id: 'video_games', label: 'Video games', group: 'Games' },
  { id: 'arcades', label: 'Arcades', group: 'Games' },
  { id: 'escape_rooms', label: 'Escape rooms', group: 'Games' },
  { id: 'museums', label: 'Museums', group: 'Arts & culture' },
  { id: 'art', label: 'Making art', group: 'Arts & culture' },
  { id: 'bookstores', label: 'Bookstores', group: 'Arts & culture' },
  { id: 'thrifting', label: 'Thrifting', group: 'Arts & culture' },
  { id: 'pickup_sports', label: 'Pickup sports', group: 'Active' },
  { id: 'gym', label: 'Working out', group: 'Active' },
  { id: 'climbing', label: 'Climbing', group: 'Active' },
  { id: 'study_spots', label: 'Study spots', group: 'Chill' },
  { id: 'photography', label: 'Photography', group: 'Chill' },
  { id: 'volunteering', label: 'Volunteering', group: 'Chill' },
];

export const fonts = {
  display: 'Fraunces_700Bold', // chapter titles, book titles, big moments
  displayItalic: 'Fraunces_400Regular_Italic', // story lines / narration
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
} as const;

export const type = {
  hero: 34,
  title: 26,
  heading: 20,
  body: 16,
  small: 13,
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

/** Ink line weight for coloring pages, in SVG viewBox units (viewBox is 1000 x 1400). */
export const INK_STROKE = 9;

/** Fallback coordinates: UT Austin (HackTX venue) */
export const DEFAULT_LOCATION = { lat: 30.2849, lng: -97.7341, label: 'Austin, TX' } as const;

// ---------------------------------------------------------------------------------------------
// ROUND 2 — UI UPGRADE: "a shipped storybook game". Additive. See handoffs/notes/ROUND-2-PLAN.md.
// ---------------------------------------------------------------------------------------------

/** Richer realm palette for chrome (headers, frames, silhouettes, icons). Text pairings noted per line. */
export const realm = {
  enchantedGreen: '#1F6B45', // white text 6.5:1
  swampTeal: '#11655F', // white text 6.9:1
  royalPurple: '#4B2E9A', // white text 9.7:1
  warmGold: '#E0A82E', // ink text 7.7:1 (never white text)
  lanternOrange: '#E8792B', // ink text 5.7:1 (never white text)
  nightIndigo: '#1C1840', // night-sky panels; white text 16.8:1
  mossLight: '#DCEFD9', // light washes below: ink text ≥12.7:1
  swampMist: '#D6EEEA',
  royalMist: '#E6DEFA',
  goldMist: '#FBEFCB',
  lanternMist: '#FFE6D2',
} as const;

/** Full-screen background gradients per chapter mood (top → bottom). Light enough for ink text (≥12:1). */
export const SCREEN_GRADIENTS: Record<MoodId, readonly [string, string, string]> = {
  castle: ['#F4EFFF', '#FBEFF5', ink.paper],
  forest: ['#E4F5EC', '#EAF8F2', ink.paper],
  dragon: ['#FFF0E3', '#FFF6E6', ink.paper],
  feast: ['#FDF4DA', '#FCF2F8', ink.paper],
};

/** One radius / shadow / spacing scale for the game look (radius/space above still apply). */
export const ui = {
  buttonRadius: 18,
  cardRadius: radius.lg, // 22 — cards, sheets, modals (outer + edge-touching children share it, overflow hidden)
  chipRadius: radius.pill,
  buttonDepth: 4, // px of darker bottom edge at rest
  buttonDepthPressed: 1, // compresses on press (translateY by buttonDepth - buttonDepthPressed)
  buttonHeight: 54,
  buttonHeightSm: 42,
  borderWidth: 2.5, // ink border on cards/buttons
  pressScale: 0.98,
} as const;

/** Chunky game buttons: face color, darker bottom edge, label color (label on face is AA). */
export const gameButton = {
  primary: { face: accent.primary, edge: '#3B2894', label: '#FFFFFF' },
  forest: { face: '#1F7A4D', edge: '#13502F', label: '#FFFFFF' },
  swamp: { face: '#11726A', edge: '#0A4842', label: '#FFFFFF' },
  gold: { face: CRAYONS.marigold, edge: '#B07A12', label: ink.ink },
  lantern: { face: realm.lanternOrange, edge: '#A84E12', label: ink.ink },
  danger: { face: ink.danger, edge: '#86231F', label: '#FFFFFF' },
  ghost: { face: ink.page, edge: ink.ink, label: ink.ink },
} as const;
export type GameButtonTone = keyof typeof gameButton;

/** Parchment / storybook panels. */
export const panel = {
  parchment: '#FFF9EC', // warm paper (ink 15.7:1, inkSoft 8.7:1)
  parchmentEdge: '#EADFC4', // inner rule / texture lines
  page: ink.page,
  border: ink.ink,
  borderWidth: ui.borderWidth,
  radius: ui.cardRadius,
} as const;

/** Shadow scale (iOS shadow* + Android elevation). Spread into a style: { ...shadow.md }. */
export const shadow = {
  none: { shadowColor: ink.ink, shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  sm: { shadowColor: ink.ink, shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: ink.ink, shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  lg: { shadowColor: ink.ink, shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
} as const;

/** Decorative SVG layer (stars, fireflies, vines, silhouettes). Subtle; never behind text. */
export const decor = {
  star: '#E0A82E',
  firefly: '#F6D365',
  vine: '#2E7D57',
  silhouette: '#2A2350',
  opacity: 0.18, // silhouettes / vines
  sparkleOpacity: 0.6, // stars / fireflies
} as const;

/** Celebrations: crayon-shaving confetti + gold sparkles (mission complete, page turn, book complete). */
export const celebration = {
  confetti: Object.values(CRAYONS) as string[],
  sparkle: ['#C9A227', '#E0A82E', '#F6D365', '#FFF4C2'] as string[],
  counts: { mission: 36, page: 70, book: 120 },
  durationMs: { mission: 1400, page: 2000, book: 2800 },
} as const;

/** Motion timings. Respond to events; only Sage's idle loops (and it stops under reduced motion). */
export const motion = {
  press: 90,
  fill: 650,
  pageTurn: 900,
  sealStamp: 450,
  sheet: 280,
  sageBlinkEveryMs: 4200,
  sageBobMs: 2600,
} as const;

/** SAGE — our original wizard mascot (components/wizard/Sage.tsx, owner AB). Shared so placeholders match. */
export type SageExpression = 'idle' | 'happy' | 'thinking' | 'surprised' | 'proud' | 'sleepy';
export const SAGE_EXPRESSIONS: SageExpression[] = ['idle', 'happy', 'thinking', 'surprised', 'proud', 'sleepy'];
export type SageSize = 'sm' | 'md' | 'lg';
export const SAGE_SIZES: Record<SageSize, number> = { sm: 44, md: 88, lg: 160 };
/** Sage's colors: robe/hat royal purple, starry gold trim, cloud-white beard, glowing staff tip. */
export const sageColors = {
  robe: '#5B3FD1',
  robeShade: '#3B2894',
  hat: '#4B2E9A',
  hatStar: '#F6D365',
  trim: '#E0A82E',
  beard: '#FFFFFF',
  beardShade: '#E6E1F5',
  skin: '#FFD9B8',
  cheek: '#F6A5B8',
  staff: '#8A5A2B',
  staffGlow: '#FFF4C2',
  outline: ink.ink,
} as const;
/** Credit line shown under Sage's name everywhere it speaks. */
export const SAGE_CREDIT = '✦ powered by Muse';
