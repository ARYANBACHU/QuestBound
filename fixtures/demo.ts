/**
 * DEMO FIXTURES — used when EXPO_PUBLIC_USE_MOCKS=1 so every branch can build UI with zero backend.
 * Owner: EV (add more if your screen needs them; keep ids stable).
 */
import type { BookRecap, Completion, Fellowship, FellowshipMember, Memory, Message, Mission, Page, Profile, Storyline } from '@/shared/types';

const now = new Date().toISOString();
export const ME = 'u-aria';

export const PROFILES: Profile[] = [
  { id: 'u-aria', display_name: 'Aria', crest: 'fox', color: 'rose', interests: ['coffee', 'live_music', 'hiking'], budget: '$', availability: ['weekends'], home_area: 'West Campus', onboarded: true, music_enabled: true, created_at: now },
  { id: 'u-bram', display_name: 'Bram', crest: 'dragon', color: 'lagoon', interests: ['board_games', 'coffee', 'pickup_sports'], budget: '$', availability: ['weekday_evenings', 'weekends'], home_area: 'Riverside', onboarded: true, music_enabled: true, created_at: now },
  { id: 'u-cleo', display_name: 'Cleo', crest: 'swan', color: 'marigold', interests: ['museums', 'photography', 'desserts'], budget: '$$', availability: ['weekends'], home_area: 'Hyde Park', onboarded: true, music_enabled: true, created_at: now },
  { id: 'u-dax', display_name: 'Dax', crest: 'wolf', color: 'fern', interests: ['hiking', 'food_trucks', 'live_music'], budget: 'free', availability: ['weekday_evenings'], home_area: 'North Campus', onboarded: true, music_enabled: true, created_at: now },
];

export const FELLOWSHIP: Fellowship = {
  id: 'f-lantern', name: 'The Lantern Fellowship', invite_code: 'LNTRN7', created_by: 'u-aria',
  lat: 30.2849, lng: -97.7341, area_label: 'Austin, TX', created_at: now,
};

export const MEMBERS: FellowshipMember[] = PROFILES.map((p, i) => ({
  fellowship_id: FELLOWSHIP.id, user_id: p.id, role: i === 0 ? 'founder' : 'member', joined_at: now, profile: p,
}));

export const STORYLINE: Storyline = {
  id: 's-1', fellowship_id: FELLOWSHIP.id, book_number: 1,
  title: 'The Lantern Thief of Austin',
  synopsis: 'Someone has stolen the lanterns that light the city of Austin. Four unlikely heroes must gather clues across cafés, trails and stages before the Long Night falls.',
  theme_tags: ['coffee', 'live_music', 'hiking'], status: 'active', recap: null, created_at: now,
};

export const PAGES: Page[] = [
  { id: 'p-1', storyline_id: 's-1', chapter_number: 1, title: 'The Gathering at the Gate', narrative: 'The castle gate creaks open. Before any quest can begin, the fellowship must prove they can find each other in a city of a million lanterns.', template_id: 'castle_gate', status: 'active', illustration_url: null, completed_at: null },
  { id: 'p-2', storyline_id: 's-1', chapter_number: 2, title: 'Whispers in the Wood', narrative: 'A trail of dimmed lanterns leads into the hills, where the trees remember everything.', template_id: 'enchanted_forest', status: 'locked', illustration_url: null, completed_at: null },
  { id: 'p-3', storyline_id: 's-1', chapter_number: 3, title: 'The Thief on the Peak', narrative: 'At the top of the world, the thief waits — and so does the last lantern.', template_id: 'dragon_peak', status: 'locked', illustration_url: null, completed_at: null },
];

const m = (o: Partial<Mission> & Pick<Mission, 'id' | 'region_id' | 'title' | 'type' | 'proof_type'>): Mission => ({
  page_id: 'p-1', storyline_id: 's-1', fellowship_id: FELLOWSHIP.id, description: '', story_hook: '',
  required_members: 1, assignee_ids: [], place: null, trial_question: null, verification_hint: '',
  points: 10, status: 'open', completed_by: [], completed_at: null, story_line: null, created_at: now, ...o,
});

