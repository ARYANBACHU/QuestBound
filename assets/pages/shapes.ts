// Owner: AD. Tiny path builders so page art stays readable. All output is plain SVG path data.
// Convention: shapes are clockwise (on screen) by default; pass ccw=true to cut a hole (nonzero fill rule).

const n = (v: number) => Math.round(v * 10) / 10;

export function rr(x: number, y: number, w: number, h: number, r: number, ccw = false): string {
  r = Math.min(r, w / 2, h / 2);
  if (!ccw) {
    return `M${n(x + r)} ${n(y)} H${n(x + w - r)} Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + r)} V${n(y + h - r)} Q${n(x + w)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} H${n(x + r)} Q${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - r)} V${n(y + r)} Q${n(x)} ${n(y)} ${n(x + r)} ${n(y)} Z`;
  }
  return `M${n(x + r)} ${n(y)} Q${n(x)} ${n(y)} ${n(x)} ${n(y + r)} V${n(y + h - r)} Q${n(x)} ${n(y + h)} ${n(x + r)} ${n(y + h)} H${n(x + w - r)} Q${n(x + w)} ${n(y + h)} ${n(x + w)} ${n(y + h - r)} V${n(y + r)} Q${n(x + w)} ${n(y)} ${n(x + w - r)} ${n(y)} Z`;
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, ccw = false): string {
  const s = ccw ? 0 : 1;
  return `M${n(cx - rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 ${s} ${n(cx + rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 ${s} ${n(cx - rx)} ${n(cy)} Z`;
}

export const circle = (cx: number, cy: number, r: number, ccw = false) => ellipse(cx, cy, r, r, ccw);

export function poly(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${n(x)} ${n(y)}`).join(' ') + ' Z';
}

const rad = (deg: number) => (deg * Math.PI) / 180;
export function onEllipse(cx: number, cy: number, rx: number, ry: number, deg: number): [number, number] {
  return [cx + rx * Math.cos(rad(deg)), cy + ry * Math.sin(rad(deg))];
}

/**
 * Scalloped (cloud / tree-canopy) edge along an ellipse from angle a0 to a1 (degrees, increasing = clockwise on
 * screen). Assumes the current point is already at a0. Emits `count` outward bumps.
 */
export function scallops(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, count: number, puff = 0.62): string {
  let out = '';
  for (let i = 1; i <= count; i++) {
    const [x0, y0] = onEllipse(cx, cy, rx, ry, a0 + ((a1 - a0) * (i - 1)) / count);
    const [x1, y1] = onEllipse(cx, cy, rx, ry, a0 + ((a1 - a0) * i) / count);
    const r = Math.hypot(x1 - x0, y1 - y0) * puff;
    out += ` A${n(r)} ${n(r)} 0 0 ${a1 > a0 ? 1 : 0} ${n(x1)} ${n(y1)}`;
  }
  return out;
}

/** A closed cloud: scalloped ellipse. */
export function cloud(cx: number, cy: number, rx: number, ry: number, bumps = 7): string {
  const [x, y] = onEllipse(cx, cy, rx, ry, 0);
  return `M${n(x)} ${n(y)}${scallops(cx, cy, rx, ry, 0, 360, bumps)} Z`;
}

/** Battlement top edge from x1 → x2 at baseline y (current point must be at (x1, y)). */
export function crenels(x1: number, x2: number, y: number, count: number, h: number): string {
  const w = (x2 - x1) / (2 * count - 1);
  let out = ` L${n(x1)} ${n(y - h)}`;
  for (let i = 0; i < count; i++) {
    const a = x1 + 2 * i * w;
    out += ` L${n(a + w)} ${n(y - h)}`;
    if (i < count - 1) out += ` L${n(a + w)} ${n(y)} L${n(a + 2 * w)} ${n(y)} L${n(a + 2 * w)} ${n(y - h)}`;
  }
  return out + ` L${n(x2)} ${n(y)}`;
}

/** Four-point sparkle star outline. */
export function star4(cx: number, cy: number, r: number): string {
  const k = r * 0.28;
  return `M${n(cx)} ${n(cy - r)} Q${n(cx + k)} ${n(cy - k)} ${n(cx + r)} ${n(cy)} Q${n(cx + k)} ${n(cy + k)} ${n(cx)} ${n(cy + r)} Q${n(cx - k)} ${n(cy + k)} ${n(cx - r)} ${n(cy)} Q${n(cx - k)} ${n(cy - k)} ${n(cx)} ${n(cy - r)} Z`;
}

/** Gentle wave line from x1 to x2 at y. */
export function wave(x1: number, x2: number, y: number, amp = 10, len = 60): string {
  let out = `M${n(x1)} ${n(y)}`;
  for (let x = x1; x < x2 - 1; x += len) {
    const e = Math.min(x + len, x2);
    out += ` Q${n((x + e) / 2)} ${n(y - amp)} ${n(e)} ${n(y)}`;
    amp = -amp;
  }
  return out;
}

/** The band between the frame's outer and inner borders (filled with the chapter mood gradient). */
export function frameBand(): string {
  const W = 1000, H = 1400, o = 24, i = 50;
  return `${rr(o, o, W - 2 * o, H - 2 * o, 34)} ${rr(i, i, W - 2 * i, H - 2 * i, 16, true)}`;
}

/** The storybook frame every page shares: double rounded border + corner flourishes. */
export function storybookFrame(): string[] {
  const W = 1000, H = 1400, o = 24, i = 50;
  const curl = (x: number, y: number, sx: number, sy: number) =>
    `M${x + sx * 2} ${y + sy * 70} C${x + sx * 2} ${y + sy * 30} ${x + sx * 30} ${y + sy * 2} ${x + sx * 70} ${y + sy * 2}` +
    ` M${x + sx * 28} ${y + sy * 62} C${x + sx * 16} ${y + sy * 40} ${x + sx * 30} ${y + sy * 22} ${x + sx * 48} ${y + sy * 28}` +
    ` C${x + sx * 62} ${y + sy * 34} ${x + sx * 58} ${y + sy * 54} ${x + sx * 44} ${y + sy * 52}`;
  return [
    rr(o, o, W - 2 * o, H - 2 * o, 34),
    rr(i, i, W - 2 * i, H - 2 * i, 16),
    curl(i, i, 1, 1),
    curl(W - i, i, -1, 1),
    curl(i, H - i, 1, -1),
    curl(W - i, H - i, -1, -1),
    // tiny diamonds mid-edge
    poly([[500, o - 2], [514, (o + i) / 2], [500, i + 2], [486, (o + i) / 2]]),
    poly([[500, H - o + 2], [514, H - (o + i) / 2], [500, H - i - 2], [486, H - (o + i) / 2]]),
  ];
}
