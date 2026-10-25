// Owner: EV. Deno-side MIRROR of /shared/types.ts + /shared/templates.ts (Deno can't import the app's
// extensionless TS). Keep in sync by hand. If they ever disagree, /shared wins.
export type MissionType = 'gathering' | 'duet' | 'relic' | 'bard' | 'trial' | 'gift';
export type ProofType = 'photo' | 'group_photo' | 'text' | 'voice' | 'answer' | 'confirm';
export type RegionSize = 'small' | 'medium' | 'large';
export type TemplateId =
  'castle_gate' | 'enchanted_forest' | 'dragon_peak' | 'royal_feast' | 'mermaid_lagoon' |
  'witch_cottage' | 'beanstalk_sky' | 'fairy_glen' | 'ice_palace' | 'pirate_cove' | 'candy_village' |
  'starlit_tower' | 'troll_bridge' | 'cloud_kingdom' | 'crystal_cave' | 'owl_library' | 'rose_garden' |
  'lantern_festival' | 'swamp_hollow' | 'unicorn_meadow';

export interface Place {
  title: string; address?: string; lat?: number; lng?: number; rating?: number; category?: string;
  thumbnail?: string; when?: string; link?: string; maps_url?: string; website?: string; source: 'google_maps' | 'google_events' | 'manual'; source_id?: string;
}

export interface Verdict {
  pass: boolean; confidence: number; reason: string; flavor_text: string; lens_titles?: string[];
  distance_m?: number; // GPS: meters between the submitter and the mission's place
}
export type Difficulty = 'easy' | 'normal' | 'hard';

