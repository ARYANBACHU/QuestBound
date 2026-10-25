// Owner: AB. Interest chips grouped by INTERESTS[].group, with min/max. Used by onboarding + settings.
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { INTERESTS, accent, ink, radius, space } from '@/shared/theme';
import { T } from './T';
import { playSfx } from './sfx';

export const INTEREST_MIN = 3;
export const INTEREST_MAX = 8;

const GROUPS = INTERESTS.reduce<string[]>((acc, i) => (acc.includes(i.group) ? acc : [...acc, i.group]), []);

export function InterestPicker({ value, onChange, onPick }: {
  value: string[];
  onChange: (next: string[]) => void;
  onPick?: (id: string, next: string[]) => void; // fired when an interest is added (Sage quips)
}) {
  const toggle = (id: string) => {
    if (value.includes(id)) {
      Haptics.selectionAsync().catch(() => {}); playSfx('toggle');
      onChange(value.filter((v) => v !== id));
      return;
    }
    if (value.length >= INTEREST_MAX) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); playSfx('error');
      return;
    }
    Haptics.selectionAsync().catch(() => {}); playSfx('toggle');
    const next = [...value, id];
    onChange(next);
    onPick?.(id, next);
  };
  return (
    <View style={{ gap: space.lg }}>
      {GROUPS.map((g) => (
        <View key={g} style={{ gap: space.sm }}>
          <T variant="smallBold" color={ink.inkSoft}>{g}</T>
          <View style={styles.wrap}>
            {INTERESTS.filter((i) => i.group === g).map((i) => {
              const on = value.includes(i.id);
              return (
                <Pressable
                  key={i.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(i.id)}
                  style={[styles.chip, on && styles.on]}
                >
                  <T variant={on ? 'smallBold' : 'small'} color={on ? accent.onPrimary : ink.ink}>{on ? '✓ ' : ''}{i.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.md, backgroundColor: ink.page },
  on: { backgroundColor: accent.primary, borderColor: ink.ink },
});
