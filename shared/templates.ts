/**
 * COLORING PAGE TEMPLATES — SHARED CONTRACT (FROZEN)
 * The story engine (EV) may ONLY assign missions to these template ids + region ids.
 * The artist (AD; MP draws set-mp/) must draw every region listed here with the SAME id in assets/pages/.
 * Region ids are unique across ALL templates (not just within one page).
 *
 * Every template has exactly 6 regions: 1 large, 2 medium, 3 small.
 * Size -> mission rules (enforced by the engine; Round 3 G1 = more group play, at most 2 solo missions per page):
 *   large  -> 'gathering'                      (required_members = whole fellowship, min 2)
 *   medium -> 'duet' | 'gift' | 'trial'(co-op) (required_members = 2, or 3 = trio when the fellowship has ≥3)
 *   small  -> 'relic' | 'bard' | 'trial'       (required_members = 1, or 2 = duet; ≥1 of the 3 smalls is a duet)
 */
import type { RegionSize } from './types';

export type TemplateId =
  'castle_gate' | 'enchanted_forest' | 'dragon_peak' | 'royal_feast' | 'mermaid_lagoon' |
  'witch_cottage' | 'beanstalk_sky' | 'fairy_glen' | 'ice_palace' | 'pirate_cove' | 'candy_village' |
  'starlit_tower' | 'troll_bridge' | 'cloud_kingdom' | 'crystal_cave' | 'owl_library' | 'rose_garden' |
  'lantern_festival' | 'swamp_hollow' | 'unicorn_meadow';

export interface RegionDef { id: string; label: string; size: RegionSize }
export interface TemplateDef { id: TemplateId; title: string; mood: string; regions: RegionDef[] }