export const MISSIONS: Mission[] = [
  m({ id: 'm-1', region_id: 'castle', title: 'Council at the Coffeehouse', type: 'gathering', proof_type: 'group_photo', required_members: 4, points: 40,
      description: 'Meet all together at Epoch Coffee and take one group photo with your drinks raised.',
      story_hook: 'Every great fellowship begins with a shared table and something warm to drink.',
      place: { title: 'Epoch Coffee', address: '221 W N Loop Blvd, Austin, TX', rating: 4.5, category: 'Coffee shop', source: 'google_maps' },
      verification_hint: 'Group photo, at least 3 people, coffee cups visible.' }),
  m({ id: 'm-2', region_id: 'drawbridge', title: 'Cross the Bridge Together', type: 'duet', proof_type: 'photo', required_members: 2, points: 20,
      description: 'Two of you walk the Lamar pedestrian bridge at sunset and take a photo mid-bridge.',
      story_hook: 'The drawbridge only lowers for those who cross it side by side.',
      place: { title: 'Lamar Pedestrian Bridge', address: 'Lamar Blvd, Austin, TX', source: 'google_maps' },
      status: 'complete', completed_by: ['u-bram', 'u-cleo'], completed_at: now,
      story_line: 'Sir Bram and Lady Cleo crossed the drawbridge as the sun sank, and the chains sang.' }),
  m({ id: 'm-3', region_id: 'banners', title: 'Sew the Fellowship Banner', type: 'gift', proof_type: 'confirm', required_members: 2, points: 20,
      description: 'Buy or make a small surprise for one fellow member. They confirm when they receive it.',
      story_hook: 'A banner is stitched from small kindnesses.', verification_hint: 'Recipient confirms.' }),
  m({ id: 'm-4', region_id: 'moon', title: 'Capture the Moon', type: 'relic', proof_type: 'photo', points: 10,
      description: 'Photograph the moon over the city tonight.', story_hook: 'The moon keeps the first lantern safe.',
      verification_hint: 'Photo shows the moon in the night sky.',
      status: 'complete', completed_by: ['u-aria'], completed_at: now, story_line: 'Aria the Fox caught the moon in a glass jar of pixels.' }),
  m({ id: 'm-5', region_id: 'tower_flag', title: 'The Riddle of the Tower', type: 'trial', proof_type: 'answer', points: 10,
      trial_question: 'I stand 307 feet over the Forty Acres and glow orange after victories. What am I?',
      description: 'Answer the riddle.', story_hook: 'The flag will not rise for a fool.' }),
  m({ id: 'm-6', region_id: 'moat', title: 'Verse of the Moat', type: 'bard', proof_type: 'text', points: 10,
      description: 'Write two lines of a poem about your fellowship. The best lines are written into the book.',
      story_hook: 'The moat only lets poets pass.' }),
  // Chapter 2 — Whispers in the Wood (locked until chapter 1 is fully colored)
  m({ id: 'm-7', page_id: 'p-2', status: 'locked', region_id: 'great_tree', title: 'Beneath the Great Tree', type: 'gathering', proof_type: 'group_photo', required_members: 4, points: 45,
      description: 'Gather everyone at Pease Park and take a group photo under the biggest tree you can find.',
      story_hook: 'The Great Tree remembers every friend who has stood beneath it.',
      place: { title: 'Pease District Park', address: '1100 Kingsbury St, Austin, TX', rating: 4.7, category: 'Park', source: 'google_maps' },
      verification_hint: 'Group photo outdoors with a tree.' }),
  m({ id: 'm-8', page_id: 'p-2', status: 'locked', region_id: 'mushroom_ring', title: 'The Mushroom Ring', type: 'duet', proof_type: 'photo', required_members: 2, points: 25,
      description: 'Two of you share a snack picnic on the grass and photograph your spread laid out in a circle.',
      story_hook: 'Sit inside the ring and the forest will share its secrets.', verification_hint: 'Snacks arranged in a circle.' }),
  m({ id: 'm-9', page_id: 'p-2', status: 'locked', region_id: 'river', title: 'The Riddle of the River', type: 'trial', proof_type: 'answer', required_members: 2, points: 25,
      trial_question: 'I run but never walk, I have a mouth but never talk, and a bed but never sleep. What am I?',
      description: 'Two of you solve the river spirit\'s riddle together.', story_hook: 'The river spirit lets only clever pairs cross.' }),
  m({ id: 'm-10', page_id: 'p-2', status: 'locked', region_id: 'fireflies', title: 'Catch a Firefly', type: 'relic', proof_type: 'photo', points: 15,
      description: 'Photograph a small glowing light: string lights, a lantern or a neon sign.', story_hook: 'Each firefly carries a spark of the stolen light.',
      verification_hint: 'A small glowing light.', assignee_ids: ['u-cleo'] }),
  m({ id: 'm-11', page_id: 'p-2', status: 'locked', region_id: 'owl', title: 'The Owl\'s Question', type: 'bard', proof_type: 'text', points: 15,
      description: 'Write the wisest thing someone in this fellowship has ever told you.', story_hook: 'The Wise Owl trades directions for wisdom.' }),
  m({ id: 'm-12', page_id: 'p-2', status: 'locked', region_id: 'path', title: 'The Winding Path', type: 'relic', proof_type: 'photo', points: 15,
      description: 'Photograph an interesting trail or staircase at the Barton Creek Greenbelt.', story_hook: 'The path rearranges itself for the curious.',
      place: { title: 'Barton Creek Greenbelt', address: 'Austin, TX', rating: 4.8, category: 'Hiking area', source: 'google_maps' },
      verification_hint: 'A path, trail or staircase.', assignee_ids: ['u-dax'] }),
  // Chapter 3 — The Thief on the Peak
  m({ id: 'm-13', page_id: 'p-3', status: 'locked', region_id: 'dragon', title: 'Face the Dragon', type: 'gathering', proof_type: 'group_photo', required_members: 4, points: 50,
      description: 'Everyone meets at Mount Bonnell at sunset and takes a group photo in your fiercest dragon pose.',
      story_hook: 'Dragons are only defeated by friends who show up together.',
      place: { title: 'Mount Bonnell', address: '3800 Mount Bonnell Rd, Austin, TX', rating: 4.7, category: 'Scenic overlook', source: 'google_maps' },
      verification_hint: 'Group photo, dramatic poses.' }),
  m({ id: 'm-14', page_id: 'p-3', status: 'locked', region_id: 'mountain', title: 'Climb the Mountain', type: 'duet', proof_type: 'photo', required_members: 2, points: 30,
      description: 'Two of you climb to the highest point you can reach nearby and photograph the view together.',
      story_hook: 'From the summit you can see where the thief has gone.', verification_hint: 'A view from up high.' }),
  m({ id: 'm-15', page_id: 'p-3', status: 'locked', region_id: 'treasure', title: 'Share the Hoard', type: 'gift', proof_type: 'confirm', required_members: 2, points: 30,
      description: 'Give another member a treasure: a sticker, a snack, a book to borrow. They confirm when they get it.',
      story_hook: 'A dragon hoards. A fellowship shares.', verification_hint: 'Recipient confirms.' }),
  m({ id: 'm-16', page_id: 'p-3', status: 'locked', region_id: 'clouds', title: 'The Storm\'s Riddle', type: 'trial', proof_type: 'answer', points: 20,
      trial_question: 'The more of me you take, the more you leave behind. What am I?',
      description: 'Answer the riddle thundered from the storm clouds.', story_hook: 'The clouds part only for the wise.' }),
  m({ id: 'm-17', page_id: 'p-3', status: 'locked', region_id: 'shield', title: 'The Knight\'s Shield', type: 'relic', proof_type: 'photo', points: 20,
      description: 'Photograph something round and brave-looking: a clock, a manhole cover, a round sign.', story_hook: 'Every knight needs a shield, even a borrowed one.',
      verification_hint: 'A round object.', assignee_ids: ['u-bram'] }),
  m({ id: 'm-18', page_id: 'p-3', status: 'locked', region_id: 'lantern', title: 'Light the Lantern', type: 'bard', proof_type: 'text', points: 20,
      description: 'Write one sentence about a moment this week when a friend made things brighter.', story_hook: 'The last lantern is lit with a true story.' }),
];