export const TEMPLATE_REGIONS: Record<TemplateId, { id: string; label: string; size: RegionSize }[]> = {
  castle_gate: [
    { id: 'castle', label: 'The Castle', size: 'large' },
    { id: 'drawbridge', label: 'The Drawbridge', size: 'medium' },
    { id: 'banners', label: 'The Banners', size: 'medium' },
    { id: 'moon', label: 'The Moon', size: 'small' },
    { id: 'tower_flag', label: 'The Tower Flag', size: 'small' },
    { id: 'moat', label: 'The Moat', size: 'small' },
  ],
  enchanted_forest: [
    { id: 'great_tree', label: 'The Great Tree', size: 'large' },
    { id: 'mushroom_ring', label: 'The Mushroom Ring', size: 'medium' },
    { id: 'river', label: 'The Silver River', size: 'medium' },
    { id: 'fireflies', label: 'The Fireflies', size: 'small' },
    { id: 'owl', label: 'The Wise Owl', size: 'small' },
    { id: 'path', label: 'The Winding Path', size: 'small' },
  ],
  dragon_peak: [
    { id: 'dragon', label: 'The Dragon', size: 'large' },
    { id: 'mountain', label: 'The Mountain', size: 'medium' },
    { id: 'treasure', label: 'The Treasure Hoard', size: 'medium' },
    { id: 'clouds', label: 'The Storm Clouds', size: 'small' },
    { id: 'shield', label: "The Knight's Shield", size: 'small' },
    { id: 'lantern', label: 'The Lantern', size: 'small' },
  ],
  royal_feast: [
    { id: 'feast_table', label: 'The Feast Table', size: 'large' },
    { id: 'throne', label: 'The Throne', size: 'medium' },
    { id: 'chandelier', label: 'The Chandelier', size: 'medium' },
    { id: 'goblet', label: 'The Golden Goblet', size: 'small' },
    { id: 'cake', label: 'The Enchanted Cake', size: 'small' },
    { id: 'lute', label: "The Bard's Lute", size: 'small' },
  ],
  mermaid_lagoon: [
    { id: 'coral_reef', label: 'The Coral Reef', size: 'large' },
    { id: 'singing_rock', label: 'The Singing Rock', size: 'medium' },
    { id: 'pearl_clam', label: 'The Giant Pearl Clam', size: 'medium' },
    { id: 'starfish', label: 'The Starfish', size: 'small' },
    { id: 'seahorse', label: 'The Seahorse', size: 'small' },
    { id: 'bubbles', label: 'The Bubbles', size: 'small' },
  ],
  witch_cottage: [
    { id: 'crooked_cottage', label: 'The Crooked Cottage', size: 'large' },
    { id: 'cauldron', label: 'The Bubbling Cauldron', size: 'medium' },
    { id: 'herb_garden', label: 'The Herb Garden', size: 'medium' },
    { id: 'black_cat', label: 'The Black Cat', size: 'small' },
    { id: 'broomstick', label: 'The Broomstick', size: 'small' },
    { id: 'spell_book', label: 'The Spell Book', size: 'small' },
  ],
  beanstalk_sky: [
    { id: 'beanstalk', label: 'The Giant Beanstalk', size: 'large' },
    { id: 'giant_boot', label: "The Giant's Boot", size: 'medium' },
    { id: 'golden_harp', label: 'The Golden Harp', size: 'medium' },
    { id: 'golden_egg', label: 'The Golden Egg', size: 'small' },
    { id: 'magic_beans', label: 'The Magic Beans', size: 'small' },
    { id: 'sky_goose', label: 'The Sky Goose', size: 'small' },
  ],
  fairy_glen: [
    { id: 'wishing_willow', label: 'The Wishing Willow', size: 'large' },
    { id: 'toadstool_house', label: 'The Toadstool House', size: 'medium' },
    { id: 'dewdrop_pond', label: 'The Dewdrop Pond', size: 'medium' },
    { id: 'fairy_wings', label: 'The Fairy Wings', size: 'small' },
    { id: 'acorn_cap', label: 'The Acorn Cap', size: 'small' },
    { id: 'glow_flower', label: 'The Glow Flower', size: 'small' },
  ],
  ice_palace: [
    { id: 'frost_palace', label: 'The Frost Palace', size: 'large' },
    { id: 'frozen_fountain', label: 'The Frozen Fountain', size: 'medium' },
    { id: 'sleigh', label: 'The Silver Sleigh', size: 'medium' },
    { id: 'snowflake', label: 'The Snowflake', size: 'small' },
    { id: 'ice_crown', label: 'The Ice Crown', size: 'small' },
    { id: 'snow_fox', label: 'The Snow Fox', size: 'small' },
  ],
  pirate_cove: [
    { id: 'pirate_ship', label: 'The Pirate Ship', size: 'large' },
    { id: 'treasure_map', label: 'The Treasure Map', size: 'medium' },
    { id: 'lighthouse', label: 'The Lighthouse', size: 'medium' },
    { id: 'parrot', label: 'The Parrot', size: 'small' },
    { id: 'anchor', label: 'The Anchor', size: 'small' },
    { id: 'message_bottle', label: 'The Message in a Bottle', size: 'small' },
  ],
  candy_village: [
    { id: 'gingerbread_hall', label: 'The Gingerbread Hall', size: 'large' },
    { id: 'lollipop_grove', label: 'The Lollipop Grove', size: 'medium' },
    { id: 'chocolate_river', label: 'The Chocolate River', size: 'medium' },
    { id: 'gumdrop', label: 'The Gumdrop', size: 'small' },
    { id: 'candy_cane', label: 'The Candy Cane', size: 'small' },
    { id: 'cupcake', label: 'The Cupcake', size: 'small' },
  ],
  starlit_tower: [
    { id: 'star_tower', label: 'The Starlit Tower', size: 'large' },
    { id: 'telescope', label: 'The Brass Telescope', size: 'medium' },
    { id: 'comet', label: 'The Comet', size: 'medium' },
    { id: 'wish_star', label: 'The Wishing Star', size: 'small' },
    { id: 'crystal_ball', label: 'The Crystal Ball', size: 'small' },
    { id: 'star_map', label: 'The Star Map', size: 'small' },
  ],
  troll_bridge: [
    { id: 'stone_bridge', label: 'The Stone Bridge', size: 'large' },
    { id: 'bridge_troll', label: 'The Grumpy Troll', size: 'medium' },
    { id: 'rushing_creek', label: 'The Rushing Creek', size: 'medium' },
    { id: 'riddle_stone', label: 'The Riddle Stone', size: 'small' },
    { id: 'billy_goat', label: 'The Billy Goat', size: 'small' },
    { id: 'toll_bell', label: 'The Toll Bell', size: 'small' },
  ],
  cloud_kingdom: [
    { id: 'sky_castle', label: 'The Sky Castle', size: 'large' },
    { id: 'rainbow_bridge', label: 'The Rainbow Bridge', size: 'medium' },
    { id: 'sky_balloon', label: 'The Sky Balloon', size: 'medium' },
    { id: 'kite', label: 'The Kite', size: 'small' },
    { id: 'sunbeam', label: 'The Sunbeam', size: 'small' },
    { id: 'cloud_sheep', label: 'The Cloud Sheep', size: 'small' },
  ],
  crystal_cave: [
    { id: 'heart_geode', label: 'The Heart Geode', size: 'large' },
    { id: 'glow_pool', label: 'The Glow Pool', size: 'medium' },
    { id: 'mine_cart', label: 'The Mine Cart', size: 'medium' },
    { id: 'gemstone', label: 'The Gemstone', size: 'small' },
    { id: 'cave_bat', label: 'The Cave Bat', size: 'small' },
    { id: 'pickaxe', label: 'The Pickaxe', size: 'small' },
  ],
  owl_library: [
    { id: 'great_bookcase', label: 'The Great Bookcase', size: 'large' },
    { id: 'reading_nook', label: 'The Reading Nook', size: 'medium' },
    { id: 'scholar_owl', label: 'The Scholar Owl', size: 'medium' },
    { id: 'quill', label: 'The Quill', size: 'small' },
    { id: 'scroll', label: 'The Scroll', size: 'small' },
    { id: 'candle', label: 'The Candle', size: 'small' },
  ],
  rose_garden: [
    { id: 'rose_arbor', label: 'The Rose Arbor', size: 'large' },
    { id: 'hedge_maze', label: 'The Hedge Maze', size: 'medium' },
    { id: 'garden_fountain', label: 'The Garden Fountain', size: 'medium' },
    { id: 'rosebud', label: 'The Rosebud', size: 'small' },
    { id: 'butterfly', label: 'The Butterfly', size: 'small' },
    { id: 'watering_can', label: 'The Watering Can', size: 'small' },
  ],
  lantern_festival: [
    { id: 'sky_lanterns', label: 'The Sky Lanterns', size: 'large' },
    { id: 'lantern_boat', label: 'The Lantern Boat', size: 'medium' },
    { id: 'fireworks', label: 'The Fireworks', size: 'medium' },
    { id: 'paper_lantern', label: 'The Paper Lantern', size: 'small' },
    { id: 'festival_drum', label: 'The Festival Drum', size: 'small' },
    { id: 'sparkler', label: 'The Sparkler', size: 'small' },
  ],
  swamp_hollow: [
    { id: 'stump_house', label: 'The Stump House', size: 'large' },
    { id: 'lily_pond', label: 'The Lily Pond', size: 'medium' },
    { id: 'rope_swing', label: 'The Rope Swing', size: 'medium' },
    { id: 'lily_frog', label: 'The Lily Frog', size: 'small' },
    { id: 'will_o_wisp', label: "The Will-o'-Wisp", size: 'small' },
    { id: 'cattails', label: 'The Cattails', size: 'small' },
  ],
  unicorn_meadow: [
    { id: 'unicorn', label: 'The Unicorn', size: 'large' },
    { id: 'rainbow_falls', label: 'The Rainbow Falls', size: 'medium' },
    { id: 'wildflower_field', label: 'The Wildflower Field', size: 'medium' },
    { id: 'horseshoe', label: 'The Lucky Horseshoe', size: 'small' },
    { id: 'daisy_chain', label: 'The Daisy Chain', size: 'small' },
    { id: 'bluebird', label: 'The Bluebird', size: 'small' },
  ],
};

