// Owner: EV (wizardChat request shape agreed with AB). Write-side calls -> Supabase Edge Functions.
// CONTRACT: keep these export names/signatures. Mock versions simulate success so UI can be built now.
import { USE_MOCKS } from './env';
import { supabase } from './supabase';
import { mock, emitMock } from './mockStore';
import { ME } from '@/fixtures/demo';
import type {
  GenerateStorylineRequest, GenerateStorylineResponse, SubmitProofRequest, SubmitProofResponse,
  WizardChatRequest, WizardChatResponse,
} from '@/shared/types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function invoke<T>(fn: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body: body as Record<string, unknown> });
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

export async function generateStoryline(req: GenerateStorylineRequest): Promise<GenerateStorylineResponse> {
  if (USE_MOCKS) { await wait(2500); return { storyline_id: mock.storyline.id }; }
  return invoke('generate-storyline', req);
}

export async function submitProof(req: SubmitProofRequest): Promise<SubmitProofResponse> {
  if (USE_MOCKS) {
    await wait(1800);
    const mission = mock.missions.find((m) => m.id === req.mission_id)!;
    const me = mock.profiles.find((p) => p.id === ME)!;
    Object.assign(mission, {
      status: 'complete', completed_by: req.participant_ids, completed_at: new Date().toISOString(),
      story_line: `${me.display_name} the ${me.crest} completed "${mission.title}", and the page drank in the color.`,
    });
    mock.messages.push({ id: `msg-${Date.now()}`, fellowship_id: mission.fellowship_id, user_id: null, kind: 'proclamation',
      body: `Hear ye! ${me.display_name} completed "${mission.title}"!`,
      payload: { event: 'mission_complete', mission_id: mission.id, region_id: mission.region_id, color: me.color, user_id: ME },
      created_at: new Date().toISOString() });
    const page = mock.pages.find((p) => p.id === mission.page_id)!;
    const pageDone = mock.missions.filter((m) => m.page_id === page.id).every((m) => m.status === 'complete');
    if (pageDone) {
      page.status = 'complete';
      const next = mock.pages.find((p) => p.chapter_number === page.chapter_number + 1);
      if (next) next.status = 'active';
    }
    emitMock();
    return {
      verdict: { pass: true, confidence: 0.92, reason: 'mock', flavor_text: 'The Magic Mirror nods. Your proof is true!' },
      mission, completion: null, page_completed: pageDone, book_completed: false,
    };
  }
  return invoke('submit-proof', req);
}

export async function wizardChat(req: WizardChatRequest): Promise<WizardChatResponse> {
  if (USE_MOCKS) {
    await wait(900);
    return { reply: 'Ah, a curious traveler! Tap a glowing region on your page to see its mission. Group missions color the biggest pieces.', actions: [{ type: 'navigate', target: 'coloring' }] };
  }
  return invoke('wizard-chat', req);
}

/** Upload a local photo (file:// uri from expo-image-picker) to bucket 'proofs'; returns PUBLIC url (needed by SerpApi Lens). */
export async function uploadProof(localUri: string, fellowshipId: string): Promise<string> {
  if (USE_MOCKS) { await wait(600); return localUri; }
  // TODO(EV): real upload — see handoffs/EV.md §5
  throw new Error('uploadProof not implemented');
}
