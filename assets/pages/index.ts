// Owner: AD. All coloring page art, keyed by template id.
import { TEMPLATES, type TemplateId } from '@/shared/templates';
import type { PageArt } from './types';
import { castle_gate } from './castle_gate';
import { enchanted_forest } from './enchanted_forest';
import { dragon_peak } from './dragon_peak';
import { royal_feast } from './royal_feast';

export type { PageArt, RegionArt } from './types';
export { VIEW_W, VIEW_H } from './types';

export const PAGE_ART: Record<TemplateId, PageArt> = { castle_gate, enchanted_forest, dragon_peak, royal_feast };

/** Region ids in the art must exactly match shared/templates.ts — the engine only assigns those. */
export function validatePageArt(): string[] {
  const problems: string[] = [];
  for (const t of Object.values(TEMPLATES)) {
    const art = PAGE_ART[t.id];
    if (!art) { problems.push(`${t.id}: no art`); continue; }
    const want = new Set(t.regions.map((r) => r.id));
    for (const id of want) if (!art.regions[id]) problems.push(`${t.id}: missing region "${id}"`);
    for (const id of Object.keys(art.regions)) if (!want.has(id)) problems.push(`${t.id}: extra region "${id}"`);
  }
  return problems;
}

if (__DEV__) {
  const problems = validatePageArt();
  if (problems.length) throw new Error(`[assets/pages] art does not match shared/templates.ts:\n${problems.join('\n')}`);
}