export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  castle_gate: {
    id: 'castle_gate',
    title: 'The Castle Gate',
    mood: 'beginnings, welcome, setting out together',
    regions: [
      { id: 'castle', label: 'The Castle', size: 'large' },
      { id: 'drawbridge', label: 'The Drawbridge', size: 'medium' },
      { id: 'banners', label: 'The Banners', size: 'medium' },
      { id: 'moon', label: 'The Moon', size: 'small' },
      { id: 'tower_flag', label: 'The Tower Flag', size: 'small' },
      { id: 'moat', label: 'The Moat', size: 'small' },
    ],
  },
  enchanted_forest: {
    id: 'enchanted_forest',
    title: 'The Enchanted Forest',
    mood: 'exploring, nature, discovery, quiet magic',
    regions: [
      { id: 'great_tree', label: 'The Great Tree', size: 'large' },
      { id: 'mushroom_ring', label: 'The Mushroom Ring', size: 'medium' },
      { id: 'river', label: 'The Silver River', size: 'medium' },
      { id: 'fireflies', label: 'The Fireflies', size: 'small' },
      { id: 'owl', label: 'The Wise Owl', size: 'small' },
      { id: 'path', label: 'The Winding Path', size: 'small' },
    ],
  },
  dragon_peak: {
    id: 'dragon_peak',
    title: "The Dragon's Peak",
    mood: 'challenge, courage, the big adventure',
    regions: [
      { id: 'dragon', label: 'The Dragon', size: 'large' },
      { id: 'mountain', label: 'The Mountain', size: 'medium' },
      { id: 'treasure', label: 'The Treasure Hoard', size: 'medium' },
      { id: 'clouds', label: 'The Storm Clouds', size: 'small' },
      { id: 'shield', label: "The Knight's Shield", size: 'small' },
      { id: 'lantern', label: 'The Lantern', size: 'small' },
    ],
  },
  royal_feast: {
    id: 'royal_feast',
    title: 'The Royal Feast',
    mood: 'celebration, food, music, happily ever after',
    regions: [
      { id: 'feast_table', label: 'The Feast Table', size: 'large' },
      { id: 'throne', label: 'The Throne', size: 'medium' },
      { id: 'chandelier', label: 'The Chandelier', size: 'medium' },
      { id: 'goblet', label: 'The Golden Goblet', size: 'small' },
      { id: 'cake', label: 'The Enchanted Cake', size: 'small' },
      { id: 'lute', label: "The Bard's Lute", size: 'small' },
    ],
  },
  // ---- Round 3: 16 new original scenes ----
  mermaid_lagoon: {
    id: 'mermaid_lagoon',
    title: 'The Mermaid Lagoon',
    mood: 'water, play, singing together, secrets of the deep',
    regions: [
      { id: 'coral_reef', label: 'The Coral Reef', size: 'large' },
      { id: 'singing_rock', label: 'The Singing Rock', size: 'medium' },
      { id: 'pearl_clam', label: 'The Giant Pearl Clam', size: 'medium' },
      { id: 'starfish', label: 'The Starfish', size: 'small' },
      { id: 'seahorse', label: 'The Seahorse', size: 'small' },
      { id: 'bubbles', label: 'The Bubbles', size: 'small' },
    ],
  },
  witch_cottage: {
    id: 'witch_cottage',
    title: "The Witch's Cottage",
    mood: 'cozy mischief, potions, kitchen magic, a friendly witch',
    regions: [
      { id: 'crooked_cottage', label: 'The Crooked Cottage', size: 'large' },
      { id: 'cauldron', label: 'The Bubbling Cauldron', size: 'medium' },
      { id: 'herb_garden', label: 'The Herb Garden', size: 'medium' },
      { id: 'black_cat', label: 'The Black Cat', size: 'small' },
      { id: 'broomstick', label: 'The Broomstick', size: 'small' },
      { id: 'spell_book', label: 'The Spell Book', size: 'small' },
    ],
  },
  beanstalk_sky: {
    id: 'beanstalk_sky',
    title: 'The Beanstalk',
    mood: 'climbing higher, daring, reaching new heights',
    regions: [
      { id: 'beanstalk', label: 'The Giant Beanstalk', size: 'large' },
      { id: 'giant_boot', label: "The Giant's Boot", size: 'medium' },
      { id: 'golden_harp', label: 'The Golden Harp', size: 'medium' },
      { id: 'golden_egg', label: 'The Golden Egg', size: 'small' },
      { id: 'magic_beans', label: 'The Magic Beans', size: 'small' },
      { id: 'sky_goose', label: 'The Sky Goose', size: 'small' },
    ],
  },
  fairy_glen: {
    id: 'fairy_glen',
    title: 'The Fairy Glen',
    mood: 'kindness, tiny wonders, gentle magic, small favors',
    regions: [
      { id: 'wishing_willow', label: 'The Wishing Willow', size: 'large' },
      { id: 'toadstool_house', label: 'The Toadstool House', size: 'medium' },
      { id: 'dewdrop_pond', label: 'The Dewdrop Pond', size: 'medium' },
      { id: 'fairy_wings', label: 'The Fairy Wings', size: 'small' },
      { id: 'acorn_cap', label: 'The Acorn Cap', size: 'small' },
      { id: 'glow_flower', label: 'The Glow Flower', size: 'small' },
    ],
  },
  ice_palace: {
    id: 'ice_palace',
    title: 'The Ice Palace',
    mood: 'wonder, calm, sparkle, warmth found in the cold',
    regions: [
      { id: 'frost_palace', label: 'The Frost Palace', size: 'large' },
      { id: 'frozen_fountain', label: 'The Frozen Fountain', size: 'medium' },
      { id: 'sleigh', label: 'The Silver Sleigh', size: 'medium' },
      { id: 'snowflake', label: 'The Snowflake', size: 'small' },
      { id: 'ice_crown', label: 'The Ice Crown', size: 'small' },
      { id: 'snow_fox', label: 'The Snow Fox', size: 'small' },
    ],
  },
  pirate_cove: {
    id: 'pirate_cove',
    title: 'The Pirate Cove',
    mood: 'treasure hunts, teamwork, daring, salty jokes',
    regions: [
      { id: 'pirate_ship', label: 'The Pirate Ship', size: 'large' },
      { id: 'treasure_map', label: 'The Treasure Map', size: 'medium' },
      { id: 'lighthouse', label: 'The Lighthouse', size: 'medium' },
      { id: 'parrot', label: 'The Parrot', size: 'small' },
      { id: 'anchor', label: 'The Anchor', size: 'small' },
      { id: 'message_bottle', label: 'The Message in a Bottle', size: 'small' },
    ],
  },
  candy_village: {
    id: 'candy_village',
    title: 'The Candy Village',
    mood: 'sweet treats, silliness, sharing snacks',
    regions: [
      { id: 'gingerbread_hall', label: 'The Gingerbread Hall', size: 'large' },
      { id: 'lollipop_grove', label: 'The Lollipop Grove', size: 'medium' },
      { id: 'chocolate_river', label: 'The Chocolate River', size: 'medium' },
      { id: 'gumdrop', label: 'The Gumdrop', size: 'small' },
      { id: 'candy_cane', label: 'The Candy Cane', size: 'small' },
      { id: 'cupcake', label: 'The Cupcake', size: 'small' },
    ],
  },
  starlit_tower: {
    id: 'starlit_tower',
    title: 'The Starlit Tower',
    mood: 'wishes, stargazing, late-night talks, dreams',
    regions: [
      { id: 'star_tower', label: 'The Starlit Tower', size: 'large' },
      { id: 'telescope', label: 'The Brass Telescope', size: 'medium' },
      { id: 'comet', label: 'The Comet', size: 'medium' },
      { id: 'wish_star', label: 'The Wishing Star', size: 'small' },
      { id: 'crystal_ball', label: 'The Crystal Ball', size: 'small' },
      { id: 'star_map', label: 'The Star Map', size: 'small' },
    ],
  },
  troll_bridge: {
    id: 'troll_bridge',
    title: 'The Troll Bridge',
    mood: 'riddles, bargains, making unlikely friends',
    regions: [
      { id: 'stone_bridge', label: 'The Stone Bridge', size: 'large' },
      { id: 'bridge_troll', label: 'The Grumpy Troll', size: 'medium' },
      { id: 'rushing_creek', label: 'The Rushing Creek', size: 'medium' },
      { id: 'riddle_stone', label: 'The Riddle Stone', size: 'small' },
      { id: 'billy_goat', label: 'The Billy Goat', size: 'small' },
      { id: 'toll_bell', label: 'The Toll Bell', size: 'small' },
    ],
  },
  cloud_kingdom: {
    id: 'cloud_kingdom',
    title: 'The Cloud Kingdom',
    mood: 'lightness, daydreams, big views, floating free',
    regions: [
      { id: 'sky_castle', label: 'The Sky Castle', size: 'large' },
      { id: 'rainbow_bridge', label: 'The Rainbow Bridge', size: 'medium' },
      { id: 'sky_balloon', label: 'The Sky Balloon', size: 'medium' },
      { id: 'kite', label: 'The Kite', size: 'small' },
      { id: 'sunbeam', label: 'The Sunbeam', size: 'small' },
      { id: 'cloud_sheep', label: 'The Cloud Sheep', size: 'small' },
    ],
  },
  crystal_cave: {
    id: 'crystal_cave',
    title: 'The Crystal Cave',
    mood: 'mystery, hidden gems, exploring the unknown',
    regions: [
      { id: 'heart_geode', label: 'The Heart Geode', size: 'large' },
      { id: 'glow_pool', label: 'The Glow Pool', size: 'medium' },
      { id: 'mine_cart', label: 'The Mine Cart', size: 'medium' },
      { id: 'gemstone', label: 'The Gemstone', size: 'small' },
      { id: 'cave_bat', label: 'The Cave Bat', size: 'small' },
      { id: 'pickaxe', label: 'The Pickaxe', size: 'small' },
    ],
  },
  owl_library: {
    id: 'owl_library',
    title: 'The Owl Library',
    mood: 'stories, learning, quiet wisdom, curiosity',
    regions: [
      { id: 'great_bookcase', label: 'The Great Bookcase', size: 'large' },
      { id: 'reading_nook', label: 'The Reading Nook', size: 'medium' },
      { id: 'scholar_owl', label: 'The Scholar Owl', size: 'medium' },
      { id: 'quill', label: 'The Quill', size: 'small' },
      { id: 'scroll', label: 'The Scroll', size: 'small' },
      { id: 'candle', label: 'The Candle', size: 'small' },
    ],
  },
  rose_garden: {
    id: 'rose_garden',
    title: 'The Rose Garden',
    mood: 'friendship, kind words, gratitude, slow afternoons',
    regions: [
      { id: 'rose_arbor', label: 'The Rose Arbor', size: 'large' },
      { id: 'hedge_maze', label: 'The Hedge Maze', size: 'medium' },
      { id: 'garden_fountain', label: 'The Garden Fountain', size: 'medium' },
      { id: 'rosebud', label: 'The Rosebud', size: 'small' },
      { id: 'butterfly', label: 'The Butterfly', size: 'small' },
      { id: 'watering_can', label: 'The Watering Can', size: 'small' },
    ],
  },
  lantern_festival: {
    id: 'lantern_festival',
    title: 'The Lantern Festival',
    mood: 'celebration, light, music, wishes sent skyward',
    regions: [
      { id: 'sky_lanterns', label: 'The Sky Lanterns', size: 'large' },
      { id: 'lantern_boat', label: 'The Lantern Boat', size: 'medium' },
      { id: 'fireworks', label: 'The Fireworks', size: 'medium' },
      { id: 'paper_lantern', label: 'The Paper Lantern', size: 'small' },
      { id: 'festival_drum', label: 'The Festival Drum', size: 'small' },
      { id: 'sparkler', label: 'The Sparkler', size: 'small' },
    ],
  },
  swamp_hollow: {
    id: 'swamp_hollow',
    title: 'The Swamp Hollow',
    mood: 'cheeky fun, mud and laughter, outsiders welcome',
    regions: [
      { id: 'stump_house', label: 'The Stump House', size: 'large' },
      { id: 'lily_pond', label: 'The Lily Pond', size: 'medium' },
      { id: 'rope_swing', label: 'The Rope Swing', size: 'medium' },
      { id: 'lily_frog', label: 'The Lily Frog', size: 'small' },
      { id: 'will_o_wisp', label: "The Will-o'-Wisp", size: 'small' },
      { id: 'cattails', label: 'The Cattails', size: 'small' },
    ],
  },
  unicorn_meadow: {
    id: 'unicorn_meadow',
    title: 'The Unicorn Meadow',
    mood: 'joy, play, rainbows, a wild free spirit',
    regions: [
      { id: 'unicorn', label: 'The Unicorn', size: 'large' },
      { id: 'rainbow_falls', label: 'The Rainbow Falls', size: 'medium' },
      { id: 'wildflower_field', label: 'The Wildflower Field', size: 'medium' },
      { id: 'horseshoe', label: 'The Lucky Horseshoe', size: 'small' },
      { id: 'daisy_chain', label: 'The Daisy Chain', size: 'small' },
      { id: 'bluebird', label: 'The Bluebird', size: 'small' },
    ],
  },
};

/** All 20 template ids, in declaration order (the 4 classics first). */
export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];

/** The original four pages (Round 1–2 books only used these). */
export const CLASSIC_TEMPLATES: TemplateId[] = ['castle_gate', 'enchanted_forest', 'dragon_peak', 'royal_feast'];

/**
 * Fallback chapter order for a book — used ONLY when the engine can't pick (no Muse, no history).
 * Round 3 (G2): the engine picks 3–4 chapter templates from ALL of TEMPLATE_IDS by mood fit with the story,
 * no repeats within a book, and avoids templates used in the fellowship's previous book. Chapter 1 should feel
 * welcoming and the last chapter like a finale (castle_gate / royal_feast / lantern_festival suit those slots).
 */
export const DEFAULT_CHAPTER_TEMPLATES: TemplateId[] = CLASSIC_TEMPLATES;

export function isTemplateId(v: unknown): v is TemplateId {
  return typeof v === 'string' && v in TEMPLATES;
}

export function regionDef(templateId: TemplateId, regionId: string): RegionDef | undefined {
  return TEMPLATES[templateId]?.regions.find((r) => r.id === regionId);
}
