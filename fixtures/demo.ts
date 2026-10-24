/**
 * DEMO FIXTURES — used when EXPO_PUBLIC_USE_MOCKS=1 so every branch can build UI with zero backend.
 * Owner: EV (add more if your screen needs them; keep ids stable).
 */
import type { Fellowship, FellowshipMember, Memory, Message, Mission, Page, Profile, Storyline } from '@/shared/types';

const now = new Date().toISOString();
export const ME = 'u-aria';

export const PROFILES: Profile[] = [
  { id: 'u-aria', display_name: 'Aria', crest: 'fox', color: 'rose', interests: ['coffee', 'live_music', 'hiking'], budget: '$', availability: ['weekends'], home_area: 'West Campus', onboarded: true, created_at: now },
  { id: 'u-bram', display_name: 'Bram', crest: 'dragon', color: 'lagoon', interests: ['board_games', 'coffee', 'pickup_sports'], budget: '$', availability: ['weekday_evenings', 'weekends'], home_area: 'Riverside', onboarded: true, created_at: now },
  { id: 'u-cleo', display_name: 'Cleo', crest: 'swan', color: 'marigold', interests: ['museums', 'photography', 'desserts'], budget: '$$', availability: ['weekends'], home_area: 'Hyde Park', onboarded: true, created_at: now },
  { id: 'u-dax', display_name: 'Dax', crest: 'wolf', color: 'fern', interests: ['hiking', 'food_trucks', 'live_music'], budget: 'free', availability: ['weekday_evenings'], home_area: 'North Campus', onboarded: true, created_at: now },
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
];

export const MESSAGES: Message[] = [
  { id: 'msg-1', fellowship_id: FELLOWSHIP.id, user_id: null, kind: 'proclamation', body: 'Hear ye! A new tale begins: "The Lantern Thief of Austin." Chapter I awaits.', payload: { event: 'storyline_ready', storyline_id: 's-1' }, created_at: now },
  { id: 'msg-2', fellowship_id: FELLOWSHIP.id, user_id: 'u-bram', kind: 'text', body: 'who is free for the bridge at 7?', payload: null, created_at: now },
  { id: 'msg-3', fellowship_id: FELLOWSHIP.id, user_id: 'u-cleo', kind: 'text', body: 'me!! bring snacks', payload: null, created_at: now },
  { id: 'msg-4', fellowship_id: FELLOWSHIP.id, user_id: null, kind: 'proclamation', body: 'Sir Bram and Lady Cleo crossed the drawbridge! The Drawbridge is colored blue.', payload: { event: 'mission_complete', mission_id: 'm-2', region_id: 'drawbridge', color: 'lagoon', user_id: 'u-bram' }, created_at: now },
  { id: 'msg-5', fellowship_id: FELLOWSHIP.id, user_id: null, kind: 'proclamation', body: 'Aria captured the moon! The Moon glows rose.', payload: { event: 'mission_complete', mission_id: 'm-4', region_id: 'moon', color: 'rose', user_id: 'u-aria' }, created_at: now },
];

export const MEMORIES: Memory[] = [];
