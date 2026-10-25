// Owner: AB. "Ask Sage for a different mission": easier / similar / harder → reroll-mission.
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SageBubble } from '@/components/wizard/SageBubble';
import type { Difficulty, Mission } from '@/shared/types';
import { ink, space } from '@/shared/theme';
import { Button } from './Button';
import { DifficultyPicker } from './DifficultyPicker';
import { rerollWithDifficulty } from './engine';
import { Sheet } from './Sheet';
import { T } from './T';

export function RerollSheet({ mission, visible, onClose, onRerolled }: {
  mission: Mission; visible: boolean; onClose: () => void; onRerolled: (next: Mission) => void;
}) {
  const [choice, setChoice] = useState<Difficulty>('normal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (visible) { setError(null); setChoice('normal'); } }, [visible]);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const { mission: next } = await rerollWithDifficulty(mission.id, choice);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onRerolled(next);
      onClose();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setError(`${e instanceof Error ? e.message : String(e)} — try again in a moment.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={busy ? () => {} : onClose} dismissable={!busy}>
      <View style={styles.body}>
        <SageBubble
          expression={busy ? 'thinking' : 'idle'}
          sageSize={64}
          text={busy ? 'Rewriting the quest… the ink is still wet.' : `Not feeling “${mission.title}”? I can write you another.`}
        />
        <DifficultyPicker kind="reroll" value={choice} onChange={setChoice} />
        {error ? <T variant="small" color={ink.danger}>{error}</T> : null}
        <Button label="Rewrite this mission" onPress={go} loading={busy} />
        <Button label="Keep this one" variant="ghost" onPress={onClose} disabled={busy} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({ body: { gap: space.lg, paddingBottom: space.sm } });
