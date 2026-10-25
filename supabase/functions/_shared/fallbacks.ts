// Owner: EV. Handcrafted fallback missions + chapter text for ALL 20 coloring-page templates, and reroll alternates.
// Pure data with NO imports, so it runs in Deno (book.ts, reroll) AND in the app's mock engine (lib/api.ts).
//
// V6 (far more group quests than solo) — at most 1 solo mission per page, and by default 0:
//   large  = gathering, the whole fellowship
//   medium = duet | gift | co-op trial; ONE medium per page is a TRIO (crew 3) when the fellowship has ≥3
//   small  = relic | bard | trial; a DUET (crew 2) whenever the fellowship has ≥2. `crew: 1` marks a page's one
//            allowed solo (none of the fallbacks use it; the UT book does on chapters II–IV).
// desc(p, n) gets the real crew size n (already capped to the fellowship); copy that ignores n is fixed up by
// withCrew(), so it always reads "Three of you…" / "Two of you…" / "You…" correctly.

export type FbType = 'gathering' | 'duet' | 'relic' | 'bard' | 'trial' | 'gift';
export type FbSize = 'small' | 'medium' | 'large';
export interface FbPlace { title: string }

export interface FallbackSpec {
  type: FbType;
  title: string;
  desc: (p: FbPlace | null, crew: number) => string;
  hook: string;
  hint: string;
  wantsPlace?: boolean;
  trial?: { q: string; a: string }; // a may hold alternates separated by "|"
  crew?: 1 | 2 | 3; // medium: 2 (default) or 3 = trio slot; small: 2 (default) or 1 = the page's one solo slot
}

export const at = (p: FbPlace | null, fallback: string) => (p ? p.title : fallback);
/** "Three of you" / "Two of you" / "You" */
export const crewWord = (n: number) => (n >= 3 ? 'Three of you' : n === 2 ? 'Two of you' : 'You');
export const crewWordLower = (n: number) => crewWord(n).toLowerCase();

/**
 * Required members for a region slot. large = everyone (min 2). medium = 3 on the trio slot when the fellowship has
 * ≥3 (gifts are always 2: giver + recipient), else 2. small (V6) = 2 whenever the fellowship has ≥2, unless the slot is
 * explicitly the page's one solo (`crew: 1`).
 */
export function crewFor(size: FbSize, specCrew: number | undefined, memberCount: number, type?: FbType): number {
  if (size === 'large' || type === 'gathering') return Math.max(2, memberCount);
  if (size === 'medium') return specCrew === 3 && memberCount >= 3 && type !== 'gift' ? 3 : 2;
  return specCrew === 1 || memberCount < 2 ? 1 : 2;
}

const CREW_LEAD = /^(you|two of you|three of you|four of you|both of you|the two of you|the three of you|together|a pair|a duo|a trio)\b/i;
// Imperatives a mission can open with: "Photograph the moon" → "Two of you photograph the moon".
const VERB_LEAD = /^(photograph|write|answer|describe|invent|look|find|take|make|draw|sketch|visit|share|pick|name|snap|walk|spot|hunt|collect|list|tell|record|bring|buy|cook|bake|go|head|meet|play|sing|read|ask|count|try|build|craft|choose|create|plan|pay|grab|order|split|explore|search|stand|sit|climb|race|trade|swap|leave|learn|solve|capture|catch|recreate|pose|act|map|post|send|teach|show|compose|imagine|retell)\b/i;

/**
 * Make a description match its crew (V6): "Photograph the moon." on a duet → "Two of you photograph the moon.";
 * "Two of you…" on a solo → "You…". Copy that already names its crew is left alone.
 */
export function withCrew(desc: string, crew: number): string {
  const d = desc.trim();
  if (crew <= 1) return d.replace(/^(two|three|four|both) of you\b/i, 'You');
  const lead = crewWord(crew);
  if (/^(two|three|four) of you\b/i.test(d)) return d.replace(/^(two|three|four) of you\b/i, lead);
  if (CREW_LEAD.test(d)) return d;
  if (VERB_LEAD.test(d)) return `${lead} ${d[0].toLowerCase()}${d.slice(1)}`;
  // Not an imperative: keep proper nouns ("UT Tower…"), lowercase only a plain article/pronoun ("The…" → "the…").
  const lower = /^(the|a|an|your|this|that|each|every|one|some|any|our|it|its)\b/i.test(d) ? d[0].toLowerCase() + d.slice(1) : d;
  return `${lead}, together: ${lower}`;
}

