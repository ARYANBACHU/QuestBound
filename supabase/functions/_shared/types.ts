// Owner: EV. Deno-side MIRROR of /shared/types.ts + /shared/templates.ts (Deno can't import the app's
// extensionless TS). Keep in sync by hand. If they ever disagree, /shared wins.
export type MissionType = 'gathering' | 'duet' | 'relic' | 'bard' | 'trial' | 'gift';
export type ProofType = 'photo' | 'group_photo' | 'text' | 'voice' | 'answer' | 'confirm';
export type RegionSize = 'small' | 'medium' | 'large';
export type TemplateId = 'castle_gate' | 'enchanted_forest' | 'dragon_peak' | 'royal_feast';

export interface Place {
  title: string; address?: string; lat?: number; lng?: number; rating?: number; category?: string;
  thumbnail?: string; when?: string; link?: string; source: 'google_maps' | 'google_events' | 'manual'; source_id?: string;
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
