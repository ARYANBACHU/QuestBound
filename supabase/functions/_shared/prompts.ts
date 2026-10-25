// Owner: EV. Every prompt Muse uses, in one file so they're easy to tune.
// AB's wizard-chat imports MUSE_PERSONA from here.
import { interestLabel } from './interests.ts';
import type { PointsDifficulty } from './points.ts';
import {
  type BookRecap, type MemberCtx, type Mission, type Page, type Place, SIZE_RULES, TEMPLATE_META,
  TEMPLATE_REGIONS, type TemplateId,
} from './types.ts';

export const MUSE_PERSONA =
  'You are Muse, a warm, witty wizard-narrator who writes fairy tales about real friend groups. You speak in short, ' +
  'vivid sentences with gentle humor. You never mock anyone. You turn ordinary real-world activities (getting ' +
  'coffee, walking a bridge, playing board games) into chapters of a fairy tale. You care about one thing: getting ' +
  'friends to spend real time together.';

// ---------------------------------------------------------------- storyline

export interface SequelCtx {
  prior_title: string;
  recap: BookRecap | null;
  loved_types: string[]; // mission types completed most / fastest
  skipped_types: string[]; // types never done or slowest
  photo_count: number;
  chat_snippets: string[]; // last ~40 chat texts (oldest -> newest)
  callbacks: string[]; // specific moments (story lines) Muse should call back to
}

export interface StoryCtx {
  mode: 'first' | 'sequel';
  fellowshipName: string;
  areaLabel: string;
  members: MemberCtx[];
  shared: string[];
  themes: string[]; // interest ids grounded with SerpApi
  unique: Record<string, string[]>;
  places: Place[]; // index i => "P{i}"
  chapters: TemplateId[];
  preferFree: boolean;
  difficulty: PointsDifficulty;
  sequel?: SequelCtx;
}

/** How hard the fellowship asked the book to be (E2). Points scale too: easy ×0.75, hard ×1.5 (set in code). */
export const DIFFICULTY_TEXT: Record<PointsDifficulty, string> = {
  easy: 'EASY — cozy and close. Every task is within a ~10 minute walk, free or nearly free, and takes under 45 minutes. ' +
    'Prefer the nearest places. Simple photos, gentle riddles.',
  normal: 'NORMAL — a fun afternoon. Tasks within a short ride, cheap, up to ~1.5 hours.',
  hard: 'HARD — an epic quest. More ambitious tasks: farther places across town, longer outings (up to ~2.5 hours), ' +
    'trickier riddles, more creative photos. Still safe, legal and cheap.',
};

export interface Outline {
  title: string;
  synopsis: string;
  theme_tags: string[];
  chapters: { chapter_number: number; template_id: TemplateId; title: string; narrative: string }[];
}

const SAFETY_RULES = [
  'NO dangerous, illegal, expensive (over ~$15 per person), romantic or flirty tasks.',
  'Never ask anyone to photograph, approach or involve strangers. Photos show the fellowship, places or objects.',
  'Every task must be doable in under 2 hours, in public or at home, by ordinary college students.',
].join('\n- ');

function sizeRulesText(): string {
  return [
    `large regions -> type "gathering" (the WHOLE fellowship together; proof is a group photo)`,
    `medium regions -> one of ${SIZE_RULES.medium.types.map((t) => `"${t}"`).join(', ')} (exactly 2 members together). ` +
      `duet = two people do something together (photo). gift = one member makes/buys a tiny surprise for another, who confirms. ` +
      `trial = a co-op riddle two people solve on location.`,
    `small regions -> one of ${SIZE_RULES.small.types.map((t) => `"${t}"`).join(', ')} (solo). relic = find/photograph ` +
      `a specific thing. bard = write a short verse/story/review (text). trial = a riddle with one short answer.`,
  ].join('\n- ');
}

