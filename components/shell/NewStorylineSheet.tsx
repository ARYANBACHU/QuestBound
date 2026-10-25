// Owner: AB. "New storyline": pick a difficulty, confirm (the current book goes to the Storybook), then Sage writes
// a fresh book with replace_active. Opened from the Missions "…" menu and from Settings.
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SummonRitual } from '@/components/wizard/SummonRitual';
import { SageBubble } from '@/components/wizard/SageBubble';
import { generateStoryline } from '@/lib/api';
import { useFellowship } from '@/lib/fellowship';
import { useStoryline } from '@/lib/game';
import type { Difficulty } from '@/shared/types';
import { ink, space } from '@/shared/theme';
import { Button } from './Button';
import { DifficultyPicker } from './DifficultyPicker';
import { Sheet } from './Sheet';
import { T } from './T';

export function NewStorylineSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { fellowship } = useFellowship();
  const { storyline } = useStoryline(fellowship?.id ?? null);
  const [difficulty, setDifficulty] = useState<Difficulty>(storyline?.difficulty ?? 'normal');
  const [confirming, setConfirming] = useState(false);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) { setConfirming(false); setError(null); setDifficulty(storyline?.difficulty ?? 'normal'); }
  }, [visible, storyline?.difficulty]);

  const start = async () => {
    if (!fellowship) return;
    setWriting(true);
    setError(null);
    try {
      await generateStoryline({ fellowship_id: fellowship.id, mode: 'first', difficulty, replace_active: !!storyline });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setWriting(false);
      onClose();
      router.navigate('/(tabs)/coloring');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setError(`The ink ran dry: ${e instanceof Error ? e.message : String(e)}. Your current book is safe — try again.`);
      setWriting(false);
    }
  };

  if (writing) {
    return (
      <Modal visible animationType="fade" onRequestClose={() => {}}>
        <SummonRitual
          title="Sage is writing…"
          lines={['Closing the old book gently…', 'Gathering everyone’s interests…', 'Consulting the maps…', 'Inking a brand-new first chapter…', 'Almost there…']}
        />
      </Modal>
    );
  }

  const title = storyline?.title ? `“${storyline.title}”` : 'your current book';
  return (
    <Sheet visible={visible} onClose={onClose}>
      {confirming ? (
        <View style={styles.body}>
          <SageBubble expression="surprised" sageSize={64} text={`Close ${title} and start fresh? It goes to the Storybook, colors and all.`} />
          <Button label="Yes, write a new book" tone="gold" onPress={start} />
          <Button label="Keep our current book" variant="ghost" onPress={() => setConfirming(false)} />
        </View>
      ) : (
        <View style={styles.body}>
          <SageBubble
            expression="thinking"
            sageSize={64}
            text={storyline ? 'A new tale? Tell me how daring it should be.' : 'Let’s write your book. How daring should it be?'}
          />
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
          {error ? <T variant="small" color={ink.danger}>{error}</T> : null}
          <Button
            label={storyline ? 'New storyline' : 'Summon our story'}
            disabled={!fellowship}
            onPress={() => (storyline ? setConfirming(true) : start())}
          />
          <Button label="Cancel" variant="ghost" onPress={onClose} />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({ body: { gap: space.lg, paddingBottom: space.sm } });