export const FALLBACK: Record<string, Record<string, FallbackSpec>> = {
  // ---------------------------------------------------------------- the four classics
  castle_gate: {
    castle: {
      type: 'gathering', title: 'Council at the Gate', wantsPlace: true,
      desc: (p) => `Meet all together at ${at(p, 'a spot you all love')} and take one group photo with your hands stacked like a pact.`,
      hook: 'Every great fellowship begins with a shared table and a promise.',
      hint: 'Group photo with most of the fellowship visible, hands stacked or drinks raised.',
    },
    drawbridge: {
      type: 'duet', title: 'Cross the Bridge Together', wantsPlace: true, crew: 3,
      desc: (p, n) => `${crewWord(n)} walk to ${at(p, 'a bridge or crosswalk nearby')} together and photograph your shoes side by side.`,
      hook: 'The drawbridge only lowers for those who cross it side by side.',
      hint: 'Photo showing the friends (or their shoes) together outdoors.',
    },
    banners: {
      type: 'gift', title: 'Stitch the Banner',
      desc: () => 'Make or buy a tiny surprise (under $5) for another member: a doodle, a snack, a note. They confirm when they get it.',
      hook: 'A banner is stitched from small kindnesses.',
      hint: 'The recipient confirms they received it.',
    },
    moon: {
      type: 'relic', title: 'Capture the Moon',
      desc: () => 'Photograph the moon tonight. No moon? The brightest light in the night sky will do.',
      hook: 'The moon keeps the first lantern safe.',
      hint: 'Photo of the moon or a night sky.',
    },
    tower_flag: {
      type: 'trial', title: 'The Riddle of the Tower', crew: 2,
      desc: (_p, n) => `${crewWord(n)} put your heads together and answer the riddle carved into the tower door.`,
      hook: 'The flag will not rise for a fool.',
      hint: 'The correct answer.',
      trial: { q: 'I have keys but open no locks, I have space but no room, and you can enter but never go inside. What am I?', a: 'keyboard|a keyboard|computer keyboard' },
    },
    moat: {
      type: 'bard', title: 'Verse of the Moat',
      desc: () => 'Write two lines of a poem about your fellowship. The best lines are written into the book.',
      hook: 'The moat only lets poets pass.',
      hint: 'Two lines of verse about the group.',
    },
  },
  enchanted_forest: {
    great_tree: {
      type: 'gathering', title: 'Beneath the Great Tree', wantsPlace: true,
      desc: (p) => `Gather everyone at ${at(p, 'a nearby park')} and take a group photo under the biggest tree you can find.`,
      hook: 'The Great Tree remembers every friend who has stood beneath it.',
      hint: 'Group photo outdoors with a tree or greenery.',
    },
    mushroom_ring: {
      type: 'duet', title: 'The Mushroom Ring', wantsPlace: true, crew: 3,
      desc: (p, n) => `${crewWord(n)} share a snack picnic at ${at(p, 'a patch of grass nearby')} and photograph your spread laid out in a circle.`,
      hook: 'Sit inside the ring and the forest will share its secrets.',
      hint: 'Photo of snacks or food arranged together, ideally outdoors.',
    },
    river: {
      type: 'trial', title: 'The Riddle of the River',
      desc: () => 'Two of you solve the river spirit\'s riddle together.',
      hook: 'The river spirit lets only clever pairs cross.',
      hint: 'The correct answer.',
      trial: { q: 'I run but never walk, I have a mouth but never talk, and a bed but never sleep. What am I?', a: 'river|a river|stream' },
    },
    fireflies: {
      type: 'relic', title: 'Catch a Firefly',
      desc: () => 'Photograph a small glowing light: string lights, a lantern, a candle or a neon sign.',
      hook: 'Each firefly carries a spark of the stolen light.',
      hint: 'Photo of a small glowing light source.',
    },
    owl: {
      type: 'bard', title: 'The Owl\'s Question',
      desc: () => 'Write the wisest thing someone in this fellowship has ever told you, in one or two sentences.',
      hook: 'The Wise Owl trades directions for wisdom.',
      hint: 'A sentence or two of wisdom from a friend.',
    },
    path: {
      type: 'relic', title: 'The Winding Path', wantsPlace: true, crew: 2,
      desc: (p, n) => `${crewWord(n)} walk an interesting path, trail or staircase${p ? ` at ${p.title}` : ' together'} and photograph it from the middle.`,
      hook: 'The path rearranges itself for the curious.',
      hint: 'Photo of a path, trail or staircase.',
    },
  },
  dragon_peak: {
    dragon: {
      type: 'gathering', title: 'Face the Dragon', wantsPlace: true,
      desc: (p) => `Everyone meets at ${at(p, 'the most adventurous spot you can agree on')} and takes a group photo in your fiercest dragon pose.`,
      hook: 'Dragons are only defeated by friends who show up together.',
      hint: 'Group photo, people posing dramatically.',
    },
    mountain: {
      type: 'duet', title: 'Climb the Mountain', wantsPlace: true, crew: 3,
      desc: (p, n) => `${crewWord(n)} climb to the highest point you can reach${p ? ` near ${p.title}` : ' nearby'} (a hill, a top floor, a rooftop deck) and photograph the view together.`,
      hook: 'From the summit you can see where the thief has gone.',
      hint: 'Photo of a view from up high, with the friends if possible.',
    },
    treasure: {
      type: 'gift', title: 'Share the Hoard',
      desc: () => 'Give another member a treasure: a sticker, a snack, a book to borrow. They confirm when they get it.',
      hook: 'A dragon hoards. A fellowship shares.',
      hint: 'The recipient confirms they received it.',
    },
    clouds: {
      type: 'trial', title: 'The Storm\'s Riddle', crew: 2,
      desc: (_p, n) => `${crewWord(n)} answer the riddle thundered from the storm clouds.`,
      hook: 'The clouds part only for the wise.',
      hint: 'The correct answer.',
      trial: { q: 'The more of me you take, the more you leave behind. What am I?', a: 'footsteps|steps|footprints' },
    },
    shield: {
      type: 'relic', title: 'The Knight\'s Shield',
      desc: () => 'Photograph something round and brave-looking out in the world: a clock, a manhole cover, a round sign.',
      hook: 'Every knight needs a shield, even a borrowed one.',
      hint: 'Photo of a round object.',
    },
    lantern: {
      type: 'bard', title: 'Light the Lantern',
      desc: () => 'Write one sentence about a moment this week when a friend made things brighter.',
      hook: 'The last lantern is lit with a true story.',
      hint: 'One sentence about a friend.',
    },
  },
  royal_feast: {
    feast_table: {
      type: 'gathering', title: 'The Royal Feast', wantsPlace: true,
      desc: (p) => `Share a meal all together at ${at(p, 'someone\'s place or a favorite cheap eat')} and take a group photo with the table full.`,
      hook: 'Every tale worth telling ends at a crowded table.',
      hint: 'Group photo with food on a table.',
    },
    throne: {
      type: 'duet', title: 'Crown a Friend', crew: 3,
      desc: (_p, n) => `${crewWord(n)} crown each other (paper crowns count) and take a royal portrait together.`,
      hook: 'The throne is shared in this kingdom.',
      hint: 'Photo of the friends, at least one wearing a crown.',
    },
    chandelier: {
      type: 'trial', title: 'The Chandelier\'s Riddle',
      desc: () => 'Two of you solve the riddle glittering in the chandelier.',
      hook: 'The chandelier lights only when its riddle is answered.',
      hint: 'The correct answer.',
      trial: { q: 'I am tall when I am young and short when I am old. What am I?', a: 'candle|a candle' },
    },
    goblet: {
      type: 'relic', title: 'Raise the Goblet', wantsPlace: true, crew: 2,
      desc: (p, n) => `${crewWord(n)} clink two fancy drinks${p ? ` from ${p.title}` : ''} and photograph the toast. Any drink in a nice cup counts.`,
      hook: 'Fill the goblet and toast the tale.',
      hint: 'Photo of drinks raised in a toast.',
    },
    cake: {
      type: 'relic', title: 'The Enchanted Cake', wantsPlace: true,
      desc: (p) => `Photograph a dessert worthy of a royal feast${p ? ` at ${p.title}` : ''}.`,
      hook: 'One bite and every curse is lifted.',
      hint: 'Photo of a dessert.',
    },
    lute: {
      type: 'bard', title: 'The Bard\'s Lute',
      desc: () => 'Write a four-word toast to your fellowship.',
      hook: 'The bard needs one last verse to end the song.',
      hint: 'A short toast.',
    },
  },

  // ---------------------------------------------------------------- Round 3: 16 new scenes
  mermaid_lagoon: {
    coral_reef: {
      type: 'gathering', title: 'The Reef Reunion', wantsPlace: true,
      desc: (p) => `Everyone meets at ${at(p, 'a fountain, pool, creek or any water you can find')} and takes a group photo making your best fish faces.`,
      hook: 'The reef only blooms when the whole school swims in.',
      hint: 'Group photo near water, silly faces welcome.',
    },
    singing_rock: {
      type: 'duet', title: 'The Singing Rock', crew: 3,
      desc: (_p, n) => `${crewWord(n)} sing one chorus of a song you all know, somewhere with an echo, and snap a photo mid-note.`,
      hook: 'The rock remembers every song sung on it, even the off-key ones.',
      hint: 'Photo of the friends singing together.',
    },
    pearl_clam: {
      type: 'trial', title: 'The Clam\'s Riddle',
      desc: () => 'Two of you pry the riddle out of the giant clam and answer it together.',
      hook: 'The clam gives up its pearl only to a clever pair.',
      hint: 'The correct answer.',
      trial: { q: 'I am full of holes, yet I still hold water. What am I?', a: 'sponge|a sponge' },
    },
    starfish: {
      type: 'relic', title: 'Find a Starfish',
      desc: () => 'Photograph something shaped like a star out in the world: a sign, a cookie, a sticker, a light.',
      hook: 'Fallen stars hide all over town, waiting to be fished out.',
      hint: 'Photo of a star-shaped object.',
    },
    seahorse: {
      type: 'relic', title: 'Ride the Seahorse', wantsPlace: true, crew: 2,
      desc: (p, n) => `${crewWord(n)} find something to ride or perch on${p ? ` near ${p.title}` : ''} (a bench, a swing, a statue's pedestal) and take a photo side by side.`,
      hook: 'Seahorses travel in pairs, tails curled together.',
      hint: 'Photo of the friends side by side on something.',
    },
    bubbles: {
      type: 'bard', title: 'Message in a Bubble',
      desc: () => 'Write a one-line wish for your fellowship, short enough to fit in a bubble.',
      hook: 'Every bubble carries a wish up to the surface.',
      hint: 'A short wish for the group.',
    },
  },
  witch_cottage: {
    crooked_cottage: {
      type: 'gathering', title: 'Tea at the Cottage', wantsPlace: true,
      desc: (p) => `Everyone gathers at ${at(p, 'someone\'s place or a cozy café')} for a warm drink and takes a group photo with mugs raised.`,
      hook: 'The friendly witch never brews for fewer than the whole coven.',
      hint: 'Group photo with drinks or mugs.',
    },
    cauldron: {
      type: 'duet', title: 'Brew a Potion', crew: 3,
      desc: (_p, n) => `${crewWord(n)} invent a "potion": mix a drink or snack from at least three ingredients, name it, and photograph it.`,
      hook: 'A potion needs one ingredient from every witch at the cauldron.',
      hint: 'Photo of a homemade drink or snack.',
    },
    herb_garden: {
      type: 'gift', title: 'A Sprig for a Friend',
      desc: () => 'Give another member something small that grows or smells nice: a flower, a tea bag, a mint. They confirm when they get it.',
      hook: 'Herbs picked for a friend never wilt.',
      hint: 'The recipient confirms they received it.',
    },
    black_cat: {
      type: 'relic', title: 'Spot the Black Cat',
      desc: () => 'Photograph a cat (any color, from a safe distance) or a cat drawn on a sign, mural or mug.',
      hook: 'The witch\'s cat has wandered off again. It always does.',
      hint: 'Photo of a cat or a picture of a cat.',
    },
    broomstick: {
      type: 'relic', title: 'Borrow a Broomstick', crew: 2,
      desc: (_p, n) => `${crewWord(n)} strike a flying-witch pose with a broom, mop or umbrella and take the photo.`,
      hook: 'Every broom can fly, if you believe hard enough and jump a little.',
      hint: 'Photo of someone posing with a broom or similar.',
    },
    spell_book: {
      type: 'trial', title: 'The Spell Book\'s Riddle',
      desc: () => 'Answer the riddle scribbled in the margin of the spell book.',
      hook: 'The book only opens for those who can read between its lines.',
      hint: 'The correct answer.',
      trial: { q: 'What has to be broken before you can use it?', a: 'egg|an egg|eggs' },
    },
  },
  beanstalk_sky: {
    beanstalk: {
      type: 'gathering', title: 'Climb the Beanstalk', wantsPlace: true,
      desc: (p) => `Everyone meets at ${at(p, 'the tallest spot you can reach together')} (a hill, a garage roof deck, a top floor) and takes a group photo with the view behind you.`,
      hook: 'The beanstalk grows a little taller for every friend who climbs it.',
      hint: 'Group photo from somewhere high up.',
    },
    giant_boot: {
      type: 'duet', title: 'The Giant\'s Footprint', crew: 3,
      desc: (_p, n) => `${crewWord(n)} line up your feet in a row next to the biggest thing you can find and photograph it from above.`,
      hook: 'Next to a giant\'s boot, friends look small together.',
      hint: 'Photo of several feet next to something big.',
    },
    golden_harp: {
      type: 'duet', title: 'Play the Golden Harp', wantsPlace: true,
      desc: (p) => `Two of you play or listen to live music${p ? ` at ${p.title}` : ' anywhere (a busker counts, from a respectful distance)'} and photograph the moment.`,
      hook: 'The harp sings only for those who listen together.',
      hint: 'Photo of the two at a music spot or with an instrument.',
    },
    golden_egg: {
      type: 'trial', title: 'The Golden Egg Riddle', crew: 2,
      desc: (_p, n) => `${crewWord(n)} answer the riddle written on the golden egg.`,
      hook: 'The goose lays gold only for a clever answer.',
      hint: 'The correct answer.',
      trial: { q: 'What goes up but never comes down?', a: 'age|your age|my age' },
    },
    magic_beans: {
      type: 'relic', title: 'Trade for Magic Beans',
      desc: () => 'Photograph something tiny and green: a bean, a pea, a leaf, a button.',
      hook: 'Three tiny beans started all of this.',
      hint: 'Photo of something small and green.',
    },
    sky_goose: {
      type: 'bard', title: 'The Goose\'s Song',
      desc: () => 'Write a two-line song for the goose about the highest you have ever been.',
      hook: 'The sky goose collects songs from everyone who visits the clouds.',
      hint: 'Two lines of song.',
    },
  },
  fairy_glen: {
    wishing_willow: {
      type: 'gathering', title: 'The Wishing Willow', wantsPlace: true,
      desc: (p) => `Everyone gathers at ${at(p, 'a park with a big tree')}, each makes a wish, and you take a group photo under the branches.`,
      hook: 'The willow grants wishes only when they are made together.',
      hint: 'Group photo outdoors under a tree.',
    },
    toadstool_house: {
      type: 'duet', title: 'A Tiny Home', crew: 3,
      desc: (_p, n) => `${crewWord(n)} build a tiny fairy house from things you find (sticks, leaves, pebbles, a cup) and photograph it.`,
      hook: 'Fairies move in wherever friends build something kind.',
      hint: 'Photo of a small handmade structure.',
    },
    dewdrop_pond: {
      type: 'gift', title: 'A Drop of Kindness',
      desc: () => 'Bring another member their favorite drink, unannounced. They confirm when they get it.',
      hook: 'One dewdrop of kindness fills the whole pond.',
      hint: 'The recipient confirms they received it.',
    },
    fairy_wings: {
      type: 'relic', title: 'Catch Fairy Wings', crew: 2,
      desc: (_p, n) => `${crewWord(n)} find a butterfly, a moth, or wings painted on a mural, and take a photo with them.`,
      hook: 'Lost fairy wings flutter around town until someone finds them.',
      hint: 'Photo of wings: an insect, a mural or a decoration.',
    },
    acorn_cap: {
      type: 'trial', title: 'The Acorn\'s Riddle',
      desc: () => 'Answer the riddle hidden under the acorn cap.',
      hook: 'Small things hold big secrets.',
      hint: 'The correct answer.',
      trial: { q: 'What has roots nobody sees, is taller than trees, up, up it goes, and yet never grows?', a: 'mountain|a mountain|mountains' },
    },
    glow_flower: {
      type: 'bard', title: 'Name a Glow Flower',
      desc: () => 'Invent a magical flower named after someone in the fellowship and describe what it does in one sentence.',
      hook: 'Every glow flower is named after a friend who made the glen brighter.',
      hint: 'A one-sentence invented flower.',
    },
  },
  ice_palace: {
    frost_palace: {
      type: 'gathering', title: 'The Frost Palace', wantsPlace: true,
      desc: (p) => `Everyone meets at ${at(p, 'a spot for ice cream, shaved ice or cold drinks')} and takes a group photo with your frozen treats.`,
      hook: 'The palace thaws only when it is full of warm friends.',
      hint: 'Group photo with cold treats or drinks.',
    },
    frozen_fountain: {
      type: 'duet', title: 'Freeze Frame', wantsPlace: true, crew: 3,
      desc: (p, n) => `${crewWord(n)} strike a frozen statue pose${p ? ` at ${p.title}` : ' next to a fountain or statue'} and hold it for the photo.`,
      hook: 'The fountain froze mid-splash. Join it.',
      hint: 'Photo of the friends posing like statues.',
    },
    sleigh: {
      type: 'gift', title: 'The Silver Sleigh',
      desc: () => 'Deliver another member a cozy surprise: socks, a warm drink, a hand-drawn card. They confirm when they get it.',
      hook: 'The sleigh delivers warmth to every door in the kingdom.',
      hint: 'The recipient confirms they received it.',
    },
    snowflake: {
      type: 'trial', title: 'The Snowflake\'s Riddle', crew: 2,
      desc: (_p, n) => `${crewWord(n)} answer the riddle written in frost.`,
      hook: 'No two snowflakes are alike, but they all love a riddle.',
      hint: 'The correct answer.',
      trial: { q: 'What gets wetter the more it dries?', a: 'towel|a towel' },
    },
    ice_crown: {
      type: 'relic', title: 'The Ice Crown',
      desc: () => 'Photograph something that sparkles: glitter, crystal, a shiny window, sunlight on water.',
      hook: 'The crown was made from every sparkle in the city.',
      hint: 'Photo of something sparkly.',
    },
    snow_fox: {
      type: 'bard', title: 'The Snow Fox\'s Tale',
      desc: () => 'Write two sentences about the coziest moment you have shared with this fellowship.',
      hook: 'The snow fox curls up with the warmest stories.',
      hint: 'Two sentences about a cozy shared moment.',
    },
  },
  pirate_cove: {
    pirate_ship: {
      type: 'gathering', title: 'All Hands on Deck', wantsPlace: true,
      desc: (p) => `The whole crew meets at ${at(p, 'a waterfront, dock or park')} and takes a group photo in your best pirate pose. Arr is mandatory.`,
      hook: 'A ship with half a crew goes in circles.',
      hint: 'Group photo, pirate poses.',
    },
    treasure_map: {
      type: 'trial', title: 'Read the Map', crew: 3,
      desc: (_p, n) => `${crewWord(n)} huddle over the treasure map and solve its riddle together.`,
      hook: 'X marks the spot, but only for those who can read the map.',
      hint: 'The correct answer.',
      trial: { q: 'I have cities but no houses, forests but no trees, and water but no fish. What am I?', a: 'map|a map' },
    },
    lighthouse: {
      type: 'duet', title: 'Find the Lighthouse', wantsPlace: true,
      desc: (p) => `Two of you find the tallest light you can see${p ? ` near ${p.title}` : ''} (a tower, a streetlight, a lit sign) and photograph it at dusk.`,
      hook: 'The lighthouse guides every lost sailor home.',
      hint: 'Photo of a tall light at dusk or night.',
    },
    parrot: {
      type: 'relic', title: 'The Talking Parrot', crew: 2,
      desc: (_p, n) => `${crewWord(n)} find the most colorful bird (or bird mural) you can and photograph it. Bonus for a parrot impression.`,
      hook: 'The parrot knows where the treasure is, but only talks to pairs.',
      hint: 'Photo of a bird or a picture of a bird.',
    },
    anchor: {
      type: 'relic', title: 'Drop Anchor',
      desc: () => 'Photograph something heavy, metal and old-looking: a bollard, a bell, a gate, a rusty bike.',
      hook: 'Even pirates need something that keeps them grounded.',
      hint: 'Photo of something heavy and metal.',
    },
    message_bottle: {
      type: 'bard', title: 'Message in a Bottle',
      desc: () => 'Write a short message to your fellowship as if it will wash ashore in ten years.',
      hook: 'Some messages are worth waiting a decade for.',
      hint: 'A short message to the group\'s future selves.',
    },
  },
  candy_village: {
    gingerbread_hall: {
      type: 'gathering', title: 'The Gingerbread Hall', wantsPlace: true,
      desc: (p) => `Everyone gathers at ${at(p, 'a bakery or dessert shop')} for something sweet and takes a group photo before the first bite.`,
      hook: 'The gingerbread doors open only for a crowd with a sweet tooth.',
      hint: 'Group photo with desserts or sweets.',
    },
    lollipop_grove: {
      type: 'duet', title: 'The Lollipop Swap', crew: 3,
      desc: (_p, n) => `${crewWord(n)} each pick a candy for someone else in the group, swap, and photograph your loot together.`,
      hook: 'In the grove, sweets taste better when someone else picked them.',
      hint: 'Photo of the friends with candy.',
    },
    chocolate_river: {
      type: 'duet', title: 'The Chocolate River', wantsPlace: true,
      desc: (p) => `Two of you share a chocolate drink or treat${p ? ` at ${p.title}` : ''} and photograph the cups or plates side by side.`,
      hook: 'The river runs warm and sweet, best shared by two.',
      hint: 'Photo of two chocolate treats or drinks.',
    },
    gumdrop: {
      type: 'trial', title: 'The Gumdrop Riddle',
      desc: () => 'Answer the riddle stuck to the gumdrop.',
      hook: 'Gumdrops are chewy, and so are their riddles.',
      hint: 'The correct answer.',
      trial: { q: 'What has many teeth but cannot bite?', a: 'comb|a comb|zipper|saw' },
    },
    candy_cane: {
      type: 'relic', title: 'Find the Candy Cane', crew: 2,
      desc: (_p, n) => `${crewWord(n)} find something striped like a candy cane (a pole, an awning, a shirt) and take a photo with it.`,
      hook: 'The village signposts are all candy canes, and some have wandered off.',
      hint: 'Photo of something striped.',
    },
    cupcake: {
      type: 'bard', title: 'Frost a Cupcake',
      desc: () => 'Describe your fellowship as a dessert in one sentence: what flavor, what frosting, what sprinkles?',
      hook: 'Every fellowship has a flavor.',
      hint: 'A one-sentence dessert description.',
    },
  },
  starlit_tower: {
    star_tower: {
      type: 'gathering', title: 'Under the Stars', wantsPlace: true,
      desc: (p) => `Everyone meets after dark at ${at(p, 'a rooftop, park or open field')} and takes a group photo looking up at the sky.`,
      hook: 'The tower lights up only when every friend looks up at once.',
      hint: 'Group photo outdoors in the evening.',
    },
    telescope: {
      type: 'duet', title: 'The Brass Telescope', crew: 3,
      desc: (_p, n) => `${crewWord(n)} each point at something far away and photograph all your arms pointing the same way.`,
      hook: 'Look far enough and you can see next chapter.',
      hint: 'Photo of arms or fingers pointing toward the sky or horizon.',
    },
    comet: {
      type: 'duet', title: 'Chase the Comet', wantsPlace: true,
      desc: (p) => `Two of you take a long-exposure or motion-blur photo of lights${p ? ` near ${p.title}` : ' at night'}: cars, sparklers, a phone flashlight.`,
      hook: 'Comets leave a trail for those quick enough to follow.',
      hint: 'Photo with streaks or blurs of light.',
    },
    wish_star: {
      type: 'relic', title: 'The Wishing Star', crew: 2,
      desc: (_p, n) => `${crewWord(n)} find the first star (or the brightest light) of the night and photograph it while making a wish.`,
      hook: 'First star, best star.',
      hint: 'Photo of a star or a bright light in the night sky.',
    },
    crystal_ball: {
      type: 'relic', title: 'The Crystal Ball',
      desc: () => 'Photograph something round and see-through: a glass, a marble, a bubble, a fishbowl.',
      hook: 'The crystal ball shows the future to anyone who finds one.',
      hint: 'Photo of a round transparent object.',
    },
    star_map: {
      type: 'trial', title: 'The Star Map\'s Riddle',
      desc: () => 'Answer the riddle hidden in the star map.',
      hook: 'The map leads home only if you can read the sky.',
      hint: 'The correct answer.',
      trial: { q: 'I come out at night without being called, and I am lost in the day without being stolen. What am I?', a: 'stars|star|the stars' },
    },
  },
  troll_bridge: {
    stone_bridge: {
      type: 'gathering', title: 'Cross the Troll Bridge', wantsPlace: true,
      desc: (p) => `Everyone meets at ${at(p, 'a bridge or footbridge nearby')} and takes a group photo crossing it together.`,
      hook: 'The troll lets a crowd pass for free. Alone, the toll is steep.',
      hint: 'Group photo on or near a bridge.',
    },
    bridge_troll: {
      type: 'duet', title: 'Befriend the Troll', crew: 3,
      desc: (_p, n) => `${crewWord(n)} make the grumpiest troll faces you can and take one photo. Then one real smile photo.`,
      hook: 'Even trolls crack a smile for a good group grump.',
      hint: 'Photo of the friends making grumpy faces.',
    },
    rushing_creek: {
      type: 'duet', title: 'The Rushing Creek', wantsPlace: true,
      desc: (p) => `Two of you find running water${p ? ` at ${p.title}` : ' (a creek, a fountain, a splash pad)'} and photograph your reflections or hands in it.`,
      hook: 'The creek carries every promise downstream.',
      hint: 'Photo of running water with the two of you.',
    },
    riddle_stone: {
      type: 'trial', title: 'The Riddle Stone', crew: 2,
      desc: (_p, n) => `${crewWord(n)} answer the riddle the troll carved into the stone.`,
      hook: 'Answer right and the troll grumbles but waves you through.',
      hint: 'The correct answer.',
      trial: { q: 'What has a head and a tail but no body?', a: 'coin|a coin|penny' },
    },
    billy_goat: {
      type: 'relic', title: 'The Billy Goat',
      desc: () => 'Photograph an animal with horns or hooves: a statue, a mural, a sign, or the real thing from a respectful distance.',
      hook: 'The goats know a shortcut, if you can find them.',
      hint: 'Photo of a horned or hoofed animal (or a picture of one).',
    },
    toll_bell: {
      type: 'bard', title: 'Pay the Toll',
      desc: () => 'Pay the troll\'s toll in compliments: write one honest compliment for each member of your fellowship.',
      hook: 'Trolls are secretly suckers for kind words.',
      hint: 'Compliments for the group.',
    },
  },
  cloud_kingdom: {
    sky_castle: {
      type: 'gathering', title: 'The Castle in the Clouds', wantsPlace: true,
      desc: (p) => `Everyone gathers at ${at(p, 'a high spot with a big sky')} and takes a group photo where the sky fills most of the frame.`,
      hook: 'The sky castle drifts down only when the whole court is waiting.',
      hint: 'Group photo with lots of sky.',
    },
    rainbow_bridge: {
      type: 'duet', title: 'The Rainbow Bridge', crew: 3,
      desc: (_p, n) => `${crewWord(n)} each wear or hold a different color and line up like a rainbow for a photo.`,
      hook: 'The rainbow bridge is built from friends standing in a row.',
      hint: 'Photo of friends in different colors in a line.',
    },
    sky_balloon: {
      type: 'gift', title: 'Send a Balloon',
      desc: () => 'Give another member something that floats or flies: a balloon, a paper plane with a note, a kite. They confirm when they get it.',
      hook: 'Balloons always find the friend they were meant for.',
      hint: 'The recipient confirms they received it.',
    },
    kite: {
      type: 'relic', title: 'Catch the Kite', crew: 2,
      desc: (_p, n) => `${crewWord(n)} find something flying or flapping in the wind (a flag, a kite, a banner) and photograph it together.`,
      hook: 'The wind is playing with something of yours.',
      hint: 'Photo of something flying or flapping.',
    },
    sunbeam: {
      type: 'trial', title: 'The Sunbeam\'s Riddle',
      desc: () => 'Answer the riddle written in light.',
      hook: 'Sunbeams love a bright answer.',
      hint: 'The correct answer.',
      trial: { q: 'What can fill a room but takes up no space?', a: 'light|sunlight|the light' },
    },
    cloud_sheep: {
      type: 'bard', title: 'Count the Cloud Sheep',
      desc: () => 'Look at the sky and describe the shape of one cloud in a single silly sentence.',
      hook: 'The cloud sheep wander off unless someone names them.',
      hint: 'A sentence about a cloud shape.',
    },
  },
  crystal_cave: {
    heart_geode: {
      type: 'gathering', title: 'The Heart of the Cave', wantsPlace: true,
      desc: (p) => `Everyone meets at ${at(p, 'a museum, rock shop or a cool hidden spot')} and takes a group photo making a heart with your hands.`,
      hook: 'The geode glows only when every heart in the fellowship is near.',
      hint: 'Group photo with hand hearts.',
    },
    glow_pool: {
      type: 'duet', title: 'The Glow Pool', crew: 3,
      desc: (_p, n) => `${crewWord(n)} light up your faces with phone flashlights in a dark spot and take a spooky-cozy photo.`,
      hook: 'The pool reflects only faces lit by friendship (and flashlights).',
      hint: 'Photo of faces lit by small lights in the dark.',
    },
    mine_cart: {
      type: 'duet', title: 'Ride the Mine Cart', wantsPlace: true,
      desc: (p) => `Two of you ride something together${p ? ` near ${p.title}` : ''}: a bus, a scooter pair, a carousel, a swing set. Photo of the ride.`,
      hook: 'The mine cart only rolls with two riders.',
      hint: 'Photo of the two on a ride or vehicle.',
    },
    gemstone: {
      type: 'trial', title: 'The Gemstone\'s Riddle', crew: 2,
      desc: (_p, n) => `${crewWord(n)} answer the riddle locked inside the gemstone.`,
      hook: 'Every gem hides a secret at its center.',
      hint: 'The correct answer.',
      trial: { q: 'The more you take away from me, the bigger I get. What am I?', a: 'hole|a hole' },
    },
    cave_bat: {
      type: 'relic', title: 'The Cave Bat',
      desc: () => 'Photograph something upside down out in the world (a sign, a chair on a table, a reflection).',
      hook: 'Bats see the world upside down, and so should you.',
      hint: 'Photo of something upside down.',
    },
    pickaxe: {
      type: 'bard', title: 'Dig Deep',
      desc: () => 'Write one sentence about a hidden talent of someone in this fellowship.',
      hook: 'The best gems are the ones nobody knew were there.',
      hint: 'A sentence about a friend\'s hidden talent.',
    },
  },
  owl_library: {
    great_bookcase: {
      type: 'gathering', title: 'The Great Bookcase', wantsPlace: true,
      desc: (p) => `Everyone meets at ${at(p, 'a library or bookstore')} and takes a group photo, each holding a book with a funny title.`,
      hook: 'The bookcase opens its secret door only for a full reading circle.',
      hint: 'Group photo with books.',
    },
    reading_nook: {
      type: 'duet', title: 'The Reading Nook', crew: 3,
      desc: (_p, n) => `${crewWord(n)} squeeze into one cozy spot and each read one sentence aloud from any book. Photo of the nook.`,
      hook: 'The nook is small, but stories make room.',
      hint: 'Photo of the friends in a cozy spot with books.',
    },
    scholar_owl: {
      type: 'gift', title: 'The Owl\'s Recommendation',
      desc: () => 'Lend or give another member a book, song or show you think they would love, with a one-line note. They confirm when they get it.',
      hook: 'The scholar owl always knows exactly what you should read next.',
      hint: 'The recipient confirms they received it.',
    },
    quill: {
      type: 'bard', title: 'The Quill\'s Opening Line',
      desc: () => 'Write the first sentence of a novel about your fellowship.',
      hook: 'Every great book starts with a single quill stroke.',
      hint: 'One opening sentence.',
    },
    scroll: {
      type: 'trial', title: 'The Scroll\'s Riddle', crew: 2,
      desc: (_p, n) => `${crewWord(n)} unroll the scroll and answer its riddle.`,
      hook: 'The scroll crumbles to dust unless a clever reader answers it.',
      hint: 'The correct answer.',
      trial: { q: 'I have a spine but no bones, and leaves but no branches. What am I?', a: 'book|a book' },
    },
    candle: {
      type: 'relic', title: 'Light the Candle',
      desc: () => 'Photograph a cozy study light: a desk lamp, a candle, a reading light, a café lamp.',
      hook: 'Owls read by candlelight. So do heroes.',
      hint: 'Photo of a lamp or candle.',
    },
  },
  rose_garden: {
    rose_arbor: {
      type: 'gathering', title: 'The Rose Arbor', wantsPlace: true,
      desc: (p) => `Everyone gathers at ${at(p, 'a garden, park or flower shop')} and takes a group photo surrounded by flowers.`,
      hook: 'The arbor blooms only when the whole fellowship walks beneath it.',
      hint: 'Group photo with flowers or greenery.',
    },
    hedge_maze: {
      type: 'trial', title: 'The Hedge Maze', crew: 3,
      desc: (_p, n) => `${crewWord(n)} find your way out of the maze by answering its riddle together.`,
      hook: 'The maze rearranges itself for anyone who walks it alone.',
      hint: 'The correct answer.',
      trial: { q: 'The more of me there is, the less you see. What am I?', a: 'darkness|dark|the dark|fog' },
    },
    garden_fountain: {
      type: 'duet', title: 'The Garden Fountain', wantsPlace: true,
      desc: (p) => `Two of you sit by a fountain or water feature${p ? ` at ${p.title}` : ''}, each share one thing you are grateful for, and take a photo.`,
      hook: 'The fountain flows with thank-yous.',
      hint: 'Photo of the two near water.',
    },
    rosebud: {
      type: 'relic', title: 'The First Rosebud', crew: 2,
      desc: (_p, n) => `${crewWord(n)} find a flower that has not fully bloomed yet and photograph it together.`,
      hook: 'Rosebuds are promises the garden makes.',
      hint: 'Photo of a flower bud.',
    },
    butterfly: {
      type: 'relic', title: 'Follow the Butterfly',
      desc: () => 'Photograph something with bright wings or patterns: a butterfly, a painted wall, a patterned scarf.',
      hook: 'The butterfly knows every secret path in the garden.',
      hint: 'Photo of something colorful and patterned.',
    },
    watering_can: {
      type: 'bard', title: 'Water the Garden',
      desc: () => 'Write a thank-you note (two sentences) to someone in the fellowship for something small they did.',
      hook: 'Gratitude is the only water roses really need.',
      hint: 'A two-sentence thank-you.',
    },
  },
  lantern_festival: {
    sky_lanterns: {
      type: 'gathering', title: 'Release the Lanterns', wantsPlace: true,
      desc: (p) => `Everyone meets at ${at(p, 'a festival, market or lively spot in the evening')} and takes a group photo with the lights behind you.`,
      hook: 'A thousand lanterns rise when the whole fellowship lifts them together.',
      hint: 'Group photo in the evening with lights.',
    },
    lantern_boat: {
      type: 'duet', title: 'The Lantern Boat', crew: 3,
      desc: (_p, n) => `${crewWord(n)} fold a paper boat or lantern, write a wish on it, and photograph it held up together.`,
      hook: 'The lantern boats carry wishes down the river of light.',
      hint: 'Photo of a paper boat or lantern held by the friends.',
    },
    fireworks: {
      type: 'duet', title: 'Spark the Fireworks', wantsPlace: true,
      desc: (p) => `Two of you catch the brightest lights you can${p ? ` at ${p.title}` : ''}: neon, string lights, a light show. Jump in the photo mid-air.`,
      hook: 'Fireworks bloom for friends who jump at the same time.',
      hint: 'Photo of bright lights, ideally with a jump.',
    },
    paper_lantern: {
      type: 'relic', title: 'Find a Paper Lantern', crew: 2,
      desc: (_p, n) => `${crewWord(n)} find a lantern or a round hanging light and take a photo underneath it.`,
      hook: 'Every lantern in the city lights the way home.',
      hint: 'Photo of a lantern or hanging light.',
    },
    festival_drum: {
      type: 'trial', title: 'The Drum\'s Riddle',
      desc: () => 'Answer the riddle the festival drum beats out.',
      hook: 'The drum speaks in riddles between the beats.',
      hint: 'The correct answer.',
      trial: { q: 'You can hear me but never see me, and I only speak when spoken to. What am I?', a: 'echo|an echo' },
    },
    sparkler: {
      type: 'bard', title: 'Write with a Sparkler',
      desc: () => 'Write the one-word wish you would trace in the air with a sparkler, and one sentence about why.',
      hook: 'Sparkler wishes last only a second, but they count forever.',
      hint: 'A one-word wish and a reason.',
    },
  },
  swamp_hollow: {
    stump_house: {
      type: 'gathering', title: 'The Stump House Party', wantsPlace: true,
      desc: (p) => `Everyone meets at ${at(p, 'a laid-back hangout spot')} and takes the goofiest group photo you can manage.`,
      hook: 'Everybody is welcome at the stump house, especially the weird ones.',
      hint: 'Goofy group photo.',
    },
    lily_pond: {
      type: 'duet', title: 'Leap the Lily Pads', crew: 3,
      desc: (_p, n) => `${crewWord(n)} play hopscotch, leapfrog or a jumping game and capture one mid-jump photo.`,
      hook: 'Frogs never cross a pond alone.',
      hint: 'Photo of someone mid-jump.',
    },
    rope_swing: {
      type: 'duet', title: 'The Rope Swing', wantsPlace: true,
      desc: (p) => `Two of you find a swing${p ? ` at ${p.title}` : ' at a playground or park'} and photograph each other mid-swing.`,
      hook: 'The rope swing is the swamp\'s oldest tradition.',
      hint: 'Photo of someone on a swing.',
    },
    lily_frog: {
      type: 'trial', title: 'The Frog\'s Riddle', crew: 2,
      desc: (_p, n) => `${crewWord(n)} answer the riddle the frog croaks at you.`,
      hook: 'The frog will not budge until someone answers.',
      hint: 'The correct answer.',
      trial: { q: 'What has one head, one foot and four legs?', a: 'bed|a bed' },
    },
    will_o_wisp: {
      type: 'relic', title: 'Chase the Will-o\'-Wisp',
      desc: () => 'Photograph a mysterious little light: a glowing window, a reflection, a single bulb in the dark.',
      hook: 'The wisp leads curious heroes somewhere wonderful (eventually).',
      hint: 'Photo of a small mysterious light.',
    },
    cattails: {
      type: 'bard', title: 'Swamp Gossip',
      desc: () => 'Write the funniest thing that happened in your fellowship\'s group chat this week, retold as swamp gossip.',
      hook: 'The cattails whisper everything they hear.',
      hint: 'A short funny retelling.',
    },
  },
  unicorn_meadow: {
    unicorn: {
      type: 'gathering', title: 'Find the Unicorn', wantsPlace: true,
      desc: (p) => `Everyone meets at ${at(p, 'a big open field or park')} and takes a group photo galloping (or attempting to).`,
      hook: 'The unicorn only appears to a whole herd of friends.',
      hint: 'Group photo outdoors, people running or jumping.',
    },
    rainbow_falls: {
      type: 'duet', title: 'Rainbow Falls', crew: 3,
      desc: (_p, n) => `${crewWord(n)} find or make a rainbow (a sprinkler, a prism, a colorful wall, chalk) and take a photo with it.`,
      hook: 'Rainbows fall wherever friends laugh together.',
      hint: 'Photo with a rainbow or rainbow colors.',
    },
    wildflower_field: {
      type: 'gift', title: 'A Bunch of Wildflowers',
      desc: () => 'Give another member a small bunch of flowers or a flower drawing. They confirm when they get it.',
      hook: 'Wildflowers grow wherever kindness is scattered.',
      hint: 'The recipient confirms they received it.',
    },
    horseshoe: {
      type: 'trial', title: 'The Lucky Horseshoe',
      desc: () => 'Answer the riddle stamped on the lucky horseshoe.',
      hook: 'Luck favors the clever.',
      hint: 'The correct answer.',
      trial: { q: 'What runs around the whole yard without ever moving?', a: 'fence|a fence' },
    },
    daisy_chain: {
      type: 'relic', title: 'Make a Daisy Chain', crew: 2,
      desc: (_p, n) => `${crewWord(n)} link arms, pinkies or anything you can chain together and photograph the chain.`,
      hook: 'A daisy chain is strongest with more than one flower.',
      hint: 'Photo of something linked together, hands welcome.',
    },
    bluebird: {
      type: 'bard', title: 'The Bluebird\'s Song',
      desc: () => 'Write the happiest sentence you can about today.',
      hook: 'The bluebird sings whatever happy thing you tell it.',
      hint: 'One happy sentence.',
    },
  },
};