export const MESSAGES: Message[] = [
  { id: 'msg-1', fellowship_id: FELLOWSHIP.id, user_id: null, kind: 'proclamation', body: 'Hear ye! A new tale begins: "The Lantern Thief of Austin." Chapter I awaits.', payload: { event: 'storyline_ready', storyline_id: 's-1' }, created_at: now },
  { id: 'msg-2', fellowship_id: FELLOWSHIP.id, user_id: 'u-bram', kind: 'text', body: 'who is free for the bridge at 7?', payload: null, created_at: now },
  { id: 'msg-3', fellowship_id: FELLOWSHIP.id, user_id: 'u-cleo', kind: 'text', body: 'me!! bring snacks', payload: null, created_at: now },
  { id: 'msg-4', fellowship_id: FELLOWSHIP.id, user_id: null, kind: 'proclamation', body: 'Sir Bram and Lady Cleo crossed the drawbridge! The Drawbridge is colored blue.', payload: { event: 'mission_complete', mission_id: 'm-2', region_id: 'drawbridge', color: 'lagoon', user_id: 'u-bram' }, created_at: now },
  { id: 'msg-5', fellowship_id: FELLOWSHIP.id, user_id: null, kind: 'proclamation', body: 'Aria captured the moon! The Moon glows rose.', payload: { event: 'mission_complete', mission_id: 'm-4', region_id: 'moon', color: 'rose', user_id: 'u-aria' }, created_at: now },
];

