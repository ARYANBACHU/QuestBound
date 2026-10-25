// Owner: AD. THE coloring page: every region is a mission; completing it fills the region with crayon color.
'use no memo'; // mock store mutates rows in place; opt out of React Compiler auto-memo so updates always render
// <ColoringPage templateId missions members onRegionPress highlightRegionId? interactive? locked? width? animate? paused? />
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { PAGE_ART, VIEW_H, VIEW_W } from '@/assets/pages';
import { frameBand, frameInner } from '@/assets/pages/shapes';
import { TEMPLATES, type TemplateId } from '@/shared/templates';
import { INK_STROKE, ink, moodFor, space } from '@/shared/theme';
import type { FellowshipMember, Mission } from '@/shared/types';
import { HourglassGlyph, MissionTypeGlyph } from './MissionTypeIcon';
import { playSfx } from './sfx';
import { STATUS_LABEL, crayonHex, missionColors, pathBounds, shade } from './pageUtils';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// U1 — THE moment, in four beats (ms from the start):
//   0 → 900     a crayon scribbles back and forth across the region (you see the tip moving)
//   780 → 1200  the strokes settle into the finished crayon fill (waxy grain + darker pressed edge)
//   1100 → 1750 a gold ring pulses out and sparkles burst from the region
//   1150 → 1800 a soft light shimmer sweeps across the fresh color
// …while the page's mood wash deepens behind everything.
export const FILL_MS = 1200; // until the region reads as colored
export const REVEAL_MS = 1800; // until the last shimmer/sparkle settles
const SCRIBBLE_MS = 900;
const SETTLE_AT = 780;
const SETTLE_MS = 420;
const SPARKLE_AT = 1100;
const SPARKLE_MS = 650;
const SHIMMER_AT = 1150;
const SHIMMER_MS = 650;
const FOCUS_DELAY_MS = 380; // when fills were waiting for the page to be on screen, let the screen settle first
// V3 "no double animation": a region colored while this page was off screen (you just watched it fill on AB's reward
// card) arrives already colored and only GLOWS when you come back — gold ring + sparkles + shimmer, no second fill.
const GLOW_SPARKLE_AT = 120;
const GLOW_SHIMMER_AT = 180;
const GLOW_MS = GLOW_SHIMMER_AT + SHIMMER_MS;
/** How long after the page comes back on screen the glow for regions colored meanwhile has finished. */
export const RETURN_GLOW_MS = FOCUS_DELAY_MS + GLOW_MS;
const STICKY_MS = 8000; // a fresh 'complete' that flips back within this window is a stale refetch, not an undo
const STRIPE = 12; // teammate stripe width in viewBox units (~4 px on a phone)
const GLYPH = 60;
const NATIVE = Platform.OS !== 'web';
const FRAME_BAND = frameBand();
const FRAME_INNER = frameInner();

/** Crayon grain: paper tooth showing through wax. Deterministic specks (no lines → no plaid). */
const GRAIN_TILE = 90;
const GRAIN = Array.from({ length: 26 }, (_, i) => {
  const r = (k: number) => { const x = Math.sin((i + 1) * 91.7 + k * 13.1) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1) * GRAIN_TILE, y: r(2) * GRAIN_TILE, rx: 1.6 + r(3) * 3.2, ry: 1.2 + r(4) * 2, o: 0.16 + r(5) * 0.26, dark: i % 5 === 0 };
});

export interface ColoringPageProps {
  templateId: TemplateId;
  missions: Mission[]; // missions of THIS page (others are ignored)
  members: FellowshipMember[];
  onRegionPress?: (missionId: string, regionId: string) => void;
  highlightRegionId?: string | null;
  interactive?: boolean; // default true
  locked?: boolean; // future page: paper white, 40% opacity, no taps
  width?: number; // default: screen width − 2×lg
  animate?: boolean; // default true; set false for thumbnails
  /**
   * true while the page isn't on screen (another tab, the mission screen on top). Regions colored meanwhile show up
   * already colored (you watched them fill on the reward card) and glow once when it flips back to false — never a
   * second fill (V3).
   */
  paused?: boolean;
}

