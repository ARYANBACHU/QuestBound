// Owner: AB. Calm full-screen "parchment" loader used by the gate and slow screens.
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ink, space } from '@/shared/theme';
import { T } from './T';

export function ParchmentLoading({ line = 'Muse is turning the pages…' }: { line?: string }) {
  return (
    <View style={styles.wrap}>
      <T variant="hero" style={styles.mark}>🪶</T>
      <T variant="title" center>Questbound</T>
      <T variant="story" center style={styles.line}>{line}</T>
      <ActivityIndicator color={ink.ink} style={{ marginTop: space.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: ink.paper, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  mark: { fontSize: 48, lineHeight: 60, marginBottom: space.md },
  line: { marginTop: space.sm },
});