export function placeLines(places: Place[]): string {
  if (!places.length) return '(no real places found — invent no names; use generic spots like "a nearby park")';
  return places
    .map((p, i) => {
      const bits = [p.category, p.address, p.when ? `when: ${p.when}` : '', p.rating ? `★${p.rating}` : '']
        .filter(Boolean)
        .join(' · ');
      return `P${i}: ${p.title}${p.source === 'google_events' ? ' [EVENT]' : ''} — ${bits}`;
    })
    .join('\n');
}

export function memberLines(members: MemberCtx[], unique: Record<string, string[]>): string {
  return members
    .map((m) => {
      const u = unique[m.user_id] ?? [];
      return `- ${m.name} ${m.crest_emoji} (crest: ${m.crest_title}; budget ${m.budget}) — loves ${
        m.interests.map(interestLabel).join(', ') || 'surprises'
      }${u.length ? `; only they love: ${u.map(interestLabel).join(', ')}` : ''}`;
    })
    .join('\n');
}

export function storylineSystem(mode: 'first' | 'sequel' = 'first'): string {
  return `${MUSE_PERSONA}

You are writing ${mode === 'sequel' ? 'the SEQUEL to a book this fellowship already lived' : 'the first book'} of a fairy-tale coloring book
that a real friend group will live out in their real city. Every region of every coloring page is one real-world mission.

SIZE RULES (never break):
- ${sizeRulesText()}

SAFETY RULES:
- ${SAFETY_RULES}

STYLE: warm, playful, a little theatrical, never cringe. Short sentences. Sentence case titles (2-6 words).
Respond with JSON only. No markdown, no commentary.`;
}

/** The shared context block every storyline call sees. */
export function storylineUser(ctx: StoryCtx, includePlaces = true): string {
  return `FELLOWSHIP: "${ctx.fellowshipName}" in ${ctx.areaLabel} (${ctx.members.length} members)
${memberLines(ctx.members, ctx.unique)}
Shared interests: ${ctx.shared.map(interestLabel).join(', ') || 'none yet — find common ground'}
Budget: ${ctx.preferFree ? 'most members are on a tight budget — strongly prefer FREE places and events' : 'modest; cheap is better than fancy'}
Difficulty: ${DIFFICULTY_TEXT[ctx.difficulty]}

${includePlaces ? `REAL PLACES & EVENTS NEARBY (from Google Maps / Google Events — reference them by index):
${placeLines(ctx.places)}` : 'REAL PLACES: real nearby places are attached later, per chapter. Keep the outline about the city in general.'}

CHAPTERS (in order): ${ctx.chapters.map((c, i) => `${i + 1}. ${c} (${TEMPLATE_META[c].title}: ${TEMPLATE_META[c].mood})`).join('; ')}`;
}

export function outlineTask(ctx: StoryCtx): string {
  return `Write the book's OUTLINE. One villain or mystery threads through all chapters and is resolved in the last.
Weave the fellowship's interests and the city of ${ctx.areaLabel} into it. Chapter ambition rises a little each chapter.

Return JSON:
{"title": "The <Something> of ${ctx.areaLabel.split(',')[0]}" (max 7 words),
 "synopsis": "2-3 sentences",
 "theme_tags": ["interest ids this book leans on"],
 "chapters": [${ctx.chapters.map((c, i) => `{"chapter_number": ${i + 1}, "template_id": "${c}", "title": "...", "narrative": "2-3 sentences"}`).join(', ')}]}`;
}