export const FALLBACK_CHAPTER_TEXT: Record<string, { title: string; narrative: string }> = {
  castle_gate: { title: 'The Gathering at the Gate', narrative: 'The castle gate creaks open. Before any quest can begin, the fellowship must prove they can find each other in a city of a million lights.' },
  enchanted_forest: { title: 'Whispers in the Wood', narrative: 'A trail of dimmed lanterns leads into the green places of the city, where the trees remember everything.' },
  dragon_peak: { title: 'The Thief on the Peak', narrative: 'At the top of the world the thief waits, and so does the last lantern. Only a fellowship that climbs together can reach it.' },
  royal_feast: { title: 'The Feast of Lanterns', narrative: 'The lights are home. The kingdom sets a long table, and every seat is saved for a friend.' },
  mermaid_lagoon: { title: 'Songs of the Lagoon', narrative: 'The lagoon has gone quiet. The mermaids lost their song, and only friends who sing together can find it.' },
  witch_cottage: { title: 'The Kettle Is On', narrative: 'A crooked cottage puffs cinnamon smoke. The friendly witch has a potion half-brewed and needs a few more hands.' },
  beanstalk_sky: { title: 'Up the Beanstalk', narrative: 'A beanstalk shot up overnight, right through the clouds. Somewhere up there is a clue, and a very large boot.' },
  fairy_glen: { title: 'The Glen of Small Favors', narrative: 'The fairies trade in tiny kindnesses. Do enough of them and the glen will tell you where the trail goes next.' },
  ice_palace: { title: 'The Frozen Hall', narrative: 'Frost has crept over the palace and stopped every clock. It melts for warmth, and nothing is warmer than friends.' },
  pirate_cove: { title: 'X Marks the Cove', narrative: 'A tattered map washes ashore with your names on it. The pirates of the cove want a crew, and they want yours.' },
  candy_village: { title: 'The Sugar-Coated Village', narrative: 'Everything in the village is sweet, including the villagers. They will share their secret for a little company.' },
  starlit_tower: { title: 'Wishes from the Tower', narrative: 'The stargazer of the tower has seen something in the sky. It only shows itself to friends who look up together.' },
  troll_bridge: { title: 'The Toll of the Troll', narrative: 'A grumpy troll guards the only bridge onward. Trolls hate crowds, riddles they cannot answer, and compliments.' },
  cloud_kingdom: { title: 'The Kingdom Above', narrative: 'The trail leads up into a kingdom of clouds, where everything floats and nobody is ever in a hurry.' },
  crystal_cave: { title: 'Into the Crystal Cave', narrative: 'Deep under the city a cave of crystals hums. Something precious glows at its heart, waiting to be found.' },
  owl_library: { title: 'The Owl Who Kept the Books', narrative: 'The scholar owl has read every book but one: the story of your fellowship. Time to give it something to read.' },
  rose_garden: { title: 'The Garden of Thank-Yous', narrative: 'The rose garden grows on gratitude. Lately it has wilted. Nothing a few kind words cannot fix.' },
  lantern_festival: { title: 'The Night of Lanterns', narrative: 'The whole city lights up for the festival. Every lantern carries a wish, and tonight the fellowship sends theirs skyward.' },
  swamp_hollow: { title: 'Down in the Hollow', narrative: 'In the muddy hollow, the outcasts throw the best parties. The frogs have saved you a seat.' },
  unicorn_meadow: { title: 'The Meadow of Wild Things', narrative: 'A unicorn was spotted in the meadow. Unicorns are shy, but they cannot resist friends having fun.' },
};

