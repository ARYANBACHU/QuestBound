// Owner: AB. Round lavender 🧙 button with a soft gold ring. Tap = Wizard sheet. Long-press = Demo Tools.
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';
import { ink } from '@/shared/theme';
import { T } from '@/components/shell/T';
import { useWizard } from './WizardProvider';

export const FAB_SIZE = 60;

export function WizardFab({ bottom }: { bottom: number }) {
  const { open, openDemoTools } = useWizard();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ask Muse the Wizard"
      accessibilityHint="Long-press for demo tools"
      onPress={() => { Haptics.selectionAsync().catch(() => {}); open(); }}
      onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); openDemoTools(); }}
      delayLongPress={600}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && styles.pressed]}
    >
      <T style={styles.emoji}>🧙</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', right: 16, width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    backgroundColor: ink.lavenderMist, borderWidth: 2.5, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center',
    // soft gold ring
    shadowColor: ink.gold, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6,
    outlineColor: ink.gold, outlineWidth: 3, outlineStyle: 'solid', outlineOffset: 2,
  },
  pressed: { transform: [{ scale: 0.93 }] },
  emoji: { fontSize: 30, lineHeight: 38 },
});
