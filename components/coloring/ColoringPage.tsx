// Owner: AD. THE coloring page: every region is a mission; completing it fills the region with crayon color.
'use no memo'; // mock store mutates rows in place; opt out of React Compiler auto-memo so updates always render
// <ColoringPage templateId missions members onRegionPress highlightRegionId? interactive? locked? width? />
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { PAGE_ART, VIEW_H, VIEW_W } from '@/assets/pages';
import { frameBand } from '@/assets/pages/shapes';
import { TEMPLATES, type TemplateId } from '@/shared/templates';
import { INK_STROKE, ink, moodFor, space, type CrayonColor } from '@/shared/theme';
import type { FellowshipMember, Mission } from '@/shared/types';
import { HourglassGlyph, MissionTypeGlyph } from './MissionTypeIcon';
import { playSfx } from './sfx';
import { STATUS_LABEL, crayonHex, missionColors, pathBounds, shade } from './pageUtils';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

export const FILL_MS = 1200; // scribble sweep + settle into the textured fill
const SCRIBBLE_MS = 850;
const SETTLE_MS = 380;
const SPARKLE_MS = 500;
const STRIPE = 12; // teammate stripe width in viewBox units (~4 px on a phone)
const GLYPH = 60;
const NATIVE = Platform.OS !== 'web';
const FRAME_BAND = frameBand();

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
}

