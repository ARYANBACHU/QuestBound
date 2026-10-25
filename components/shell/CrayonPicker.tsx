// Owner: AB. Crayon picker: big labeled crayon swatches with an unmistakable selected state (thick ring, check, lift),
// friends' crayons marked with their crest (allowed, discouraged), plus <CrayonPreview> — a mini region that fills
// with the chosen color. Used by onboarding + Settings.
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { CRAYON_LIST, CRAYONS, CRESTS, ink, panel, radius, shadow, space, ui, type CrayonColor, type CrestId } from '@/shared/theme';
import { T } from './T';

export function crayonName(c: CrayonColor) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

/** Sage's line when you pick a crayon. */
export const CRAYON_QUIPS: Record<CrayonColor, string> = {
  rose: 'Rose! Bold and blooming. The castle walls are blushing already.',
  marigold: 'Marigold! Sunshine in a stick. Every region you touch will glow.',
  fern: 'Fern! Green as the deep forest. The trees approve.',
  lagoon: 'Lagoon! Cool as a moat on a summer day.',
  violet: 'Violet! The color of wizards. I may be biased.',
  ember: 'Ember! Warm as a dragon’s yawn. Mind the eyebrows.',
  teal: 'Teal! Swamp-chic and proud of it.',
  plum: 'Plum! Royal, mysterious, a little dramatic. Perfect.',
};

export function CrayonShape({ color, width = 34, height = 110, selected }: { color: string; width?: number; height?: number; selected?: boolean }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 34 110">
      <Path d="M9 26 L17 3 L25 26 Z" fill={color} stroke={ink.ink} strokeWidth={2.4} strokeLinejoin="round" />
      <Rect x={5} y={26} width={24} height={80} rx={4} fill={color} stroke={ink.ink} strokeWidth={selected ? 3.4 : 2.4} />
      <Rect x={5} y={44} width={24} height={44} fill={ink.page} fillOpacity={0.85} stroke={ink.ink} strokeWidth={2} />
      <Path d="M9 52h16M9 80h16" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

export function CrayonPicker({ value, onChange, takenBy = {} }: {
  value: CrayonColor | null;
  onChange: (c: CrayonColor) => void;
  takenBy?: Partial<Record<CrayonColor, CrestId>>;
}) {
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {CRAYON_LIST.map((c) => (
        <Swatch key={c} color={c} selected={value === c} taken={takenBy[c]} onPress={() => onChange(c)} />
      ))}
    </View>
  );
}

function Swatch({ color, selected, taken, onPress }: { color: CrayonColor; selected: boolean; taken?: CrestId; onPress: () => void }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(selected ? 1.07 : 1, { damping: 9, stiffness: 260 });
  }, [selected, scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const hex = CRAYONS[color];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${crayonName(color)} crayon${taken ? `, already ${CRESTS[taken].title}'s crayon` : ''}`}
      onPress={() => {
        if (taken) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        else Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={styles.cellWrap}
    >
      <Animated.View style={[styles.cell, selected ? { borderColor: hex, borderWidth: 4 } : null, selected && shadow.md, anim]}>
        <View style={taken && !selected ? styles.dim : undefined}>
          <CrayonShape color={hex} width={30} height={78} selected={selected} />
        </View>
        <T variant="smallBold" color={selected ? ink.ink : ink.inkSoft} numberOfLines={1} style={styles.label}>
          {crayonName(color)}
        </T>
        {selected ? (
          <View style={styles.check}><T variant="smallBold" color={ink.page} style={styles.checkText}>✓</T></View>
        ) : null}
        {taken ? (
          <View style={styles.taken}><T style={styles.takenEmoji}>{CRESTS[taken].emoji}</T></View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** A tiny coloring-page vignette whose tower region fills with the chosen crayon. */
export function CrayonPreview({ color, width = 132 }: { color: CrayonColor | null; width?: number }) {
  const h = width * 0.7;
  const tower = 'M52 78 L52 40 L46 40 L46 30 L54 30 L54 35 L60 35 L60 30 L68 30 L68 35 L74 35 L74 30 L82 30 L82 40 L76 40 L76 78 Z';
  const hill = 'M4 92 C30 70 54 66 66 78 C80 64 110 68 136 90 L136 92 Z';
  return (
    <View style={[styles.preview, { width, height: h }]} accessibilityLabel={color ? `Preview: a region colored ${crayonName(color)}` : 'Preview'}>
      <Svg width={width} height={h} viewBox="0 0 140 98">
        <Rect x={2} y={2} width={136} height={94} rx={12} fill={ink.page} />
        <Path d={hill} fill={ink.page} stroke={ink.ink} strokeWidth={3} strokeLinejoin="round" />
        <Path d={tower} fill={ink.page} stroke={ink.ink} strokeWidth={3} strokeLinejoin="round" />
      </Svg>
      {color ? (
        <Animated.View key={color} entering={FadeIn.duration(650)} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={width} height={h} viewBox="0 0 140 98">
            <Path d={tower} fill={CRAYONS[color]} stroke={ink.ink} strokeWidth={3} strokeLinejoin="round" />
            <Path d="M58 46 L58 70 M64 44 L64 72 M70 46 L70 70" stroke={ink.page} strokeOpacity={0.35} strokeWidth={2}
              strokeLinecap="round" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  cellWrap: { width: '23.5%' },
  cell: {
    alignItems: 'center', paddingTop: space.sm, paddingBottom: space.xs, borderRadius: radius.md, borderWidth: 2,
    borderColor: ink.ink, backgroundColor: panel.parchment,
  },
  label: { marginTop: 2, fontSize: 12 },
  dim: { opacity: 0.5 },
  check: {
    position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: ink.ink,
    borderWidth: 2, borderColor: ink.page, alignItems: 'center', justifyContent: 'center',
  },
  checkText: { lineHeight: 16 },
  taken: {
    position: 'absolute', top: 30, width: 26, height: 26, borderRadius: 13, backgroundColor: ink.page,
    borderWidth: 1.5, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center',
  },
  takenEmoji: { fontSize: 14, lineHeight: 18 },
  preview: { borderRadius: ui.cardRadius - 8, overflow: 'hidden', borderWidth: 2.5, borderColor: ink.ink, backgroundColor: ink.page },
});