function ColoringPageImpl({
  templateId, missions, members, onRegionPress, highlightRegionId, interactive = true, locked = false, width, animate = true, paused = false,
}: ColoringPageProps) {
  const art = PAGE_ART[templateId];
  const mood = moodFor(templateId);
  const template = TEMPLATES[templateId];
  const { width: screenW } = useWindowDimensions();
  const w = width ?? Math.min(screenW - 2 * space.lg, 560);
  const h = (w * VIEW_H) / VIEW_W;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  // V3: a fill plays ONCE per mission per mount. Two things used to replay it (blank→color→blank→color):
  //  - a refetch landing out of order briefly reverts a fresh 'complete' back to open → treat a regression within
  //    STICKY_MS of completion as noise and keep showing the colored region;
  //  - focus flickering (paused true→false→true→false) scheduled two plays → one cancellable focus timer.
  const doneAt = useRef<Record<string, number>>({}); // missionId -> first seen complete (this mount)
  const lastDone = useRef<Record<string, Mission>>({}); // missionId -> latest complete row (for its crayon colors)
  const played = useRef<Set<string>>(new Set()); // missionIds whose fill already played or was already colored
  const byRegion: Record<string, Mission> = {};
  for (const m of missions) {
    const t = doneAt.current[m.id];
    const sticky = m.status !== 'complete' && t !== undefined && Date.now() - t < STICKY_MS && lastDone.current[m.id];
    byRegion[m.region_id] = sticky ? lastDone.current[m.id] : m;
  }

  // --- detect open/pending → complete transitions while mounted ---
  const reduced = useReducedMotion();
  const prev = useRef<Record<string, string> | null>(null);
  const [filling, setFilling] = useState<Record<string, number>>({}); // regionId -> start stamp
  const fillingRef = useRef(filling);
  fillingRef.current = filling;
  const [queued, setQueued] = useState<string[]>([]); // colored while paused: shown colored, glows on return
  const [glowing, setGlowing] = useState<Record<string, number>>({}); // regionId -> glow start stamp
  const glowingRef = useRef(glowing);
  glowingRef.current = glowing;
  const queuedRef = useRef(queued);
  queuedRef.current = queued;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    if (focusTimer.current) clearTimeout(focusTimer.current);
  }, []);

  const play = (all: string[]) => {
    setQueued((q) => q.filter((r) => !all.includes(r)));
    const regions = all.filter((r) => !fillingRef.current[r]); // already filling → never restart it
    if (!regions.length) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    playSfx('crayon');
    if (reduced) return; // colors appear instantly
    const stamp = Date.now();
    setFilling((f) => ({ ...f, ...Object.fromEntries(regions.map((r) => [r, stamp])) }));
    timers.current.push(setTimeout(() => {
      setFilling((f) => {
        const next = { ...f };
        for (const r of regions) if (next[r] === stamp) delete next[r];
        return next;
      });
    }, REVEAL_MS + 150));
  };
  const playRef = useRef(play);
  playRef.current = play;

  /** Colored while you were away: no second fill — just the glow. */
  const glow = (all: string[]) => {
    setQueued((q) => q.filter((r) => !all.includes(r)));
    const regions = all.filter((r) => !glowingRef.current[r] && !fillingRef.current[r]);
    if (!regions.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (reduced) return;
    const stamp = Date.now();
    setGlowing((g) => ({ ...g, ...Object.fromEntries(regions.map((r) => [r, stamp])) }));
    timers.current.push(setTimeout(() => {
      setGlowing((g) => {
        const next = { ...g };
        for (const r of regions) if (next[r] === stamp) delete next[r];
        return next;
      });
    }, GLOW_MS + 150));
  };
  const glowRef = useRef(glow);
  glowRef.current = glow;

  /** Regions that just turned complete and haven't started their fill yet. Computed DURING render so the region
   *  stays blank in the very render the new data lands — otherwise it flashed full color for a frame before the
   *  effect below started the scribble (the V3 blank→color→blank→color). */
  const freshRegions = (): string[] => {
    const before = prev.current;
    if (!before || !animate) return [];
    return Object.keys(byRegion).filter(
      (r) => byRegion[r].status === 'complete' && before[r] && before[r] !== 'complete' && !played.current.has(byRegion[r].id),
    );
  };
  const freshNow = freshRegions();

  useEffect(() => {
    const now: Record<string, string> = {};
    for (const r of Object.keys(byRegion)) now[r] = byRegion[r].status;
    for (const m of missions) {
      if (m.status !== 'complete') continue;
      if (doneAt.current[m.id] === undefined) doneAt.current[m.id] = Date.now();
      lastDone.current[m.id] = m;
    }
    const fresh = freshRegions();
    const first = !prev.current;
    prev.current = now;
    if (first || !animate) {
      for (const r of Object.keys(now)) if (now[r] === 'complete') played.current.add(byRegion[r].id);
      return;
    }
    if (!fresh.length) return;
    for (const r of fresh) played.current.add(byRegion[r].id);
    if (paused) setQueued((q) => [...new Set([...q, ...fresh])]);
    else playRef.current(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missions, animate, paused]);

  useEffect(() => {
    if (paused) {
      if (focusTimer.current) clearTimeout(focusTimer.current);
      focusTimer.current = null;
      return;
    }
    if (!queuedRef.current.length || focusTimer.current) return;
    focusTimer.current = setTimeout(() => {
      focusTimer.current = null;
      if (queuedRef.current.length) glowRef.current(queuedRef.current);
    }, FOCUS_DELAY_MS);
  }, [paused]);

  const [pressed, setPressed] = useState<string | null>(null);

  const regionIds = template.regions.map((r) => r.id).filter((id) => art.regions[id]);
  const id = (k: string) => `${uid}${k}`;

  // 100% coloring: the sky/ground behind the regions takes the chapter mood as regions are colored (full at 6/6)
  const doneCount = locked ? 0 : regionIds.filter((r) => byRegion[r]?.status === 'complete' && !(freshNow.includes(r) && !paused)).length;
  const washTarget = regionIds.length ? doneCount / regionIds.length : 0;
  const wash = useSharedValue(washTarget);
  useEffect(() => {
    wash.value = animate && !reduced ? withDelay(FILL_MS * 0.6, withTiming(washTarget, { duration: 900, easing: Easing.out(Easing.quad) })) : washTarget;
  }, [washTarget, animate, reduced, wash]);
  const washProps = useAnimatedProps(() => ({ opacity: wash.value }));
  const sceneryProps = useAnimatedProps(() => ({ opacity: 0.25 + 0.75 * wash.value }));

  return (
    <Svg width={w} height={h} viewBox={art.viewBox}>
      <Defs>
        <LinearGradient id={id('wash')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={mood.gradient[0]} stopOpacity={0.7} />
          <Stop offset="1" stopColor={mood.gradient[1]} stopOpacity={0.85} />
        </LinearGradient>
        <LinearGradient id={id('frame')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={mood.gradient[0]} />
          <Stop offset="1" stopColor={mood.gradient[1]} />
        </LinearGradient>
        <Pattern id={id('grain')} patternUnits="userSpaceOnUse" width={GRAIN_TILE} height={GRAIN_TILE}>
          {GRAIN.map((g, i) => (
            <Ellipse key={i} cx={g.x} cy={g.y} rx={g.rx} ry={g.ry} fill={g.dark ? ink.ink : ink.page} fillOpacity={g.dark ? g.o * 0.25 : g.o} />
          ))}
        </Pattern>
        <LinearGradient id={id('shine')} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={ink.page} stopOpacity={0} />
          <Stop offset="0.5" stopColor={ink.page} stopOpacity={0.6} />
          <Stop offset="1" stopColor={ink.page} stopOpacity={0} />
        </LinearGradient>
        {regionIds.map((r) => (
          <ClipPath key={r} id={id(`clip${r}`)}>
            <Path d={art.regions[r].d} />
          </ClipPath>
        ))}
      </Defs>

      <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={ink.page} />
      <Path d={FRAME_BAND} fill={`url(#${id('frame')})`} opacity={locked ? 0.45 : 1} />
      <AnimatedG animatedProps={washProps}>
        <Path d={FRAME_INNER} fill={`url(#${id('wash')})`} />
      </AnimatedG>
      {art.scenery?.length ? (
        <AnimatedG animatedProps={sceneryProps}>
          {art.scenery.map((d, i) => (
            <Path key={`sc${i}`} d={d} fill={mood.gradient[i % 2]} fillOpacity={0.85} stroke={mood.deep} strokeOpacity={0.3} strokeWidth={4} strokeLinejoin="round" />
          ))}
        </AnimatedG>
      ) : null}
      {art.background?.map((d, i) => (
        <Path key={`bg${i}`} d={d} fill="none" stroke={ink.muted} strokeOpacity={0.45} strokeWidth={5} strokeLinecap="round" />
      ))}

      <G opacity={locked ? 0.4 : 1}>
        {regionIds.map((r) => {
          const ra = art.regions[r];
          const m = locked ? undefined : byRegion[r];
          const waiting = freshNow.includes(r) && !paused; // about to scribble in: stay blank (off screen: stay colored)
          const status = locked ? 'locked' : waiting ? 'open' : m?.status ?? 'open';
          const tappable = interactive && !locked && !!m && !!onRegionPress;
          const isPressed = pressed === r;
          const [lx, ly] = ra.labelAt;
          const transform = isPressed ? `translate(${lx} ${ly}) scale(0.98) translate(${-lx} ${-ly})` : undefined;
          const label = `${template.regions.find((x) => x.id === r)?.label ?? r}: ${m?.title ?? 'not yet written'}, ${STATUS_LABEL[m?.status ?? status]}`;
          return (
            <G key={r} transform={transform}>
              {waiting ? <Path d={ra.d} fill={ink.page} /> : (
                <RegionBody
                  regionId={r} d={ra.d} labelAt={ra.labelAt} mission={m} status={status} members={members}
                  clipId={id(`clip${r}`)} grainId={id('grain')} shineId={id('shine')} fillStamp={filling[r]} glowStamp={glowing[r]}
                />
              )}
              {isPressed && <Path d={ra.d} fill={ink.page} fillOpacity={0.25} />}
              {highlightRegionId === r && (
                <Path d={ra.d} fill="none" stroke={ink.gold} strokeWidth={INK_STROKE * 2.2} strokeDasharray="28 18" strokeLinecap="round" />
              )}
              {/* hit target + crisp outline on top of the fill */}
              <Path
                d={ra.d}
                fill={ink.page}
                fillOpacity={0.001}
                stroke={ink.ink}
                strokeWidth={INK_STROKE}
                strokeLinejoin="round"
                {...(NATIVE && tappable
                  ? { accessible: true, accessibilityLabel: label, onPressIn: () => setPressed(r), onPressOut: () => setPressed(null) }
                  : { 'aria-label': label })}
                onPress={tappable ? () => onRegionPress!(m!.id, r) : undefined}
              />
            </G>
          );
        })}
      </G>

      {art.ink.map((d, i) => (
        <Path key={`ink${i}`} d={d} fill="none" stroke={ink.ink} strokeWidth={INK_STROKE * 0.66} strokeLinecap="round" strokeLinejoin="round" opacity={locked ? 0.5 : 1} />
      ))}

      {/* glyphs sit above the ink so they stay readable */}
      {!locked && regionIds.map((r) => {
        const m = byRegion[r];
        if (!m || m.status === 'complete' || !interactive) return null;
        const [x, y] = art.regions[r].labelAt;
        const s = GLYPH / 24;
        return (
          <G key={`g${r}`} transform={`translate(${x - GLYPH / 2} ${y - GLYPH / 2}) scale(${s})`} pointerEvents="none">
            <Circle cx={12} cy={12} r={14} fill={ink.page} fillOpacity={0.85} />
            {m.status === 'pending'
              ? <HourglassGlyph color={ink.inkSoft} strokeWidth={2.4} />
              : <MissionTypeGlyph type={m.type} color={ink.inkSoft} strokeWidth={2.4} />}
          </G>
        );
      })}

      {/* sparkles + crayon tip ride above the ink so the moment isn't hidden under detail lines */}
      {regionIds.map((r) => (filling[r] || glowing[r] ? (
        <RevealOverlay
          key={`fx${r}${filling[r] ?? `g${glowing[r]}`}`} d={art.regions[r].d} origin={art.regions[r].labelAt} glowOnly={!filling[r]}
          color={crayonHex(byRegion[r] ? missionColors(byRegion[r], members)[0] : null)}
        />
      ) : null))}
    </Svg>
  );
}

interface RegionBodyProps {
  regionId: string;
  d: string;
  labelAt: [number, number];
  mission: Mission | undefined;
  status: Mission['status'];
  members: FellowshipMember[];
  clipId: string;
  grainId: string;
  shineId: string;
  fillStamp?: number;
  glowStamp?: number;
}

function RegionBody({ d, labelAt, mission, status, members, clipId, grainId, shineId, fillStamp, glowStamp }: RegionBodyProps) {
  if (status === 'locked' || !mission) return <Path d={d} fill={ink.page} />;

  if (status === 'open') {
    return (
      <G>
        <Path d={d} fill={ink.page} />
        <G clipPath={`url(#${clipId})`}>
          <Path d={d} fill="none" stroke={ink.ink} strokeOpacity={0.22} strokeWidth={30} strokeDasharray="4 16" />
        </G>
      </G>
    );
  }

  if (status === 'pending') {
    const giver = missionColors(mission, members)[0];
    return (
      <G>
        <Path d={d} fill={ink.page} />
        <Path d={d} fill={crayonHex(giver)} fillOpacity={0.25} />
      </G>
    );
  }

  // complete: waxy crayon fill — base color, a darker "pressed harder" rim, paper-tooth grain, teammate stripes
  const colors = missionColors(mission, members);
  const hex = crayonHex(colors[0]);
  const others = colors.slice(1, 4);
  const fill = (
    <G>
      <Path d={d} fill={ink.page} />
      <Path d={d} fill={hex} fillOpacity={0.9} />
      <G clipPath={`url(#${clipId})`}>
        <Path d={d} fill="none" stroke={shade(hex, -0.28)} strokeOpacity={0.28} strokeWidth={30} strokeLinejoin="round" />
        {others
          .map((c, i) => ({ c, w: INK_STROKE + STRIPE * 2 * (i + 1) }))
          .reverse()
          .map(({ c, w }) => (
            <Path key={c + w} d={d} fill="none" stroke={crayonHex(c)} strokeWidth={w} strokeLinejoin="round" />
          ))}
      </G>
      <Path d={d} fill={`url(#${grainId})`} />
    </G>
  );
  if (!fillStamp) {
    if (!glowStamp) return fill;
    return <G>{fill}<Shine key={glowStamp} d={d} clipId={clipId} shineId={shineId} at={GLOW_SHIMMER_AT} /></G>;
  }
  return <ScribbleReveal key={fillStamp} d={d} origin={labelAt} clipId={clipId} shineId={shineId} color={hex}>{fill}</ScribbleReveal>;
}

interface Scribble { path: string; length: number; xs: number[]; ys: number[]; at: number[] }

/** Back-and-forth crayon strokes covering the region's bounding box (top → bottom), slightly wobbly, plus samples
 *  along the stroke (normalized arc length → point) so the crayon tip can ride the line on the UI thread. */
function scribblePath(d: string, seed: number): Scribble {
  const b = pathBounds(d);
  const step = 30; // vertical advance per stroke; stroke width 54 → full coverage
  const pad = 24;
  const rnd = (i: number) => {
    const x = Math.sin((seed + i) * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  let x = b.minX - pad;
  let y = b.minY - pad;
  let path = `M${x.toFixed(1)} ${y.toFixed(1)}`;
  const xs = [x], ys = [y], lens = [0];
  let length = 0;
  for (let i = 0; y < b.maxY + pad; i++) {
    const nx = i % 2 === 0 ? b.maxX + pad - rnd(i) * 30 : b.minX - pad + rnd(i) * 30;
    const ny = y + step * (0.8 + rnd(i + 99) * 0.4);
    const cx = (x + nx) / 2;
    const cy = (y + ny) / 2 - 18 + rnd(i + 7) * 36; // a little curve per stroke
    path += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
    let px = x, py = y;
    for (let k = 1; k <= 6; k++) {
      const t = k / 6, u = 1 - t;
      const qx = u * u * x + 2 * u * t * cx + t * t * nx;
      const qy = u * u * y + 2 * u * t * cy + t * t * ny;
      length += Math.hypot(qx - px, qy - py);
      xs.push(qx); ys.push(qy); lens.push(length);
      px = qx; py = qy;
    }
    x = nx;
    y = ny;
  }
  return { path, length: length * 1.02, xs, ys, at: lens.map((l) => l / (length || 1)) };
}

/**
 * Beat 1–2: a crayon scribbles back and forth across the region (you SEE it being colored), then the waxy fill
 * settles in on top. Beat 4: a soft light shimmer sweeps across the fresh color.
 * Every animated layer also gets STATIC props equal to its start value: on web the animated props land a frame
 * after mount, and without these the finished color flashed in first (V3).
 */
function ScribbleReveal({ d, origin, clipId, shineId, color, children }: { d: string; origin: [number, number]; clipId: string; shineId: string; color: string; children: React.ReactNode }) {
  const { path, length } = useMemo(() => scribblePath(d, Math.round(origin[0] + origin[1])), [d, origin]);
  const draw = useSharedValue(0);
  const settle = useSharedValue(0);
  useEffect(() => {
    draw.value = withTiming(1, { duration: SCRIBBLE_MS, easing: Easing.inOut(Easing.quad) });
    settle.value = withDelay(SETTLE_AT, withTiming(1, { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) }));
  }, [draw, settle]);
  const strokeProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.value) }));
  const fillProps = useAnimatedProps(() => ({ opacity: settle.value }));
  return (
    <G>
      <Path d={d} fill={ink.page} />
      <G clipPath={`url(#${clipId})`}>
        <AnimatedPath
          d={path}
          fill="none"
          stroke={color}
          strokeOpacity={0.9}
          strokeWidth={54}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length}
          animatedProps={strokeProps}
        />
      </G>
      <AnimatedG opacity={0} animatedProps={fillProps}>{children}</AnimatedG>
      <Shine d={d} clipId={clipId} shineId={shineId} at={SHIMMER_AT} />
    </G>
  );
}