/** Mission-writing task for one chapter (chapters are written in parallel for speed). */
export function chapterTask(ctx: StoryCtx, outline: Outline, chapterIndex: number, preferredPlaces: number[]): string {
  const ch = outline.chapters[chapterIndex];
  const regions = TEMPLATE_REGIONS[ch.template_id];
  const n = ctx.members.length;
  return `BOOK: "${outline.title}" — ${outline.synopsis}
ALL CHAPTERS: ${outline.chapters.map((c) => `${c.chapter_number}. ${c.title}`).join(' | ')}

NOW WRITE CHAPTER ${ch.chapter_number} of ${outline.chapters.length}: "${ch.title}" — ${ch.narrative}
Page: ${ch.template_id} (${TEMPLATE_META[ch.template_id].mood}). It has exactly these regions — write EXACTLY ONE mission per region:
${regions.map((r) => `- region_id "${r.id}" (${r.label}, ${r.size}) -> ${SIZE_RULES[r.size].types.join(' | ')}`).join('\n')}

Rules:
- At least 3 of the 6 missions use a real place_ref ("P#"). Prefer these places for this chapter: ${preferredPlaces.map((i) => `P${i}`).join(', ') || 'any'}.
- [EVENT] places only for gathering or duet missions, and mention when it happens.
- Spread missions across members: use assignee_names to give each member at least one mission tied to an interest only they have.
  Members: ${ctx.members.map((m) => m.name).join(', ')}. Gatherings have assignee_names [] (everyone, ${n} people).
- description: plain language, concrete, says exactly what to do and what to photograph/write. Max 2 sentences.
- story_hook: 1 sentence of fairy-tale flavor tied to the book's plot.
- trial missions MUST have trial_question (a riddle answerable from the place facts above or common knowledge) and a
  short trial_answer (1-3 words). Non-trials: both null.
- verification_hint: what a photo/answer must show for Muse to accept it.
- Match the difficulty: ${DIFFICULTY_TEXT[ctx.difficulty]}
- points: put 0 (the game sets points itself).
- Chapter ${ch.chapter_number} should feel ${chapterIndex === 0 ? 'easy and welcoming' : chapterIndex === outline.chapters.length - 1 ? 'like a triumphant finale' : 'a bit more adventurous than the last'}.

Return JSON:
{"missions": [{"region_id": "...", "type": "...", "title": "2-5 words", "description": "...", "story_hook": "...",
  "place_ref": "P3" or null, "assignee_names": [], "trial_question": null, "trial_answer": null,
  "verification_hint": "...", "points": 0}]}`;
}

/** Appended to the outline + chapter prompts in sequel mode. */
export function sequelAddendum(recap: BookRecap | null, stats: SequelCtx): string {
  return `

THIS IS A SEQUEL to "${stats.prior_title}". What actually happened last time:
${recap ? `Recap: ${recap.summary}\nHighlights: ${recap.highlights.join(' | ')}` : 'They finished the book together.'}
${stats.callbacks.length ? `Specific moments: ${stats.callbacks.slice(0, 6).join(' | ')}` : ''}
Mission types they LOVED (did most/fastest): ${stats.loved_types.join(', ') || 'all of them'}
Mission types they SKIPPED or dragged on: ${stats.skipped_types.join(', ') || 'none'}
Photos shared: ${stats.photo_count}
${stats.chat_snippets.length ? `Recent group chat (inside jokes live here): ${stats.chat_snippets.slice(-15).map((s) => `"${s}"`).join(' ')}` : ''}

Sequel rules: continue the SAME world with a NEW villain or quest. Lean into the loved mission types (use them wherever
the size rules allow) and avoid the skipped ones. Call back to 2 specific moments above BY NAME in the synopsis or
narratives. Raise the stakes slightly.`;
}

export const OUTLINE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    synopsis: { type: 'string' },
    theme_tags: { type: 'array', items: { type: 'string' } },
    chapters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          chapter_number: { type: 'integer' },
          template_id: { type: 'string' },
          title: { type: 'string' },
          narrative: { type: 'string' },
        },
        required: ['chapter_number', 'template_id', 'title', 'narrative'],
      },
    },
  },
  required: ['title', 'synopsis', 'chapters'],
};

export const CHAPTER_SCHEMA = {
  type: 'object',
  properties: {
    missions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          region_id: { type: 'string' },
          type: { type: 'string', enum: ['gathering', 'duet', 'relic', 'bard', 'trial', 'gift'] },
          title: { type: 'string' },
          description: { type: 'string' },
          story_hook: { type: 'string' },
          place_ref: { type: ['string', 'null'] },
          assignee_names: { type: 'array', items: { type: 'string' } },
          trial_question: { type: ['string', 'null'] },
          trial_answer: { type: ['string', 'null'] },
          verification_hint: { type: 'string' },
          points: { type: 'integer' },
        },
        required: ['region_id', 'type', 'title', 'description'],
      },
    },
  },
  required: ['missions'],
};

