// Owner: EV. E6 UT demo: "The Legend of the Forty Acres" — a handcrafted 4-chapter book on real UT Austin landmarks.
// Pure data, NO imports: used by generate-storyline (demo: 'ut') AND by the app's mock mode via fixtures/ut-campus.ts.
//
// Coordinates: VERIFIED with SerpApi google_maps on 2026-10-25 (lat/lng below are SerpApi's pins; `verified.delta_m`
// = how far our first estimate was).
// At generation time the function looks every landmark up again (cached) and prefers SerpApi's coordinates when
// they agree (within UT_VERIFY_MAX_M); these values are the offline fallback.

export interface UTPlace {
  key: string;
  title: string;
  address: string;
  category: string;
  lat: number;
  lng: number;
  query: string; // SerpApi google_maps query used to verify
  verified?: { by: 'serpapi_google_maps'; title: string; place_id?: string; delta_m: number; at: string };
}

export interface UTMission {
  region_id: string;
  type: 'gathering' | 'duet' | 'relic' | 'bard' | 'trial' | 'gift';
  title: string;
  description: string;
  story_hook: string;
  place: string | null; // UTPlace key
  trial_question?: string;
  trial_answer?: string; // alternates separated by "|"
  verification_hint: string;
  crew?: 1 | 2 | 3; // medium: 2 (default) or 3 = trio; small: 2 = duet, 1 = the page's one solo. Description starts with {Crew}.
}

export interface UTChapter {
  template_id: 'castle_gate' | 'enchanted_forest' | 'dragon_peak' | 'royal_feast';
  title: string;
  narrative: string;
  missions: UTMission[];
}

export const UT_VERIFY_MAX_M = 150;
/** V2: the UT Campus Demo shows each landmark's distance but never blocks a proof on location (storylines.geo_enforced). */
export const UT_GEO_ENFORCED = false;
export const UT_CENTER = { lat: 30.2849, lng: -97.7341, label: 'UT Austin' };

