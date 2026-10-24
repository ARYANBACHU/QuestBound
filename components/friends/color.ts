// Owner: MP. Tiny color helpers for crayon-filled UI (bubbles, swatches).
import { CRAYONS, ink, type CrayonColor } from '@/shared/theme';

export function crayonHex(color: CrayonColor | string | null | undefined): string {
  return (color && CRAYONS[color as CrayonColor]) || ink.muted;
}

/** Relative luminance (WCAG) of a #RRGGBB color. */
function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** White text on dark crayons, ink text on light ones (marigold, etc). */
export function textOn(color: CrayonColor | string | null | undefined): string {
  const bg = crayonHex(color);
  const contrastWhite = 1.05 / (luminance(bg) + 0.05);
  return contrastWhite >= 3 ? ink.page : ink.ink;
}

/** Add alpha to a #RRGGBB color. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}
