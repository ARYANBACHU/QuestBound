// Owner: AB. Muse's reactions to interest picks during onboarding (a local dictionary — no LLM call).
const PAIRS: Record<string, string> = {
  'board_games+hiking': 'Board games AND hiking? A strategist with strong calves.',
  'coffee+study_spots': 'Coffee and study spots. You run on espresso and quiet ambition.',
  'karaoke+live_music': 'Live music and karaoke — you don’t just watch the show, you steal it.',
  'brunch+thrifting': 'Brunch, then thrifting. A Saturday of impeccable taste.',
  'climbing+gym': 'Climbing and the gym. The dragon should be nervous.',
  'desserts+hiking': 'Hiking and desserts. You earn every slice.',
  'museums+photography': 'Museums and photography — you collect beautiful moments.',
  'escape_rooms+video_games': 'Escape rooms and video games. No puzzle survives you.',
  'cooking+food_trucks': 'Cooking and food trucks. A connoisseur of every kitchen.',
  'parks+sunsets': 'Picnics at sunset. Truly the most fairy-tale of hearts.',
  'arcades+comedy': 'Arcades and comedy. You collect tickets and laughs.',
  'bookstores+coffee': 'Coffee and bookstores. The classic wizard’s apprentice.',
  'parks+volunteering': 'Parks and volunteering. The forest spirits already like you.',
  'sunsets+swimming': 'A swim, then the sunset. You know how to end a day.',
};

const SINGLES: Record<string, string> = {
  coffee: 'Coffee! Every great quest begins over something warm.',
  food_trucks: 'Food trucks — the traveling taverns of the realm.',
  brunch: 'Brunch: the noblest of meals.',
  desserts: 'A sweet tooth. I’ll hide a cake in the story somewhere.',
  cooking: 'A cook! Fellowships march on their stomachs.',
  live_music: 'Live music. The bards of Austin await you.',
  karaoke: 'Karaoke. Bold. Very bold.',
  comedy: 'Comedy shows — laughter is a kind of magic too.',
  hiking: 'Hiking! The hills around here have stories.',
  swimming: 'A swimmer. The springs are calling.',
  parks: 'Parks and picnics. A blanket is just a tiny kingdom.',
  sunsets: 'Sunset chaser. I’ll paint you some gold.',
  board_games: 'Board games. A tactician in our midst.',
  video_games: 'Video games — you’ve saved a few kingdoms already.',
  arcades: 'Arcades! Tickets are the coin of a merrier realm.',
  escape_rooms: 'Escape rooms. Riddles fear you.',
  museums: 'Museums. You like stories older than mine.',
  art: 'An artist! You’ll appreciate a good coloring page.',
  bookstores: 'Bookstores. Of course. We are going to get along.',
  thrifting: 'Thrifting — treasure hunting with receipts.',
  pickup_sports: 'Pickup sports. Teamwork, with sweat.',
  gym: 'Working out. Someone has to carry the treasure.',
  climbing: 'Climbing! The Dragon’s Peak just got easier.',
  study_spots: 'Study spots. A scholar of quiet corners.',
  photography: 'Photography — the Magic Mirror will love you.',
  volunteering: 'Volunteering. The kindest heroes are the real ones.',
};

/** Muse's reaction to the interest just picked, considering what was already chosen. */
export function interestQuip(picked: string, all: string[]): string {
  for (const other of all) {
    if (other === picked) continue;
    const key = [picked, other].sort().join('+');
    if (PAIRS[key]) return PAIRS[key];
  }
  if (all.length === 3) return `${SINGLES[picked] ?? 'Noted!'} That's enough to begin — add more if you like.`;
  if (all.length === 8) return 'Eight! A hero of many passions. That’s the most my quill can hold.';
  return SINGLES[picked] ?? 'Noted, in my finest ink.';
}
