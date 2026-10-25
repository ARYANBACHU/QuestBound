// Owner: AB. Calm full-screen loader used by the gate and slow screens: Sage (thinking) + one narrated line.
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Sage } from '@/components/wizard/Sage';
import { SCREEN_GRADIENTS, ink, space } from '@/shared/theme';
import { T } from './T';

export function ParchmentLoading({ line = 'Sage is turning the pages…' }: { line?: string }) {
  return (
    <LinearGradient colors={SCREEN_GRADIENTS.castle} style={styles.wrap}>
      <Sage expression="thinking" size="lg" />
      <T variant="title" center style={styles.title}>Questbound</T>
      <T variant="story" center>{line}</T>
      <ActivityIndicator color={ink.ink} style={styles.spinner} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  title: { marginTop: space.lg, marginBottom: space.xs },
  spinner: { marginTop: space.xl },
});