export const SIZE_RULES: Record<RegionSize, { types: MissionType[]; members: 'all' | 2 | 1 }> = {
  large: { types: ['gathering'], members: 'all' },
  medium: { types: ['duet', 'gift', 'trial'], members: 2 },
  small: { types: ['relic', 'bard', 'trial'], members: 1 },
};

export const PROOF_FOR_TYPE: Record<MissionType, ProofType> = {
  gathering: 'group_photo',
  duet: 'photo',
  relic: 'photo',
  bard: 'text',
  trial: 'answer',
  gift: 'confirm',
};

// ---------- more mirrors of /shared (rows + theme bits the engine needs) ----------
export type Budget = 'free' | '$' | '$$' | '$$$';
export type MissionStatus = 'locked' | 'open' | 'pending' | 'complete';
export type PageStatus = 'locked' | 'active' | 'complete';

export const TEMPLATE_META: Record<TemplateId, { title: string; mood: string }> = {
  castle_gate: { title: 'The Castle Gate', mood: 'beginnings, welcome, setting out together' },
  enchanted_forest: { title: 'The Enchanted Forest', mood: 'exploring, nature, discovery, quiet magic' },
  dragon_peak: { title: "The Dragon's Peak", mood: 'challenge, courage, the big adventure' },
  royal_feast: { title: 'The Royal Feast', mood: 'celebration, food, music, happily ever after' },
  mermaid_lagoon: { title: 'The Mermaid Lagoon', mood: 'water, play, singing together, secrets of the deep' },
  witch_cottage: { title: "The Witch's Cottage", mood: 'cozy mischief, potions, kitchen magic, a friendly witch' },
  beanstalk_sky: { title: 'The Beanstalk', mood: 'climbing higher, daring, reaching new heights' },
  fairy_glen: { title: 'The Fairy Glen', mood: 'kindness, tiny wonders, gentle magic, small favors' },
  ice_palace: { title: 'The Ice Palace', mood: 'wonder, calm, sparkle, warmth found in the cold' },
  pirate_cove: { title: 'The Pirate Cove', mood: 'treasure hunts, teamwork, daring, salty jokes' },
  candy_village: { title: 'The Candy Village', mood: 'sweet treats, silliness, sharing snacks' },
  starlit_tower: { title: 'The Starlit Tower', mood: 'wishes, stargazing, late-night talks, dreams' },
  troll_bridge: { title: 'The Troll Bridge', mood: 'riddles, bargains, making unlikely friends' },
  cloud_kingdom: { title: 'The Cloud Kingdom', mood: 'lightness, daydreams, big views, floating free' },
  crystal_cave: { title: 'The Crystal Cave', mood: 'mystery, hidden gems, exploring the unknown' },
  owl_library: { title: 'The Owl Library', mood: 'stories, learning, quiet wisdom, curiosity' },
  rose_garden: { title: 'The Rose Garden', mood: 'friendship, kind words, gratitude, slow afternoons' },
  lantern_festival: { title: 'The Lantern Festival', mood: 'celebration, light, music, wishes sent skyward' },
  swamp_hollow: { title: 'The Swamp Hollow', mood: 'cheeky fun, mud and laughter, outsiders welcome' },
  unicorn_meadow: { title: 'The Unicorn Meadow', mood: 'joy, play, rainbows, a wild free spirit' },
};
export const TEMPLATE_IDS = Object.keys(TEMPLATE_REGIONS) as TemplateId[];
/** The original four pages (Round 1–2). Mirror of CLASSIC_TEMPLATES in /shared/templates.ts. */
export const CLASSIC_TEMPLATE_IDS: TemplateId[] = ['castle_gate', 'enchanted_forest', 'dragon_peak', 'royal_feast'];

