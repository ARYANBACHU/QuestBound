/**
 * QUESTBOUND — SHARED CONTRACT (FROZEN)
 * Every branch codes against these types. Do NOT edit on a feature branch.
 * Need a change? Write it in handoffs/notes/REQUESTS.md and push; the merge agent applies it.
 * Mirrors supabase/migrations/0001_init.sql column-for-column.
 */
import type { TemplateId } from './templates';
import type { CrayonColor, CrestId } from './theme';

export type UUID = string;
export type ISODate = string;

// ---------- enums ----------
export type MissionType = 'gathering' | 'duet' | 'relic' | 'bard' | 'trial' | 'gift';
export type ProofType = 'photo' | 'group_photo' | 'text' | 'voice' | 'answer' | 'confirm';
export type RegionSize = 'small' | 'medium' | 'large';
export type MissionStatus = 'locked' | 'open' | 'pending' | 'complete';
export type PageStatus = 'locked' | 'active' | 'complete';
export type StorylineStatus = 'generating' | 'active' | 'complete';
export type MessageKind = 'text' | 'proclamation' | 'system' | 'wizard';
export type MemoryKind = 'photo' | 'illustration' | 'montage_frame';
export type Budget = 'free' | '$' | '$$' | '$$$';

// ---------- rows ----------
export interface Profile {
  id: UUID;
  display_name: string;
  crest: CrestId;
  color: CrayonColor;
  interests: string[];
  budget: Budget;
  availability: string[]; // e.g. ['weekday_evenings','weekends']
  home_area: string | null;
  onboarded: boolean;
  created_at: ISODate;
}

export interface Fellowship {
  id: UUID;
  name: string;
  invite_code: string; // 6 chars, uppercase
  created_by: UUID | null;
  lat: number | null;
  lng: number | null;
  area_label: string | null; // "Austin, TX"
  created_at: ISODate;
}

export interface FellowshipMember {
  fellowship_id: UUID;
  user_id: UUID;
  role: 'founder' | 'member';
  joined_at: ISODate;
  profile?: Profile; // joined client-side
}

/** A real-world location grounded by SerpApi (or manual). */
export interface Place {
  title: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  category?: string;
  thumbnail?: string;
  when?: string; // events only
  link?: string;
  source: 'google_maps' | 'google_events' | 'manual';
  source_id?: string;
}

export interface Storyline {
  id: UUID;
  fellowship_id: UUID;
  book_number: number; // 1 = first book, 2 = first sequel ...
  title: string;
  synopsis: string;
  theme_tags: string[];
  status: StorylineStatus;
  recap: BookRecap | null;
  created_at: ISODate;
}

export interface Page {
  id: UUID;
  storyline_id: UUID;
  chapter_number: number; // 1-based
  title: string;
  narrative: string; // 2-4 sentences shown above the coloring page
  template_id: TemplateId;
  status: PageStatus;
  illustration_url: string | null; // Muse Image art generated when page completes
  completed_at: ISODate | null;
}

export interface Mission {
  id: UUID;
  page_id: UUID;
  storyline_id: UUID;
  fellowship_id: UUID;
  region_id: string; // must exist in TEMPLATES[page.template_id].regions
  title: string;
  description: string; // what to actually do, plain language
  story_hook: string; // 1 sentence of fairy-tale flavor
  type: MissionType;
  proof_type: ProofType;
  required_members: number; // 1 solo, 2 duet/gift, N gathering
  assignee_ids: UUID[]; // empty = anyone
  place: Place | null;
  trial_question: string | null; // answer lives server-side in mission_secrets
  verification_hint: string; // what the verifier looks for
  points: number;
  status: MissionStatus;
  completed_by: UUID[]; // participants credited
  completed_at: ISODate | null;
  story_line: string | null; // narrated sentence written on completion
  created_at: ISODate;
}

export interface Verdict {
  pass: boolean;
  confidence: number; // 0..1
  reason: string; // internal/debug
  flavor_text: string; // shown to user, in Muse's voice
  lens_titles?: string[]; // SerpApi Google Lens visual match titles
}

export interface Completion {
  id: UUID;
  mission_id: UUID;
  user_id: UUID; // submitter
  participant_ids: UUID[];
  proof_url: string | null;
  proof_text: string | null;
  verdict: Verdict | null;
  story_line: string | null;
  created_at: ISODate;
}

export interface ProclamationPayload {
  event: 'mission_complete' | 'page_complete' | 'book_complete' | 'storyline_ready' | 'member_joined';
  mission_id?: UUID;
  page_id?: UUID;
  storyline_id?: UUID;
  region_id?: string;
  color?: CrayonColor;
  user_id?: UUID;
  image_url?: string;
}

export interface Message {
  id: UUID;
  fellowship_id: UUID;
  user_id: UUID | null; // null for proclamation/system/wizard
  kind: MessageKind;
  body: string;
  payload: ProclamationPayload | null;
  created_at: ISODate;
}

export interface Memory {
  id: UUID;
  fellowship_id: UUID;
  storyline_id: UUID | null;
  page_id: UUID | null;
  mission_id: UUID | null;
  user_id: UUID | null;
  image_url: string;
  caption: string | null;
  kind: MemoryKind;
  created_at: ISODate;
}

export interface BookRecap {
  summary: string; // 3-5 sentence fairy-tale recap
  stats: { missions_completed: number; photos: number; places_visited: number; members_active: number };
  highlights: string[]; // 3-5 best moments
  per_member: { user_id: UUID; title: string; contribution: string }[]; // "Aria the Bold"
  next_book_hint: string; // teaser for the sequel
}

// ---------- edge function API ----------
export interface GenerateStorylineRequest { fellowship_id: UUID; mode: 'first' | 'sequel' }
export interface GenerateStorylineResponse { storyline_id: UUID }

export interface SubmitProofRequest {
  mission_id: UUID;
  participant_ids: UUID[]; // includes submitter
  proof_url?: string; // public URL in storage bucket 'proofs'
  proof_text?: string; // text / answer / transcript
  confirm_for?: UUID; // gift: the friend confirming
}
export interface SubmitProofResponse {
  verdict: Verdict;
  mission: Mission;
  completion: Completion | null; // null when verdict fails
  page_completed: boolean;
  book_completed: boolean;
}

export type WizardAction =
  | { type: 'navigate'; target: 'friends' | 'missions' | 'coloring' | 'storybook' | 'settings' }
  | { type: 'open_mission'; target: UUID }
  | { type: 'summon_storyline' };

export interface WizardChatRequest {
  fellowship_id: UUID | null;
  screen: string; // current route, e.g. 'missions'
  messages: { role: 'user' | 'assistant'; content: string }[];
}
export interface WizardChatResponse { reply: string; actions: WizardAction[] }