export const UT_PLACES: Record<string, UTPlace> = {
  tower: {
    key: 'tower', title: 'UT Tower (Main Building)', address: '110 Inner Campus Drive, Austin, TX 78712', category: 'Landmark',
    lat: 30.286217, lng: -97.739388, query: 'UT Tower Main Building University of Texas at Austin',
    verified: { by: 'serpapi_google_maps', title: 'UT Tower', place_id: 'ChIJk39b73m1RIYR8Tsvix5ODtM', delta_m: 2, at: '2026-10-25' },
  },
  littlefield: {
    key: 'littlefield', title: 'Littlefield Fountain', address: 'South Mall, University of Texas, Austin, TX 78705', category: 'Fountain',
    lat: 30.28386, lng: -97.739601, query: 'Littlefield Fountain Austin',
    verified: { by: 'serpapi_google_maps', title: 'Littlefield Fountain', place_id: 'ChIJBZzwr521RIYRUPoKuU-VmV0', delta_m: 11, at: '2026-10-25' },
  },
  turtle_pond: {
    key: 'turtle_pond', title: 'Turtle Pond', address: 'Near Biological Laboratories, UT Austin, Austin, TX 78712', category: 'Pond',
    lat: 30.286925, lng: -97.739495, query: 'Turtle Pond, Austin, TX 78712',
    verified: { by: 'serpapi_google_maps', title: 'UT Turtle Pond', place_id: 'ChIJdR3tL521RIYRPTSAPAlulsU', delta_m: 60, at: '2026-10-25' },
  },
  blanton: {
    key: 'blanton', title: 'Blanton Museum of Art', address: '200 E Martin Luther King Jr Blvd, Austin, TX 78712', category: 'Art museum',
    lat: 30.280811, lng: -97.737684, query: 'Blanton Museum of Art',
    verified: { by: 'serpapi_google_maps', title: 'Blanton Museum of Art', place_id: 'ChIJOzfaZJ61RIYRbcc8dXvgz74', delta_m: 2, at: '2026-10-25' },
  },
  hrc: {
    key: 'hrc', title: 'Harry Ransom Center', address: '300 W 21st St, Austin, TX 78712', category: 'Museum & library',
    lat: 30.284332, lng: -97.741221, query: 'Harry Ransom Center',
    verified: { by: 'serpapi_google_maps', title: 'Harry Ransom Center', place_id: 'ChIJn4-5g521RIYR1cD_b2nbbB0', delta_m: 12, at: '2026-10-25' },
  },
  pcl: {
    key: 'pcl', title: 'Perry-Castañeda Library (PCL)', address: '101 E 21st St, Austin, TX 78712', category: 'Library',
    lat: 30.282657, lng: -97.738208, query: 'Perry-Castaneda Library',
    verified: { by: 'serpapi_google_maps', title: 'Perry-Castañeda Library', place_id: 'ChIJf7vhapy1RIYRjjjR8husUdI', delta_m: 11, at: '2026-10-25' },
  },
  gdc: {
    key: 'gdc', title: 'Gates Dell Complex (Speedway)', address: '2317 Speedway, Austin, TX 78712', category: 'Campus building',
    lat: 30.286252, lng: -97.736617, query: 'Gates Dell Complex',
    verified: { by: 'serpapi_google_maps', title: 'Gates-Dell Complex', place_id: 'ChIJcTd6n5y1RIYRwfBnY4RaTqU', delta_m: 13, at: '2026-10-25' },
  },
  gregory: {
    key: 'gregory', title: 'Gregory Gym', address: '2101 Speedway, Austin, TX 78712', category: 'Gym',
    lat: 30.28425, lng: -97.736801, query: 'Gregory Gymnasium UT Austin',
    verified: { by: 'serpapi_google_maps', title: 'Gregory Gym', place_id: 'ChIJAQAAwJu1RIYR0Uxbdso1umU', delta_m: 20, at: '2026-10-25' },
  },
  dkr: {
    key: 'dkr', title: 'DKR-Texas Memorial Stadium', address: '2139 San Jacinto Blvd, Austin, TX 78712', category: 'Stadium',
    lat: 30.28354, lng: -97.732519, query: 'Darrell K Royal Texas Memorial Stadium',
    verified: { by: 'serpapi_google_maps', title: 'Darrell K Royal–Texas Memorial Stadium', place_id: 'ChIJCZq4XJq1RIYRWy0bniIjSCI', delta_m: 18, at: '2026-10-25' },
  },
  lbj: {
    key: 'lbj', title: 'LBJ Presidential Library', address: '2313 Red River St, Austin, TX 78705', category: 'Presidential library',
    lat: 30.285856, lng: -97.729254, query: 'LBJ Presidential Library',
    verified: { by: 'serpapi_google_maps', title: 'LBJ Presidential Library', place_id: 'ChIJ-WVL_5C1RIYRfDHlppbnLYE', delta_m: 8, at: '2026-10-25' },
  },
  coop: {
    // V2: "The Harvest Horns" (seasonal pumpkin display across Guadalupe from the Co-op). Pin = our estimate until the
    // live SerpApi check confirms it (generate-storyline prefers SerpApi's pin within UT_VERIFY_MAX_M).
    key: 'coop', title: 'University Co-op', address: '2246 Guadalupe St, Austin, TX 78705', category: 'Bookstore',
    lat: 30.28563, lng: -97.74213, query: 'University Co-op Guadalupe St Austin',
  },
  union: {
    key: 'union', title: 'Texas Union', address: '2308 Whitis Ave, Austin, TX 78712', category: 'Student union',
    lat: 30.286661, lng: -97.741163, query: 'Texas Union Building UT Austin',
    verified: { by: 'serpapi_google_maps', title: 'Texas Union', place_id: 'ChIJvUZC33e1RIYR9vcE4x18F7c', delta_m: 9, at: '2026-10-25' },
  },
};