/** A soft band of light sweeping once across the region (clipped to it), starting `at` ms after mount. */
function Shine({ d, clipId, shineId, at }: { d: string; clipId: string; shineId: string; at: number }) {
  const b = useMemo(() => pathBounds(d), [d]);
  const shine = useSharedValue(0);
  useEffect(() => {
    shine.value = withDelay(at, withTiming(1, { duration: SHIMMER_MS, easing: Easing.inOut(Easing.sin) }));
  }, [shine, at]);
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const span = (b.maxX - b.minX + b.maxY - b.minY) / 2 + 220;
  const bandW = 200;
  const tall = (b.maxY - b.minY + b.maxX - b.minX) * 1.6 + 200;
  const shineProps = useAnimatedProps(() => ({
    x: cx - span + 2 * span * shine.value - bandW / 2,
    opacity: shine.value <= 0 || shine.value >= 1 ? 0 : 1,
  }));
  return (
    <G clipPath={`url(#${clipId})`} pointerEvents="none">
      <G transform={`rotate(-22 ${cx} ${cy})`}>
        <AnimatedRect y={cy - tall / 2} width={bandW} height={tall} fill={`url(#${shineId})`} opacity={0} animatedProps={shineProps} />
      </G>
    </G>
  );
}

/** Crayon outline with its tip at (x, y), body angled up-right like a hand holding it. */
function crayonPath(x: number, y: number): { body: string; band: string } {
  'worklet';
  const ux = 0.62, uy = -0.78, vx = 0.78, vy = 0.62; // along the crayon / across it
  const P = (a: number, c: number) => `${(x + ux * a + vx * c).toFixed(1)} ${(y + uy * a + vy * c).toFixed(1)}`;
  const body = `M${P(0, 0)} L${P(40, 17)} L${P(160, 19)} L${P(160, -19)} L${P(40, -17)} Z`;
  const band = `M${P(70, 19)} L${P(120, 19)} L${P(120, -19)} L${P(70, -19)} Z`;
  return { body, band };
}

