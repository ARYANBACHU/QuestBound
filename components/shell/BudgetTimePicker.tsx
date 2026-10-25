// Owner: AB. Budget segmented control + availability toggles. Used by onboarding + settings.
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Budget } from '@/shared/types';
import { accent, ink, radius, space } from '@/shared/theme';
import { T } from './T';

const BUDGETS: { id: Budget; label: string }[] = [
  { id: 'free', label: 'Free' }, { id: '$', label: '$' }, { id: '$$', label: '$$' }, { id: '$$$', label: '$$$' },
];
export const AVAILABILITY: { id: string; label: string; icon: string }[] = [
  { id: 'weekday_evenings', label: 'Weekday evenings', icon: '🌙' },
  { id: 'weekends', label: 'Weekends', icon: '☀️' },
  { id: 'spontaneous', label: 'Spontaneous', icon: '✨' },
];

export function BudgetPicker({ value, onChange }: { value: Budget; onChange: (b: Budget) => void }) {
  return (
    <View style={styles.segment}>
      {BUDGETS.map((b, i) => {
        const on = value === b.id;
        return (
          <Pressable
            key={b.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(b.id); }}
            style={[styles.seg, i > 0 && styles.segDivider, on && styles.segOn]}
          >
            <T variant="bodyBold" color={on ? accent.onPrimary : ink.ink}>{b.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AvailabilityPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <View style={{ gap: space.sm }}>
      {AVAILABILITY.map((a) => {
        const on = value.includes(a.id);
        return (
          <Pressable
            key={a.id}
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(on ? value.filter((v) => v !== a.id) : [...value, a.id]);
            }}
            style={[styles.toggle, on && styles.toggleOn]}
          >
            <T style={styles.icon}>{a.icon}</T>
            <T variant="bodyBold" style={{ flex: 1 }}>{a.label}</T>
            <View style={[styles.box, on && styles.boxOn]}>{on ? <T variant="smallBold" color={ink.page}>✓</T> : null}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderWidth: 2.5, borderColor: ink.ink, borderRadius: radius.md, overflow: 'hidden', backgroundColor: ink.page },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.md },
  segDivider: { borderLeftWidth: 2, borderLeftColor: ink.ink },
  segOn: { backgroundColor: accent.primary },
  toggle: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 2, borderColor: ink.ink, borderRadius: radius.md,
    paddingVertical: space.md, paddingHorizontal: space.lg, backgroundColor: ink.page,
  },
  toggleOn: { backgroundColor: accent.primarySoft },
  icon: { fontSize: 20, lineHeight: 26 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: accent.primary },
});
