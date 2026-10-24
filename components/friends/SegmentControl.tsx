// Owner: MP. Two-or-more option pill switch (ink outline, ink fill for the selected one).
import { haptic } from './haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, ink, radius, space, type } from '@/shared/theme';

export interface SegmentControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export default function SegmentControl<T extends string>({ options, value, onChange }: SegmentControlProps<T>) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return;
              haptic.select();
              onChange(o.value);
            }}
            style={[styles.seg, on && styles.on]}
          >
            <Text style={[styles.text, on && styles.textOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', marginHorizontal: space.lg, borderWidth: 2.5, borderColor: ink.ink, borderRadius: radius.pill, padding: 3, backgroundColor: ink.page },
  seg: { flex: 1, paddingVertical: 7, borderRadius: radius.pill, alignItems: 'center' },
  on: { backgroundColor: ink.ink },
  text: { fontFamily: fonts.bodyBold, fontSize: type.body - 1, color: ink.inkSoft },
  textOn: { color: ink.page },
});
