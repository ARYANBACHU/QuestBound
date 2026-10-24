// Owner: AB. Onboarding progress: small ink dots, the current one is a quill.
import { StyleSheet, View } from 'react-native';
import { ink, space } from '@/shared/theme';
import { T } from './T';

export function QuillDots({ count, index }: { count: number; index: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`Step ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) =>
        i === index ? (
          <T key={i} style={styles.quill}>🪶</T>
        ) : (
          <View key={i} style={[styles.dot, i < index && styles.done]} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, height: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: ink.ink },
  done: { backgroundColor: ink.ink },
  quill: { fontSize: 16, lineHeight: 22 },
});