/**
 * Beat 1 (the crayon tip riding the scribble) and beat 3 (gold ring + sparkle burst), drawn above the ink layer.
 * `glowOnly`: just the ring + sparkles, right away (the region is already colored).
 */
function RevealOverlay({ d, origin, color, glowOnly = false }: { d: string; origin: [number, number]; color: string; glowOnly?: boolean }) {
  const s = useMemo(() => scribblePath(d, Math.round(origin[0] + origin[1])), [d, origin]);
  const b = useMemo(() => pathBounds(d), [d]);
  const draw = useSharedValue(0);
  const burst = useSharedValue(0);
  useEffect(() => {
    draw.value = withTiming(1, { duration: SCRIBBLE_MS, easing: Easing.inOut(Easing.quad) });
    burst.value = withDelay(glowOnly ? GLOW_SPARKLE_AT : SPARKLE_AT, withTiming(1, { duration: SPARKLE_MS, easing: Easing.out(Easing.quad) }));
  }, [draw, burst, glowOnly]);
  const { xs, ys, at } = s;
  const tip = useAnimatedProps(() => {
    const p = draw.value;
    let i = 1;
    while (i < at.length - 1 && at[i] < p) i++;
    const a0 = at[i - 1], a1 = at[i];
    const t = a1 > a0 ? Math.min(Math.max((p - a0) / (a1 - a0), 0), 1) : 0;
    const x = xs[i - 1] + (xs[i] - xs[i - 1]) * t;
    const y = ys[i - 1] + (ys[i] - ys[i - 1]) * t;
    const c = crayonPath(x, y);
    const fade = p < 0.06 ? p / 0.06 : p > 0.94 ? (1 - p) / 0.06 : 1;
    return { d: c.body, opacity: p <= 0 || p >= 1 ? 0 : fade };
  });
  const band = useAnimatedProps(() => {
    const p = draw.value;
    let i = 1;
    while (i < at.length - 1 && at[i] < p) i++;
    const a0 = at[i - 1], a1 = at[i];
    const t = a1 > a0 ? Math.min(Math.max((p - a0) / (a1 - a0), 0), 1) : 0;
    const c = crayonPath(xs[i - 1] + (xs[i] - xs[i - 1]) * t, ys[i - 1] + (ys[i] - ys[i - 1]) * t);
    const fade = p < 0.06 ? p / 0.06 : p > 0.94 ? (1 - p) / 0.06 : 1;
    return { d: c.band, opacity: p <= 0 || p >= 1 ? 0 : fade };
  });
  const ringR = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.55 + 40;
  const ring = useAnimatedProps(() => {
    const p = burst.value;
    return { r: 20 + (ringR - 20) * p, strokeOpacity: p <= 0 ? 0 : 0.85 * (1 - p), strokeWidth: 14 - 10 * p };
  });
  return (
    <G pointerEvents="none">
      <AnimatedCircle cx={origin[0]} cy={origin[1]} r={20} fill="none" stroke={ink.gold} strokeOpacity={0} animatedProps={ring} />
      {Array.from({ length: SPARKS }, (_, i) => <Spark key={i} i={i} t={burst} origin={origin} reach={ringR} />)}
      {glowOnly ? null : (
        <>
          <AnimatedPath opacity={0} animatedProps={tip} fill={color} stroke={ink.ink} strokeWidth={5} strokeLinejoin="round" />
          <AnimatedPath opacity={0} animatedProps={band} fill={ink.page} fillOpacity={0.55} stroke={ink.ink} strokeWidth={3} />
        </>
      )}
    </G>
  );
}