// ---------------------------------------------------------------- verification

export const verifierSystem = `${MUSE_PERSONA}

You are now the Magic Mirror: you judge whether a photo (or text) proves a real-world mission was done.
Be generous to honest effort — friends are doing real things together — but fail clear mismatches
(wrong subject, blank/black image, screenshot of the internet, obviously unrelated photo).
Google Lens visual-match titles, when given, are hints about what is in the photo; they may be noisy.
Respond with JSON only:
{"pass": true|false, "confidence": 0.0-1.0, "reason": "short internal reason",
 "flavor_text": "1-2 sentences in Muse's voice shown to the players. On pass: delighted. On fail: playful and says exactly what to try next."}`;

export function verifierUser(args: {
  mission: Pick<Mission, 'title' | 'description' | 'verification_hint' | 'type' | 'place'>;
  proof_url?: string;
  proof_text?: string;
  lens_titles?: string[];
  expected_people?: number;
}): { type: 'text'; text: string }[] | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[] {
  const { mission } = args;
  const lines = [
    `MISSION: ${mission.title} (${mission.type})`,
    `Task: ${mission.description}`,
    `Proof must show: ${mission.verification_hint || 'that the task was done'}`,
    mission.place ? `Place: ${mission.place.title}${mission.place.address ? `, ${mission.place.address}` : ''}` : '',
    args.expected_people ? `This is a group proof: expect about ${args.expected_people} people in the photo (be lenient: someone may be taking it).` : '',
    args.lens_titles?.length ? `Google Lens visual matches: ${args.lens_titles.join(' | ')}` : args.proof_url ? 'Google Lens: no matches available.' : '',
    args.proof_text ? `Submitted text: """${args.proof_text.slice(0, 1500)}"""` : '',
    args.proof_url ? 'The photo is attached. Judge it.' : 'Judge the text: on-topic, non-empty, not offensive. Pass generously.',
  ].filter(Boolean);
  const text = { type: 'text' as const, text: lines.join('\n') };
  return args.proof_url ? [text, { type: 'image_url' as const, image_url: { url: args.proof_url } }] : [text];
}

export function answerJudgeUser(question: string, answer: string, given: string): string {
  return `Riddle: ${question}
Correct answer: ${answer}
Player answered: ${given}
Is the player's answer acceptable (same meaning, synonym, minor misspelling, or more specific/less specific but clearly the same thing)?
Respond with JSON only: {"pass": true|false, "flavor_text": "1 sentence in Muse's voice. If wrong, give a gentle hint WITHOUT revealing the answer."}`;
}

// ---------------------------------------------------------------- narration

/** Prompt for the one past-tense sentence written into the book when a mission completes. */
export function storyLineFor(args: {
  mission: Pick<Mission, 'title' | 'description' | 'story_hook' | 'type' | 'place'>;
  heroes: MemberCtx[];
  proof_text?: string;
  lens_titles?: string[];
  chapterTitle?: string;
}): string {
  return `Write ONE sentence (max 30 words), past tense, for the storybook: what these heroes just did, as a fairy tale.
Use their names with their crests as titles (e.g. "Bram the Dragon"). Mention the real place if there is one, transformed
into fairy-tale language but still recognizable. No quotes around the sentence.
Chapter: ${args.chapterTitle ?? ''}
Mission: ${args.mission.title} — ${args.mission.description}
Story hook: ${args.mission.story_hook}
${args.mission.place ? `Place: ${args.mission.place.title}` : ''}
Heroes: ${args.heroes.map((h) => `${h.name} the ${h.crest_title} ${h.crest_emoji}`).join(', ')}
${args.proof_text ? `What they wrote/answered: "${args.proof_text.slice(0, 400)}"` : ''}
${args.lens_titles?.length ? `The Magic Mirror saw: ${args.lens_titles.slice(0, 3).join(', ')}` : ''}
Respond with JSON only: {"story_line": "..."}`;
}

