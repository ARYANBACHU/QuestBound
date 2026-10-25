// Owner: AB. Muse pops up once per tab with a one-sentence explanation. Tap to dismiss.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { ink, space } from '@/shared/theme';
import { T } from '@/components/shell/T';
import { hasSeenCoach, markCoachSeen, onCoachReset } from './coachMarks';
import { SageBubble } from './SageBubble';
import { COACH_MARKS, type WizardScreen } from './screens';

export function CoachMark({ screen, bottom }: { screen: WizardScreen; bottom: number }) {
  const [visible, setVisible] = useState(false);
  const [resets, setResets] = useState(0);

  useEffect(() => onCoachReset(() => setResets((n) => n + 1)), []);

  useEffect(() => {
    let alive = true;
    setVisible(false);
    const t = setTimeout(() => {
      hasSeenCoach(screen).then((seen) => { if (alive && !seen) setVisible(true); });
    }, 700); // let the tab settle first
    return () => { alive = false; clearTimeout(t); };
  }, [screen, resets]);

  if (!visible) return null;
  const dismiss = () => { setVisible(false); markCoachSeen(screen); };

  return (
    <Animated.View entering={FadeInDown.duration(260)} exiting={FadeOutDown.duration(180)} style={[styles.wrap, { bottom }]}
      pointerEvents="box-none">
      <View style={styles.card}>
        <SageBubble text={COACH_MARKS[screen]} sageSize={34} onPress={dismiss} />
        <Pressable onPress={dismiss} hitSlop={10} style={styles.ok} accessibilityRole="button" accessibilityLabel="Got it">
          <T variant="smallBold" color={ink.ink}>Got it</T>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg + 72 },
  card: { shadowColor: ink.ink, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  ok: {
    alignSelf: 'flex-end', marginTop: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: 999,
    backgroundColor: ink.page, borderWidth: 2, borderColor: ink.ink,
  },
});