// Public placeholder photos (picsum) so Storybook/montage have something to show in mock mode.
export const MEMORIES: Memory[] = [
  { id: 'mem-1', fellowship_id: FELLOWSHIP.id, storyline_id: 's-1', page_id: 'p-1', mission_id: 'm-2', user_id: 'u-bram',
    image_url: 'https://picsum.photos/seed/questbound-bridge/900/1200', caption: 'Sir Bram and Lady Cleo crossed the drawbridge as the sun sank, and the chains sang.',
    kind: 'photo', created_at: now },
  { id: 'mem-2', fellowship_id: FELLOWSHIP.id, storyline_id: 's-1', page_id: 'p-1', mission_id: 'm-4', user_id: 'u-aria',
    image_url: 'https://picsum.photos/seed/questbound-moon/900/1200', caption: 'Aria the Fox caught the moon in a glass jar of pixels.',
    kind: 'photo', created_at: now },
  { id: 'mem-3', fellowship_id: FELLOWSHIP.id, storyline_id: 's-1', page_id: 'p-1', mission_id: 'm-2', user_id: 'u-cleo',
    image_url: 'https://picsum.photos/seed/questbound-sunset/1200/900', caption: 'The river glowed gold beneath the bridge.',
    kind: 'photo', created_at: now },
];

/** One completion per completed fixture mission (lib/game.ts useCompletions). */
export const COMPLETIONS: Completion[] = [
  { id: 'c-1', mission_id: 'm-2', user_id: 'u-bram', participant_ids: ['u-bram', 'u-cleo'], proof_url: 'https://picsum.photos/seed/questbound-bridge/900/1200',
    proof_text: null, verdict: { pass: true, confidence: 0.92, reason: 'mock', flavor_text: 'The Magic Mirror gleams. Two heroes, one bridge, zero trolls.', lens_titles: ['Lamar pedestrian bridge at dusk'] },
    story_line: 'Sir Bram and Lady Cleo crossed the drawbridge as the sun sank, and the chains sang.', created_at: now },
  { id: 'c-2', mission_id: 'm-4', user_id: 'u-aria', participant_ids: ['u-aria'], proof_url: 'https://picsum.photos/seed/questbound-moon/900/1200',
    proof_text: null, verdict: { pass: true, confidence: 0.9, reason: 'mock', flavor_text: 'You caught the moon! Do not let it escape.', lens_titles: ['Full moon over the Austin skyline'] },
    story_line: 'Aria the Fox caught the moon in a glass jar of pixels.', created_at: now },
];

/** What a finished book's recap looks like (mock mode uses it when the last page is colored). */
export const MOCK_RECAP: BookRecap = {
  summary: 'And so the lanterns of Austin were lit again, one real adventure at a time. Four friends crossed bridges, solved riddles and shared a feast, and the city glowed brighter for it.',
  stats: { missions_completed: 18, photos: 9, places_visited: 6, members_active: 4 },
  highlights: [
    'Bram and Cleo crossed the drawbridge at sunset.',
    'Aria caught the moon in a glass jar of pixels.',
    'The whole fellowship raised their cups at Epoch Coffee.',
  ],
  per_member: [
    { user_id: 'u-aria', title: 'Aria the Bold, Keeper of the Moon', contribution: 'Colored the moon and led every gathering.' },
    { user_id: 'u-bram', title: 'Bram the Steadfast', contribution: 'Never missed a duet.' },
    { user_id: 'u-cleo', title: 'Cleo the Far-Seeing', contribution: 'Caught the best moments in the Magic Mirror.' },
    { user_id: 'u-dax', title: 'Dax of the Trails', contribution: 'Found the paths no one else could.' },
  ],
  next_book_hint: 'But far beyond the last page, a clockwork owl is stealing songs. Muse is already sharpening the quill.',
};

/** Shape of what generate-storyline logs (lib/game.ts useGenerationInfo). */
export const MOCK_GENERATION_INFO = {
  serp: { live: 3, cached: 1, stale: 0, failed: 0 },
  places_count: 14,
  themes: ['coffee', 'live_music', 'hiking'],
  adaptation: null as null | { note: string; loved_types: string[]; skipped_types: string[]; callbacks: string[] },
};