export const UT_BOOK: { title: string; synopsis: string; theme_tags: string[]; chapters: UTChapter[] } = {
  title: 'The Legend of the Forty Acres',
  synopsis:
    "The Tower's light has gone dark and the Forty Acres has forgotten its songs. A fellowship of Longhorns must wake " +
    'the campus landmark by landmark, solving its old riddles before the last bell tolls.',
  theme_tags: ['museums', 'photography', 'live_music'],
  chapters: [
    {
      // V2 (V1-PLAN): the judging-table chapter. Group play first: 0 solo missions on this page.
      template_id: 'castle_gate',
      title: 'The Forty Acres Awaken',
      narrative:
        'High above the South Mall, the great Tower sleeps with its clock hands frozen. Legend says the Forty Acres ' +
        'wakes only when a fellowship plays, sketches and cheers together beneath it.',
      missions: [
        {
          region_id: 'castle', type: 'gathering', title: 'The Great Tournament', place: null,
          description: 'Gather the whole fellowship and win any video game together: co-op, versus the computer, anything goes. Photograph the victory screen with everyone cheering in front of it.',
          story_hook: 'Every legend on the Forty Acres begins with a tournament, and every tournament ends in a cheer.',
          verification_hint: 'A screen showing a video game win, victory or results screen, with a group of friends cheering nearby.',
        },
        {
          region_id: 'drawbridge', type: 'duet', title: 'Salute the Tower', place: 'tower', crew: 3,
          description: '{Crew} take a selfie together with the UT Tower rising behind you. Salute it like knights reporting for duty.',
          story_hook: 'The drawbridge lowers only for those who greet the Tower properly.',
          verification_hint: 'A selfie of friends outdoors with the UT Tower (a tall clock tower) behind them.',
        },
        {
          region_id: 'banners', type: 'duet', title: 'The Harvest Horns', place: 'coop', crew: 2,
          description: '{Crew} find the seasonal pumpkin display across from the University Co-op on Guadalupe Street and throw your best Hook ’em among the pumpkins. Snap a photo together.',
          story_hook: 'The banners of autumn fly orange, and so do the horns of a true Longhorn.',
          verification_hint: 'Two people making the Hook ’em hand sign (index and pinky up) next to pumpkins.',
        },
        {
          region_id: 'tower_flag', type: 'relic', title: 'The Royal Portraitist', place: 'blanton', crew: 2,
          description: '{Crew} hand-sketch the Blanton Museum of Art together, then photograph your drawing held up with the museum behind it.',
          story_hook: 'No flag rises over the realm until the royal portraitist has captured it.',
          verification_hint: 'A hand-drawn sketch on paper, held up in front of a museum building.',
        },
        {
          region_id: 'moon', type: 'trial', title: "The Turtle Keepers' Riddle", place: 'turtle_pond', crew: 2,
          description: '{Crew} visit Turtle Pond, just north of the Tower, count the sunbathing shells and answer the keepers’ riddle together.',
          story_hook: 'The moon rises over the pond where the oldest Longhorn secrets swim.',
          trial_question: "Most of Turtle Pond's residents are one kind of turtle, named for the red stripe behind each eye. What are they called?",
          trial_answer: 'red-eared slider|red eared slider|red-eared sliders|red eared sliders|slider|sliders|red-eared slider turtle|red-eared slider turtles',
          verification_hint: "The turtle's common name.",
        },
        {
          region_id: 'moat', type: 'relic', title: 'March the South Mall', place: 'littlefield', crew: 2,
          description: '{Crew} walk down the South Mall from the Tower to Littlefield Fountain, then take a photo together with the fountain behind you.',
          story_hook: 'The old road between tower and fountain only opens for pairs.',
          verification_hint: 'Two people with a large fountain (bronze figures, horses) behind them.',
        },
      ],
    },
    {
      template_id: 'enchanted_forest',
      title: 'Whispers by the Turtle Pond',
      narrative:
        "The Tower's chime drifts north, where turtles keep the campus's oldest secrets. To learn them, the fellowship " +
        'must visit the keepers of pictures, pages and light.',
      missions: [
        {
          region_id: 'great_tree', type: 'gathering', title: 'The Turtle Council', place: 'turtle_pond',
          description: 'Everyone meets at Turtle Pond and takes a group photo by the water. Bonus glory if a turtle photobombs.',
          story_hook: 'The turtles have seen every class since the pond was dug, and they never gossip.',
          verification_hint: 'Group photo by a small pond with greenery.',
        },
        {
          region_id: 'mushroom_ring', type: 'duet', title: 'The Chapel of Color', place: 'blanton',
          description: "{Crew} visit the Blanton and find Ellsworth Kelly's “Austin”, the white stone chapel with colored windows. Take a photo together outside it.", crew: 3,
          story_hook: 'A chapel built of pure color, waiting for two travelers to notice.',
          verification_hint: 'Two people outside a small white stone building with colored glass windows.',
        },
        {
          region_id: 'river', type: 'trial', title: 'The First Photograph', place: 'hrc',
          description: 'Two of you visit the Harry Ransom Center, where the oldest surviving camera photograph is kept, and answer the riddle together.',
          story_hook: 'In a quiet vault lies the very first picture ever caught by a camera.',
          trial_question: 'The Ransom Center keeps the oldest surviving camera photograph, “View from the Window at Le Gras”. Which French inventor made it?',
          trial_answer: 'Niepce|Niépce|Nicephore Niepce|Nicéphore Niépce|Joseph Nicephore Niepce',
          verification_hint: 'The inventor’s name.',
        },
        {
          region_id: 'fireflies', type: 'relic', title: 'Catch the Colored Light', place: 'blanton', crew: 2,
          description: '{Crew} hunt for colored light near the Blanton: the stained glass of “Austin”, a bright artwork or a glowing sign. Photograph your best catch.',
          story_hook: 'Each spark of color is a firefly that escaped the chapel.',
          verification_hint: 'Photo of colored glass, colorful art or a glowing light.',
        },
        {
          region_id: 'owl', type: 'bard', title: 'The Owl of the Stacks', place: 'pcl', crew: 1,
          description: 'At the PCL, find the strangest book title you can and write a one-sentence fairy-tale blurb for it.',
          story_hook: 'The library owl trades shortcuts for a good story.',
          verification_hint: 'A one-sentence playful book blurb.',
        },
        {
          region_id: 'path', type: 'relic', title: 'The Speedway Path', place: 'gdc',
          description: '{Crew} walk the Speedway Mall to the Gates Dell Complex and photograph the long path stretching ahead of you.', crew: 2,
          story_hook: 'The path rearranges itself for anyone who walks it curious.',
          verification_hint: 'Photo of a wide campus walkway or path.',
        },
      ],
    },
    {
      template_id: 'dragon_peak',
      title: "The Longhorn's Lair",
      narrative:
        'East of the Tower, a great beast stirs inside its stone bowl: the Longhorn of legend. Only a fellowship brave ' +
        'enough to climb, solve and share can calm it.',
      missions: [
        {
          region_id: 'dragon', type: 'gathering', title: 'Face the Longhorn', place: 'dkr',
          description: 'Everyone meets outside DKR-Texas Memorial Stadium and takes a group photo in your fiercest Hook ’em pose.',
          story_hook: 'The Longhorn respects only those who show up together.',
          verification_hint: 'Group photo outside a large stadium, hand signs welcome.',
        },
        {
          region_id: 'mountain', type: 'duet', title: 'Climb the Library Steps', place: 'lbj',
          description: '{Crew} climb the wide plaza steps of the LBJ Library and photograph the campus view from the top together.', crew: 3,
          story_hook: 'From the summit of the steps, you can see the whole quest below.',
          verification_hint: 'Photo from a high plaza or steps, two people if possible.',
        },
        {
          region_id: 'treasure', type: 'gift', title: 'Burnt Orange Treasure', place: null,
          description: 'Give another member something burnt orange: a sticker, a snack, a pen. They confirm when they get it.',
          story_hook: 'A Longhorn hoards. A fellowship shares.',
          verification_hint: 'The recipient confirms they received it.',
        },
        {
          region_id: 'clouds', type: 'trial', title: "The President's Number", place: 'lbj',
          description: '{Crew} head to the LBJ Library and answer the riddle thundered from the storm clouds.', crew: 2,
          story_hook: 'The clouds part only for those who know their history.',
          trial_question: 'The LBJ Library honors Lyndon Baines Johnson. Which number president of the United States was he?',
          trial_answer: '36|36th|thirty sixth|thirty-sixth|the 36th',
          verification_hint: 'The correct number.',
        },
        {
          region_id: 'shield', type: 'trial', title: "The Stadium's Name", place: 'dkr', crew: 2,
          description: '{Crew} stand outside the stadium and answer the riddle of its name together.',
          story_hook: 'Every shield bears the name of a legend.',
          trial_question: 'DKR-Texas Memorial Stadium is named for a legendary Longhorns coach. What do the letters D. K. R. stand for?',
          trial_answer: 'Darrell K Royal|Darrell K. Royal|Darrell Royal|Darrell Keith Royal',
          verification_hint: "The coach's full name.",
        },
        {
          region_id: 'lantern', type: 'relic', title: "Gregory's Lantern", place: 'gregory', crew: 1,
          description: 'Photograph the front of Gregory Gym, the old stone hall on Speedway.',
          story_hook: 'The last lantern hangs where champions train.',
          verification_hint: 'Photo of a large brick or stone gym building.',
        },
      ],
    },
    {
      template_id: 'royal_feast',
      title: 'The Feast at the Union',
      narrative:
        'The Tower glows again and the campus remembers its songs. The fellowship is summoned to the Union, where every ' +
        'legend on the Forty Acres ends with a crowded table.',
      missions: [
        {
          region_id: 'feast_table', type: 'gathering', title: 'Feast at the Union', place: 'union',
          description: 'Share a meal or snacks all together at the Texas Union and take a group photo with the table full.',
          story_hook: 'Every tale worth telling ends at a crowded table.',
          verification_hint: 'Group photo with food on a table indoors.',
        },
        {
          region_id: 'throne', type: 'duet', title: 'Royal Portrait at the Fountain', place: 'littlefield',
          description: '{Crew} strike your most royal pose in front of Littlefield Fountain and take a portrait together.', crew: 3,
          story_hook: 'The throne of the Forty Acres is shared, as all good thrones are.',
          verification_hint: 'Two people posing grandly in front of a fountain.',
        },
        {
          region_id: 'chandelier', type: 'trial', title: 'The Prickly Stage', place: 'union',
          description: 'Two of you search the Texas Union for its famous little music room and answer the riddle together.',
          story_hook: 'The chandelier only lights when the bards are named.',
          trial_question: 'Inside the Texas Union hides a legendary little live-music venue named after a prickly desert plant. What is it called?',
          trial_answer: 'Cactus Cafe|Cactus Café|the Cactus Cafe|Cactus',
          verification_hint: "The venue's name.",
        },
        {
          region_id: 'goblet', type: 'relic', title: 'Raise the Goblet', place: 'union',
          description: '{Crew} raise a drink anywhere in the Texas Union and photograph the toast. Any cup is a goblet if you hold it proudly.', crew: 2,
          story_hook: 'Fill the goblet and toast the tale.',
          verification_hint: 'Photo of a drink.',
        },
        {
          region_id: 'cake', type: 'relic', title: 'Sweet of the Forty Acres', place: null, crew: 2,
          description: '{Crew} split a dessert or sweet treat on or near campus and photograph it before it vanishes.',
          story_hook: 'One shared bite and every curse is lifted.',
          verification_hint: 'Photo of a dessert or sweet snack.',
        },
        {
          region_id: 'lute', type: 'bard', title: 'The Last Verse', place: null, crew: 1,
          description: 'Write a four-word toast to your fellowship. The bards will sing it at the feast.',
          story_hook: 'The bard needs one last verse to end the legend.',
          verification_hint: 'A short toast.',
        },
      ],
    },
  ],
};