const SPARKS = 9;
function sparkPath(cx: number, cy: number, r: number): string {
  'worklet';
  const k = r * 0.3;
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

function Spark({ i, t, origin, reach }: { i: number; t: SharedValue<number>; origin: [number, number]; reach: number }) {
  const angle = (i / SPARKS) * Math.PI * 2 + 0.3;
  const dist = Math.min(reach, 220) * (0.55 + (i % 3) * 0.2);
  const size = 22 + (i % 3) * 9;
  const lag = (i % 3) * 0.08; // a little stagger so it twinkles instead of popping
  const props = useAnimatedProps(() => {
    const p = Math.min(Math.max((t.value - lag) / (1 - lag), 0), 1);
    const x = origin[0] + Math.cos(angle) * dist * p;
    const y = origin[1] + Math.sin(angle) * dist * p;
    const r = p <= 0 ? 0.01 : size * (p < 0.35 ? p / 0.35 : 1 - (p - 0.35) * 0.7);
    return { d: sparkPath(x, y, r), opacity: p <= 0 ? 0 : 1 - p * p };
  });
  return <AnimatedPath opacity={0} animatedProps={props} fill={ink.gold} stroke={ink.ink} strokeWidth={3.5} strokeLinejoin="round" />;
}

export const ColoringPage = memo(ColoringPageImpl);
export default ColoringPage;