function ColoringPageImpl({
  templateId, missions, members, onRegionPress, highlightRegionId, interactive = true, locked = false, width, animate = true,
}: ColoringPageProps) {
  const art = PAGE_ART[templateId];
  const mood = moodFor(templateId);
  const template = TEMPLATES[templateId];
  const { width: screenW } = useWindowDimensions();
  const w = width ?? Math.min(screenW - 2 * space.lg, 560);
  const h = (w * VIEW_H) / VIEW_W;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const byRegion = useMemo(() => {
    const map: Record<string, Mission> = {};
    for (const m of missions) map[m.region_id] = m;
    return map;
  }, [missions]);

  // --- detect open/pending → complete transitions while mounted ---
  const reduced = useReducedMotion();
  const prev = useRef<Record<string, string> | null>(null);
  const [filling, setFilling] = useState<Record<string, number>>({}); // regionId -> start stamp
  useEffect(() => {
    const now: Record<string, string> = {};
    for (const m of missions) now[m.region_id] = m.status;
    const before = prev.current;
    prev.current = now;
    if (!before || !animate) return;
    const fresh = Object.keys(now).filter((r) => now[r] === 'complete' && before[r] && before[r] !== 'complete');
    if (!fresh.length) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    playSfx('crayon');
    if (reduced) return; // colors appear instantly
    const stamp = Date.now();
    setFilling((f) => ({ ...f, ...Object.fromEntries(fresh.map((r) => [r, stamp])) }));
    const t = setTimeout(() => {
      setFilling((f) => {
        const next = { ...f };
        for (const r of fresh) if (next[r] === stamp) delete next[r];
        return next;
      });
    }, FILL_MS + SPARKLE_MS + 150);
    return () => clearTimeout(t);
  }, [missions, animate, reduced]);

  const [pressed, setPressed] = useState<string | null>(null);

  // every crayon color used on this page needs a texture pattern
  const colorsUsed = useMemo(() => {
    const s = new Set<CrayonColor>();
    for (const m of missions) if (m.status === 'complete') missionColors(m, members).forEach((c) => s.add(c));
    return [...s];
  }, [missions, members]);

  const regionIds = template.regions.map((r) => r.id).filter((id) => art.regions[id]);
  const id = (k: string) => `${uid}${k}`;

  return (
    <Svg width={w} height={h} viewBox={art.viewBox}>
      <Defs>
        <LinearGradient id={id('frame')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={mood.gradient[0]} />
          <Stop offset="1" stopColor={mood.gradient[1]} />
        </LinearGradient>
        {colorsUsed.map((c) => {
          const dark = shade(crayonHex(c), -0.35);
          return (
            <Pattern key={c} id={id(`tex${c}`)} patternUnits="userSpaceOnUse" width={36} height={36} patternTransform="rotate(-32)">
              <Line x1={0} y1={4} x2={36} y2={4} stroke={dark} strokeWidth={5} strokeOpacity={0.3} strokeLinecap="round" />
              <Line x1={0} y1={14} x2={36} y2={15} stroke={dark} strokeWidth={2.5} strokeOpacity={0.24} strokeLinecap="round" />
              <Line x1={0} y1={22} x2={36} y2={21} stroke={dark} strokeWidth={4} strokeOpacity={0.28} strokeLinecap="round" />
              <Line x1={0} y1={31} x2={36} y2={31.5} stroke={dark} strokeWidth={1.5} strokeOpacity={0.22} strokeLinecap="round" />
            </Pattern>
          );
        })}
        {regionIds.map((r) => (
          <ClipPath key={r} id={id(`clip${r}`)}>
            <Path d={art.regions[r].d} />
          </ClipPath>
        ))}
      </Defs>

      <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={ink.page} />
      <Path d={FRAME_BAND} fill={`url(#${id('frame')})`} opacity={locked ? 0.45 : 1} />
      {art.background?.map((d, i) => (
        <Path key={`bg${i}`} d={d} fill="none" stroke={ink.muted} strokeOpacity={0.45} strokeWidth={5} strokeLinecap="round" />
      ))}

      <G opacity={locked ? 0.4 : 1}>
        {regionIds.map((r) => {
          const ra = art.regions[r];
          const m = locked ? undefined : byRegion[r];
          const status = locked ? 'locked' : m?.status ?? 'open';
          const tappable = interactive && !locked && !!m && !!onRegionPress;
          const isPressed = pressed === r;
          const [lx, ly] = ra.labelAt;
          const transform = isPressed ? `translate(${lx} ${ly}) scale(0.98) translate(${-lx} ${-ly})` : undefined;
          const label = `${template.regions.find((x) => x.id === r)?.label ?? r}: ${m?.title ?? 'not yet written'}, ${STATUS_LABEL[status]}`;
          return (
            <G key={r} transform={transform}>
              <RegionBody
                regionId={r} d={ra.d} labelAt={ra.labelAt} mission={m} status={status} members={members}
                clipId={id(`clip${r}`)} texId={(c) => id(`tex${c}`)} fillStamp={filling[r]}
              />
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
  texId: (c: CrayonColor) => string;
  fillStamp?: number;
}

function RegionBody({ d, labelAt, mission, status, members, clipId, texId, fillStamp }: RegionBodyProps) {
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

  // complete: crayon fill + texture + teammate stripes along the inner edge
  const colors = missionColors(mission, members);
  const main = colors[0];
  const hex = crayonHex(main);
  const others = colors.slice(1, 4);
  const fill = (
    <G>
      <Path d={d} fill={ink.page} />
      <Path d={d} fill={hex} fillOpacity={0.85} />
      {main && <Path d={d} fill={`url(#${texId(main)})`} />}
      {others.length > 0 && (
        <G clipPath={`url(#${clipId})`}>
          {others
            .map((c, i) => ({ c, w: INK_STROKE + STRIPE * 2 * (i + 1) }))
            .reverse()
            .map(({ c, w }) => (
              <Path key={c + w} d={d} fill="none" stroke={crayonHex(c)} strokeWidth={w} strokeLinejoin="round" />
            ))}
        </G>
      )}
    </G>
  );
  if (!fillStamp) return fill;
  return <ScribbleReveal key={fillStamp} d={d} origin={labelAt} clipId={clipId} color={hex}>{fill}</ScribbleReveal>;
}

/** Back-and-forth crayon strokes covering the region's bounding box (top → bottom), slightly wobbly. */
function scribblePath(d: string, seed: number): { path: string; length: number } {
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
  let length = 0;
  for (let i = 0; y < b.maxY + pad; i++) {
    const nx = i % 2 === 0 ? b.maxX + pad - rnd(i) * 30 : b.minX - pad + rnd(i) * 30;
    const ny = y + step * (0.8 + rnd(i + 99) * 0.4);
    const cx = (x + nx) / 2;
    const cy = (y + ny) / 2 - 18 + rnd(i + 7) * 36; // a little curve per stroke
    path += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
    length += Math.hypot(nx - x, ny - y) * 1.04;
    x = nx;
    y = ny;
  }
  return { path, length };
}

/**
 * The moment: a crayon scribbles back and forth across the region (you SEE it being colored), then the
 * textured crayon fill settles in on top, with a gold sparkle burst.
 */
function ScribbleReveal({ d, origin, clipId, color, children }: { d: string; origin: [number, number]; clipId: string; color: string; children: React.ReactNode }) {
  const { path, length } = useMemo(() => scribblePath(d, Math.round(origin[0] + origin[1])), [d, origin]);
  const draw = useSharedValue(0);
  const settle = useSharedValue(0);
  useEffect(() => {
    draw.value = withTiming(1, { duration: SCRIBBLE_MS, easing: Easing.inOut(Easing.quad) });
    settle.value = withDelay(SCRIBBLE_MS - 80, withTiming(1, { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) }));
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
          animatedProps={strokeProps}
        />
      </G>
      <AnimatedG animatedProps={fillProps}>{children}</AnimatedG>
      <SparkleBurst origin={origin} />
    </G>
  );
}

const SPARKS = 7;
function sparkPath(cx: number, cy: number, r: number): string {
  'worklet';
  const k = r * 0.3;
  return `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

function SparkleBurst({ origin }: { origin: [number, number] }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(FILL_MS * 0.8, withTiming(1, { duration: SPARKLE_MS, easing: Easing.out(Easing.quad) }));
  }, [t]);
  return (
    <G pointerEvents="none">
      {Array.from({ length: SPARKS }, (_, i) => <Spark key={i} i={i} t={t} origin={origin} />)}
    </G>
  );
}

function Spark({ i, t, origin }: { i: number; t: { value: number }; origin: [number, number] }) {
  const angle = (i / SPARKS) * Math.PI * 2 + 0.3;
  const dist = 70 + (i % 3) * 22;
  const size = 16 + (i % 2) * 10;
  const props = useAnimatedProps(() => {
    const p = t.value;
    const x = origin[0] + Math.cos(angle) * dist * p;
    const y = origin[1] + Math.sin(angle) * dist * p;
    const r = p <= 0 ? 0.01 : size * (p < 0.4 ? p / 0.4 : 1 - (p - 0.4) * 0.6);
    return { d: sparkPath(x, y, r), opacity: p <= 0 ? 0 : 1 - p * p };
  });
  return <AnimatedPath animatedProps={props} fill={ink.gold} stroke={ink.page} strokeWidth={3} />;
}

export const ColoringPage = memo(ColoringPageImpl);
export default ColoringPage;
