// Owner: EV. Deno-side MIRROR of /shared/types.ts + /shared/templates.ts (Deno can't import the app's
// extensionless TS). Keep in sync by hand. If they ever disagree, /shared wins.
export type MissionType = 'gathering' | 'duet' | 'relic' | 'bard' | 'trial' | 'gift';
export type ProofType = 'photo' | 'group_photo' | 'text' | 'voice' | 'answer' | 'confirm';
export type RegionSize = 'small' | 'medium' | 'large';
export type TemplateId = 'castle_gate' | 'enchanted_forest' | 'dragon_peak' | 'royal_feast';

export interface Place {
  title: string; address?: string; lat?: number; lng?: number; rating?: number; category?: string;
  thumbnail?: string; when?: string; link?: string; maps_url?: string; website?: string; source: 'google_maps' | 'google_events' | 'manual'; source_id?: string;
}

export interface Verdict { pass: boolean; confidence: number; reason: string; flavor_text: string; lens_titles?: string[] }

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
};
export const TEMPLATE_IDS = Object.keys(TEMPLATE_REGIONS) as TemplateId[];

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
}

export interface Storyline {
  id: string; fellowship_id: string; book_number: number; title: string; synopsis: string; theme_tags: string[];
  status: 'generating' | 'active' | 'complete'; recap: BookRecap | null; created_at: string;
  generation_context?: Record<string, unknown> | null;
}

export interface SubmitProofRequest {
  mission_id: string; participant_ids: string[]; proof_url?: string; proof_text?: string; confirm_for?: string;
}

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
