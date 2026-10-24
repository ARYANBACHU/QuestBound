/**
 * COLORING PAGE TEMPLATES — SHARED CONTRACT (FROZEN)
 * The story engine (EV) may ONLY assign missions to these template ids + region ids.
 * The artist (AD) must draw every region listed here with the SAME id in assets/pages/<template_id>.ts.
 *
 * Size -> mission rules (enforced by the engine):
 *   large  -> 'gathering'  (required_members = whole fellowship, min 2)
 *   medium -> 'duet' | 'gift' | 'trial'(co-op)  (required_members = 2)
 *   small  -> 'relic' | 'bard' | 'trial'        (required_members = 1)
 */
import type { RegionSize } from './types';

export type TemplateId = 'castle_gate' | 'enchanted_forest' | 'dragon_peak' | 'royal_feast';

export interface RegionDef { id: string; label: string; size: RegionSize }
export interface TemplateDef { id: TemplateId; title: string; mood: string; regions: RegionDef[] }

export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  castle_gate: {
    id: 'castle_gate',
    title: 'The Castle Gate',
    mood: 'beginnings, welcome, setting out together',
    regions: [
      { id: 'castle', label: 'The Castle', size: 'large' },
      { id: 'drawbridge', label: 'The Drawbridge', size: 'medium' },
      { id: 'banners', label: 'The Banners', size: 'medium' },
      { id: 'moon', label: 'The Moon', size: 'small' },
      { id: 'tower_flag', label: 'The Tower Flag', size: 'small' },
      { id: 'moat', label: 'The Moat', size: 'small' },
    ],
  },
  enchanted_forest: {
    id: 'enchanted_forest',
    title: 'The Enchanted Forest',
    mood: 'exploring, nature, discovery, quiet magic',
    regions: [
      { id: 'great_tree', label: 'The Great Tree', size: 'large' },
      { id: 'mushroom_ring', label: 'The Mushroom Ring', size: 'medium' },
      { id: 'river', label: 'The Silver River', size: 'medium' },
      { id: 'fireflies', label: 'The Fireflies', size: 'small' },
      { id: 'owl', label: 'The Wise Owl', size: 'small' },
      { id: 'path', label: 'The Winding Path', size: 'small' },
    ],
  },
  dragon_peak: {
    id: 'dragon_peak',
    title: "The Dragon's Peak",
    mood: 'challenge, courage, the big adventure',
    regions: [
      { id: 'dragon', label: 'The Dragon', size: 'large' },
      { id: 'mountain', label: 'The Mountain', size: 'medium' },
      { id: 'treasure', label: 'The Treasure Hoard', size: 'medium' },
      { id: 'clouds', label: 'The Storm Clouds', size: 'small' },
      { id: 'shield', label: "The Knight's Shield", size: 'small' },
      { id: 'lantern', label: 'The Lantern', size: 'small' },
    ],
  },
  royal_feast: {
    id: 'royal_feast',
    title: 'The Royal Feast',
    mood: 'celebration, food, music, happily ever after',
    regions: [
      { id: 'feast_table', label: 'The Feast Table', size: 'large' },
      { id: 'throne', label: 'The Throne', size: 'medium' },
      { id: 'chandelier', label: 'The Chandelier', size: 'medium' },
      { id: 'goblet', label: 'The Golden Goblet', size: 'small' },
      { id: 'cake', label: 'The Enchanted Cake', size: 'small' },
      { id: 'lute', label: "The Bard's Lute", size: 'small' },
    ],
  },
};

/** Default chapter order for a book (engine may reorder, max 4 chapters). */
export const DEFAULT_CHAPTER_TEMPLATES: TemplateId[] = ['castle_gate', 'enchanted_forest', 'dragon_peak', 'royal_feast'];

export function regionDef(templateId: TemplateId, regionId: string): RegionDef | undefined {
  return TEMPLATES[templateId]?.regions.find((r) => r.id === regionId);
}
