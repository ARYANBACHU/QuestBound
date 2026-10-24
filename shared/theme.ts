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