export const CREST_INFO: Record<string, { emoji: string; title: string }> = {
  dragon: { emoji: '🐉', title: 'Dragon' },
  unicorn: { emoji: '🦄', title: 'Unicorn' },
  owl: { emoji: '🦉', title: 'Owl' },
  fox: { emoji: '🦊', title: 'Fox' },
  stag: { emoji: '🦌', title: 'Stag' },
  wolf: { emoji: '🐺', title: 'Wolf' },
  swan: { emoji: '🦢', title: 'Swan' },
  frog: { emoji: '🐸', title: 'Frog Prince' },
};

export interface Profile {
  id: string; display_name: string; crest: string; color: string; interests: string[]; budget: Budget;
  availability: string[]; home_area: string | null; onboarded: boolean; created_at: string;
}

export interface Fellowship {
  id: string; name: string; invite_code: string; created_by: string | null;
  lat: number | null; lng: number | null; area_label: string | null; created_at: string;
}

export interface Page {
  id: string; storyline_id: string; chapter_number: number; title: string; narrative: string;
  template_id: TemplateId; status: PageStatus; illustration_url: string | null; completed_at: string | null;
}

export interface Mission {
  id: string; page_id: string; storyline_id: string; fellowship_id: string; region_id: string; title: string;
  description: string; story_hook: string; type: MissionType; proof_type: ProofType; required_members: number;
  assignee_ids: string[]; place: Place | null; trial_question: string | null; verification_hint: string;
  points: number; status: MissionStatus; completed_by: string[]; completed_at: string | null;
  story_line: string | null; created_at: string;
}