export const DEFAULT_HINT: Record<FbType, string> = {
  gathering: 'Group photo with most of the fellowship visible.',
  duet: 'Photo showing the members together doing the task.',
  relic: 'Photo of the thing described.',
  bard: 'A short piece of writing on the topic.',
  trial: 'The correct answer.',
  gift: 'The recipient confirms they received it.',
};

/** Extra region-agnostic missions per size, used when a reroll can't reach the LLM. */
export const ALTERNATES: Record<FbSize, FallbackSpec[]> = {
  large: [
    { type: 'gathering', title: 'The Round Table', wantsPlace: true, desc: (p) => `Everyone meets at ${at(p, 'someone\'s place')} and plays one game together, any game. Take a group photo mid-game.`, hook: 'Even kings settle things over a good game.', hint: 'Group photo of people playing a game.' },
    { type: 'gathering', title: 'The Long Walk', wantsPlace: true, desc: (p) => `Take a 20-minute walk all together${p ? ` around ${p.title}` : ''} and snap a group selfie at the halfway point.`, hook: 'Quests are mostly walking, and the best ones are walked together.', hint: 'Group selfie outdoors.' },
  ],
  medium: [
    { type: 'duet', title: 'A Feast for the Crew', wantsPlace: true, desc: (p, n) => `${crewWord(n)} split a snack or drink${p ? ` at ${p.title}` : ''} and photograph it before the first bite.`, hook: 'Bread broken together tastes twice as good.', hint: 'Photo of food or drinks shared by the friends.' },
    { type: 'duet', title: 'Mirror Match', desc: (_p, n) => `${crewWord(n)} strike the exact same pose somewhere fun and take one photo of it.`, hook: 'Matching knights confuse any dragon.', hint: 'Friends in matching poses.' },
    { type: 'gift', title: 'A Note in the Satchel', desc: () => 'Write a short kind note for another member and give it to them in person. They confirm when they read it.', hook: 'Some magic is just ink and honesty.', hint: 'The recipient confirms.' },
  ],
  small: [
    { type: 'relic', title: 'The Colored Relic', desc: (_p, n) => `${crewWord(n)} photograph something in the wild that matches ${n > 1 ? 'one of your' : 'your'} crayon colors exactly.`, hook: 'Your color is hiding everywhere, waiting to be found.', hint: 'Photo of an object in the player\'s color.' },
    { type: 'bard', title: 'Tavern Review', desc: (_p, n) => `${crewWord(n)} write a three-sentence fairy-tale review of the last place you ate${n > 1 ? ' together' : ''}.`, hook: 'Every inn deserves a ballad, good or bad.', hint: 'A short playful review.' },
    { type: 'relic', title: 'The Sky Today', desc: (_p, n) => `${crewWord(n)} photograph the sky right now${n > 1 ? ', side by side' : ', wherever you are'}.`, hook: 'The sky keeps a diary of every quest.', hint: 'Photo of the sky.' },
  ],
};

export const FALLBACK_TITLES = ['The Lantern Thief', 'The Stolen Crayons', 'The Sleeping Dragon', 'The Lost Song', 'The Clockwork Crown'];

/** Crew of a spec slot for copy that mentions it ("Three of you"). Exposed for the mock engine. */
export function specCrew(templateId: string, regionId: string): number | undefined {
  return FALLBACK[templateId]?.[regionId]?.crew;
}
