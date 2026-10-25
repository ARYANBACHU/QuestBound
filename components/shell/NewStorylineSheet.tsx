// Owner: AB. "New storyline" sheet: pick a difficulty, confirm (the current book goes to the Storybook).
// Presentational only — the writing itself lives in <NewBookProvider> (components/shell/NewBook.tsx) so it survives
// screens re-rendering while the book is written. Open it with useNewBook().openNewBook().
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SageBubble } from '@/components/wizard/SageBubble';
import type { Difficulty, Storyline } from '@/shared/types';
import { ink, space } from '@/shared/theme';
import { Button } from './Button';
import { DifficultyPicker } from './DifficultyPicker';
import { Sheet } from './Sheet';
import { T } from './T';

export function NewStorylineSheet({ visible, onClose, onWrite, storyline, error, disabled }: {
  visible: boolean;
  onClose: () => void;
  onWrite: (difficulty: Difficulty) => void;
  storyline: Storyline | null;
  error: string | null;
  disabled?: boolean;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>(storyline?.difficulty ?? 'normal');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (visible) { setConfirming(false); setDifficulty(storyline?.difficulty ?? 'normal'); }
  }, [visible, storyline?.difficulty]);

  const title = storyline?.title ? `“${storyline.title}”` : 'your current book';
  return (
    <Sheet visible={visible} onClose={onClose}>
      {confirming ? (
        <View style={styles.body}>
          <SageBubble expression="surprised" sageSize={64} text={`Close ${title} and start fresh? It goes to the Storybook, colors and all.`} />
          <Button label="Yes, write a new book" tone="gold" sfx="open" onPress={() => onWrite(difficulty)} />
          <Button label="Keep our current book" variant="ghost" sfx="close" onPress={() => setConfirming(false)} />
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
            disabled={disabled}
            sfx="open"
            onPress={() => (storyline ? setConfirming(true) : onWrite(difficulty))}
          />
          <Button label="Cancel" variant="ghost" sfx="close" onPress={onClose} />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({ body: { gap: space.lg, paddingBottom: space.sm } });
