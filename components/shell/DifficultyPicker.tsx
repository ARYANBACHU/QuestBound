// Owner: AB. Easy / Normal / Hard (or Easier / Similar / Harder for a reroll) as three colored choice rows.
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Difficulty } from '@/shared/types';
import { DIFFICULTY_TONE, chips, ink, radius, space } from '@/shared/theme';
import { T } from './T';
import { playSfx } from './sfx';

const COPY: Record<'book' | 'reroll', Record<Difficulty, { label: string; sub: string; icon: string }>> = {
  book: {
    easy: { label: 'Easy', sub: 'Close by, cheap, quick quests', icon: '🌱' },
    normal: { label: 'Normal', sub: 'A balanced adventure', icon: '⚔️' },
    hard: { label: 'Hard', sub: 'Farther, bolder, legendary — 1.5× points', icon: '🐉' },
  },
  reroll: {
    easy: { label: 'Easier', sub: 'Closer, cheaper, quicker', icon: '🌱' },
    normal: { label: 'Similar', sub: 'Something different, same size', icon: '🎲' },
    hard: { label: 'Harder', sub: 'Bolder and more memorable', icon: '🐉' },
  },
};

export function DifficultyPicker({ value, onChange, kind = 'book' }: {
  value: Difficulty | null; onChange: (d: Difficulty) => void; kind?: 'book' | 'reroll';
}) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => {
        const on = value === d;
        const tone = chips[DIFFICULTY_TONE[d]];
        const c = COPY[kind][d];
        return (
          <Pressable
            key={d}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${c.label}. ${c.sub}`}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); playSfx('tap'); onChange(d); }}
            style={[styles.row, { borderColor: on ? tone.border : ink.ink, backgroundColor: on ? tone.bg : ink.page }, on && styles.on]}
          >
            <T style={styles.icon}>{c.icon}</T>
            <View style={{ flex: 1 }}>
              <T variant="bodyBold" color={on ? tone.fg : ink.ink}>{c.label}</T>
              <T variant="small">{c.sub}</T>
            </View>
            <View style={[styles.radio, { borderColor: on ? tone.border : ink.ink }]}>
              {on ? <View style={[styles.dot, { backgroundColor: tone.fg }]} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg,
    borderRadius: radius.md, borderWidth: 2,
  },
  on: { borderWidth: 3 },
  icon: { fontSize: 24, lineHeight: 30 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
