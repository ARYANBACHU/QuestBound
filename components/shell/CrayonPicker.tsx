// Owner: AB. 8 crayons drawn as crayon shapes (SVG). Colors taken by fellow members show their crest (allowed, discouraged).
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { CRAYON_LIST, CRAYONS, CRESTS, ink, space, type CrayonColor, type CrestId } from '@/shared/theme';
import { T } from './T';

export function crayonName(c: CrayonColor) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export function CrayonShape({ color, width = 34, height = 110, selected }: { color: string; width?: number; height?: number; selected?: boolean }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 34 110">
      {/* tip */}
      <Path d="M9 26 L17 3 L25 26 Z" fill={color} stroke={ink.ink} strokeWidth={2.4} strokeLinejoin="round" />
      {/* body */}
      <Rect x={5} y={26} width={24} height={80} rx={4} fill={color} stroke={ink.ink} strokeWidth={selected ? 3.4 : 2.4} />
      {/* paper wrapper */}
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
    <View style={styles.row}>
      {CRAYON_LIST.map((c) => {
        const selected = value === c;
        const taken = takenBy[c];
        return (
          <Pressable
            key={c}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${crayonName(c)} crayon${taken ? ', already used by a friend' : ''}`}
            onPress={() => {
              if (taken) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
              else Haptics.selectionAsync().catch(() => {});
              onChange(c);
            }}
            style={[styles.cell, selected && styles.lift]}
          >
            <View style={taken && !selected ? styles.dim : undefined}>
              <CrayonShape color={CRAYONS[c]} selected={selected} />
            </View>
            {taken ? (
              <View style={styles.taken}><T style={styles.takenEmoji}>{CRESTS[taken].emoji}</T></View>
            ) : null}
            <T variant={selected ? 'smallBold' : 'small'} color={selected ? ink.ink : ink.inkSoft} style={styles.label}>
              {crayonName(c)}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.lg },
  cell: { width: '24%', alignItems: 'center' },
  lift: { transform: [{ translateY: -10 }] },
  dim: { opacity: 0.45 },
  taken: {
    position: 'absolute', top: 54, width: 28, height: 28, borderRadius: 14, backgroundColor: ink.page,
    borderWidth: 1.5, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center',
  },
  takenEmoji: { fontSize: 15, lineHeight: 20 },
  label: { marginTop: space.xs, fontSize: 12 },
});