export interface Completion {
  id: string; mission_id: string; user_id: string; participant_ids: string[]; proof_url: string | null;
  proof_text: string | null; verdict: Verdict | null; story_line: string | null; created_at: string;
}

export interface BookRecap {
  summary: string;
  stats: { missions_completed: number; photos: number; places_visited: number; members_active: number };
  highlights: string[];
  per_member: { user_id: string; title: string; contribution: string }[];
  next_book_hint: string;
  abandoned?: boolean; // E2: book shelved unfinished by replace_active
}

export interface Storyline {
  id: string; fellowship_id: string; book_number: number; title: string; synopsis: string; theme_tags: string[];
  status: 'generating' | 'active' | 'complete'; recap: BookRecap | null; created_at: string;
  difficulty?: Difficulty;
  generation_context?: Record<string, unknown> | null;
}

export interface SubmitProofRequest {
  mission_id: string; participant_ids: string[]; proof_url?: string; proof_text?: string; confirm_for?: string;
  lat?: number; lng?: number; accuracy_m?: number; // GPS proof for place missions
}

export interface GenerateStorylineRequest {
  fellowship_id: string; mode: 'first' | 'sequel'; demo?: boolean | 'ut'; difficulty?: Difficulty;
  replace_active?: boolean; prewarm?: boolean;
}

export interface RerollMissionRequest { mission_id: string; reason?: string; difficulty?: Difficulty }

/** A member as the engine sees them (profile flattened for prompts). */
export interface MemberCtx {
  user_id: string; name: string; crest: string; crest_emoji: string; crest_title: string; color: string;
  interests: string[]; budget: Budget; availability: string[];
}

export function memberCtx(p: Profile): MemberCtx {
  const crest = CREST_INFO[p.crest] ?? { emoji: '✨', title: 'Wanderer' };
  return {
    user_id: p.id, name: p.display_name || 'Wanderer', crest: p.crest, crest_emoji: crest.emoji,
    crest_title: crest.title, color: p.color, interests: p.interests ?? [], budget: p.budget ?? '$',
    availability: p.availability ?? [],
  };
}

export function regionSize(templateId: TemplateId, regionId: string): RegionSize | undefined {
  return TEMPLATE_REGIONS[templateId]?.find((r) => r.id === regionId)?.size;
}
