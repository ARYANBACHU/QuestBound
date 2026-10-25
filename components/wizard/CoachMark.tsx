// Owner: AB. Sage pops up once per tab with a one-sentence explanation (talks + pings once). Tap to dismiss.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { ink, panel, radius, shadow, space, ui } from '@/shared/theme';
import { T } from '@/components/shell/T';
import { hasSeenCoach, markCoachSeen, onCoachReset } from './coachMarks';
import { SageBubble } from './SageBubble';
import { COACH_MARKS, type WizardScreen } from './screens';
import { useWizard } from './WizardProvider';

export function CoachMark({ screen, bottom }: { screen: WizardScreen; bottom: number }) {
  const [visible, setVisible] = useState(false);
  const [resets, setResets] = useState(0);
  const { mode } = useWizard();

  useEffect(() => onCoachReset(() => setResets((n) => n + 1)), []);

  useEffect(() => {
    let alive = true;
    setVisible(false);
    const t = setTimeout(() => {
      hasSeenCoach(screen).then((seen) => { if (alive && !seen) setVisible(true); });
    }, 700); // let the tab settle first
    return () => { alive = false; clearTimeout(t); };
  }, [screen, resets]);

  if (!visible || mode !== 'closed') return null;
  const dismiss = () => { setVisible(false); markCoachSeen(screen); };

  return (
    <Animated.View entering={FadeInDown.duration(260)} exiting={FadeOutDown.duration(180)} style={[styles.wrap, { bottom }]}
      pointerEvents="box-none">
      <View style={styles.card}>
        <SageBubble text={COACH_MARKS[screen]} sageSize={56} speakKey={`coach-${screen}-${resets}`} onPress={dismiss} />
        <Pressable onPress={dismiss} hitSlop={10} style={styles.ok} accessibilityRole="button" accessibilityLabel="Got it">
          <T variant="smallBold" color={ink.ink}>Got it</T>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg },
  card: {
    backgroundColor: panel.parchment, borderRadius: ui.cardRadius, borderWidth: panel.borderWidth, borderColor: panel.border,
    padding: space.md, gap: space.sm, ...shadow.lg,
  },
  ok: {
    alignSelf: 'flex-end', paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill,
    backgroundColor: ink.page, borderWidth: 2, borderColor: ink.ink,
  },
});