export const recapSystem = `${MUSE_PERSONA}

The fellowship just finished a whole book. Write their recap: a celebration of what they ACTUALLY did together.
Use real names, real places and the story lines given. Give each member a fairy-tale title earned from their
contributions ("Aria the Bold, Keeper of the Moon"). Respond with JSON only:
{"summary": "3-5 sentence fairy-tale recap",
 "highlights": ["3-5 best moments, each one sentence"],
 "per_member": [{"user_id": "<id>", "title": "Name the Epithet", "contribution": "1 sentence"}],
 "next_book_hint": "1-2 sentence teaser for the sequel"}`;

export function recapUser(args: {
  title: string;
  synopsis: string;
  members: MemberCtx[];
  missions: Pick<Mission, 'title' | 'type' | 'story_line' | 'completed_by' | 'place'>[];
  stats: BookRecap['stats'];
  serp?: Record<string, number>;
}): string {
  const byMember = args.members.map((m) => {
    const done = args.missions.filter((x) => x.completed_by.includes(m.user_id));
    return `- ${m.name} the ${m.crest_title} (user_id ${m.user_id}): ${done.length} missions — ${done.map((d) => d.title).join(', ') || 'cheered from the sidelines'}`;
  });
  return `BOOK: "${args.title}" — ${args.synopsis}
STATS: ${JSON.stringify(args.stats)}
MEMBERS:
${byMember.join('\n')}
STORY LINES (in order):
${args.missions.filter((m) => m.story_line).map((m) => `- ${m.story_line}`).join('\n')}`;
}

export function illustrationPrompt(page: Pick<Page, 'title' | 'narrative' | 'template_id'>, storyLines: string[], crests: string[]): string {
  return `A whimsical storybook illustration for a fairy-tale chapter titled "${page.title}". ${page.narrative}
Scene: ${TEMPLATE_META[page.template_id].title.toLowerCase()} — ${TEMPLATE_META[page.template_id].mood}.
What happened: ${storyLines.slice(0, 4).join(' ')}
The heroes appear as friendly animal companions: ${crests.join(', ')}.
Style: hand-inked children's book art, thick deep-indigo outlines, soft watercolor washes, warm golden light,
cozy and joyful, no text, no letters, no logos, no real human faces.`;
}

export function montagePrompt(storyLine: string, crests: string[]): string {
  return `Storybook illustration of this moment: ${storyLine}
Heroes as friendly animal companions: ${crests.join(', ')}.
Style: hand-inked children's book art, thick deep-indigo outlines, watercolor washes, warm light, no text, no real faces.`;
}

/** Reroll: Muse swaps one open mission for a fresh one on the same region. */
export function rerollTask(args: {
  templateId: TemplateId;
  regionId: string;
  size: string;
  allowedTypes: string[];
  old: Pick<Mission, 'title' | 'description' | 'type'>;
  chapterTitle: string;
  bookTitle: string;
  reason?: string;
  difficulty?: PointsDifficulty; // relative to the old mission: easy = easier, normal = similar, hard = harder
}): string {
  const want = args.difficulty === 'hard'
    ? 'Make it MORE ambitious than the old one (farther, longer or more creative), still safe and cheap.'
    : args.difficulty === 'normal'
    ? 'Keep about the same effort as the old one, but a fresh idea.'
    : 'Make it noticeably EASIER and quicker to do today than the old one (closer, shorter, free).';
  return `BOOK: "${args.bookTitle}" — chapter "${args.chapterTitle}".
The fellowship wants a DIFFERENT mission for region "${args.regionId}" (${args.size}; allowed types: ${args.allowedTypes.join(' | ')}).
Old mission (do NOT repeat it): ${args.old.title} — ${args.old.description} (${args.old.type})
${args.reason ? `Why they rerolled: ${args.reason}` : ''}
${want} Same JSON shape as one element of "missions":
{"region_id": "${args.regionId}", "type": "...", "title": "...", "description": "...", "story_hook": "...", "place_ref": "P#" or null,
 "assignee_names": [], "trial_question": null, "trial_answer": null, "verification_hint": "...", "points": 0}`;
}
