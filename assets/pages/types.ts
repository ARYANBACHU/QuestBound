// Owner: AD. Coloring page art format. Every region id MUST match TEMPLATES[id].regions[].id.
import type { TemplateId } from '@/shared/templates';

export interface RegionArt {
  /** Closed SVG path(s) in viewBox units. Filled with the nonzero rule: holes are drawn counter-clockwise. */
  d: string;
  /** Where the type glyph / hourglass / fill-burst origin sits. */
  labelAt: [number, number];
}

export interface PageArt {
  id: TemplateId;
  viewBox: '0 0 1000 1400'; // portrait, phone-shaped
  regions: Record<string, RegionArt>; // keys MUST equal TEMPLATES[id].regions[].id — every one, no extras
  ink: string[]; // decorative, non-interactive line art drawn ON TOP (outlines, details, border)
  background?: string[]; // optional faint ground lines (drawn under regions)
}

export const VIEW_W = 1000;
export const VIEW_H = 1400;
