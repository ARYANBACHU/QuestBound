// Owner: EV. Interest ids (mirror of shared/theme.ts INTERESTS) -> SerpApi queries + story words.
// Pure code, no I/O: used by generate-storyline (interest analysis) and reroll-mission.
import type { MemberCtx } from './types.ts';

export interface InterestInfo { label: string; query: string; events?: string; noun: string }

export const INTEREST_INFO: Record<string, InterestInfo> = {
  coffee: { label: 'Coffee & cafés', query: 'cozy coffee shop', noun: 'coffeehouse' },
  food_trucks: { label: 'Food trucks', query: 'food truck park', noun: 'food truck court' },
  brunch: { label: 'Brunch', query: 'brunch spot', noun: 'brunch hall' },
  desserts: { label: 'Desserts', query: 'dessert shop', noun: 'sweet shop' },
  cooking: { label: 'Cooking together', query: 'farmers market', noun: 'market' },
  live_music: { label: 'Live music', query: 'live music venue', events: 'live music', noun: 'music hall' },
  karaoke: { label: 'Karaoke', query: 'karaoke bar', noun: 'singing tavern' },
  comedy: { label: 'Comedy shows', query: 'comedy club', events: 'comedy show', noun: 'jester stage' },
  hiking: { label: 'Hiking', query: 'hiking trail', noun: 'trail' },
  swimming: { label: 'Swimming', query: 'swimming hole', noun: 'spring' },
  parks: { label: 'Parks & picnics', query: 'park', noun: 'green' },
  sunsets: { label: 'Sunset spots', query: 'scenic overlook', noun: 'overlook' },
  board_games: { label: 'Board games', query: 'board game cafe', noun: 'game hall' },
  video_games: { label: 'Video games', query: 'video game lounge', noun: 'arcade keep' },
  arcades: { label: 'Arcades', query: 'arcade bar', noun: 'arcade' },
  escape_rooms: { label: 'Escape rooms', query: 'escape room', noun: 'puzzle vault' },
  museums: { label: 'Museums', query: 'museum', events: 'museum exhibit', noun: 'hall of wonders' },
  art: { label: 'Making art', query: 'art studio class', events: 'art workshop', noun: 'atelier' },
  bookstores: { label: 'Bookstores', query: 'independent bookstore', noun: 'library tower' },
  thrifting: { label: 'Thrifting', query: 'thrift store', noun: 'curio shop' },
  pickup_sports: { label: 'Pickup sports', query: 'public sports courts', noun: 'jousting field' },
  gym: { label: 'Working out', query: 'outdoor fitness park', noun: 'training yard' },
  climbing: { label: 'Climbing', query: 'climbing gym', noun: 'climbing wall' },
  study_spots: { label: 'Study spots', query: 'quiet study cafe', noun: 'scriptorium' },
  photography: { label: 'Photography', query: 'photogenic landmark', noun: 'landmark' },
  volunteering: { label: 'Volunteering', query: 'volunteer opportunities', events: 'volunteer', noun: 'guild hall' },
};

export function interestLabel(id: string): string {
  return INTEREST_INFO[id]?.label ?? id.replace(/_/g, ' ');
}

export interface InterestAnalysis {
  counts: Record<string, number>;
  shared: string[]; // interests held by >=2 members, most common first
  unique: Record<string, string[]>; // user_id -> interests only they hold
  themes: string[]; // up to 3 interest ids to ground with SerpApi
  preferFree: boolean;
}

/** Count interests, split shared/unique, pick search themes (shared first, then one unique per member). */
export function analyzeInterests(members: MemberCtx[], maxThemes = 3): InterestAnalysis {
  const counts: Record<string, number> = {};
  for (const m of members) for (const i of new Set(m.interests)) counts[i] = (counts[i] ?? 0) + 1;
  const shared = Object.keys(counts).filter((k) => counts[k] >= 2).sort((a, b) => counts[b] - counts[a]);
  const unique: Record<string, string[]> = {};
  for (const m of members) unique[m.user_id] = m.interests.filter((i) => counts[i] === 1);

  const themes: string[] = [];
  const add = (i: string) => { if (!themes.includes(i) && INTEREST_INFO[i]) themes.push(i); };
  // Top 2 shared interests, then round-robin one unique interest per member, then top up from anything.
  shared.slice(0, Math.max(1, maxThemes - 1)).forEach(add);
  for (const m of members) {
    if (themes.length >= maxThemes) break;
    const u = unique[m.user_id]?.find((i) => INTEREST_INFO[i] && !themes.includes(i));
    if (u) add(u);
  }
  for (const i of Object.keys(counts).sort((a, b) => counts[b] - counts[a])) {
    if (themes.length >= maxThemes) break;
    add(i);
  }
  // Nobody picked anything: Muse's default trio.
  for (const d of ['coffee', 'parks', 'live_music']) { if (themes.length >= maxThemes) break; add(d); }

  const cheap = members.filter((m) => m.budget === 'free' || m.budget === '$').length;
  return { counts, shared, unique, themes: themes.slice(0, maxThemes), preferFree: cheap * 2 >= Math.max(1, members.length) };
}
