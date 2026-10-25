// Owner: AB. Hidden judge-table toolkit. Open: long-press the Muse FAB, or tap the version label in Settings 5×.
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { generateStoryline } from '@/lib/api';
import { USE_MOCKS } from '@/lib/env';
import { useFellowship } from '@/lib/fellowship';
import { useSession } from '@/lib/session';
import type { GenerateStorylineRequest } from '@/shared/types';
import { ink, radius, scrim, space } from '@/shared/theme';
import { resetCoachMarks } from '@/components/wizard/coachMarks';
import { useWizard } from '@/components/wizard/WizardProvider';
import { Button } from './Button';
import { T } from './T';

export function DemoTools() {
  const { demoOpen, closeDemoTools } = useWizard();
  const router = useRouter();
  const { fellowship } = useFellowship();
  const { updateProfile } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setNote(null);
    try {
      await fn();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setNote(`${label} failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={demoOpen} transparent animationType="fade" onRequestClose={closeDemoTools}>
      <Pressable style={styles.backdrop} onPress={closeDemoTools} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.card}>
          <T variant="title">Demo tools</T>
          <T variant="small" style={{ marginBottom: space.md }}>For the judging table. Shh.</T>
          <ScrollView contentContainerStyle={{ gap: space.md }}>
            <View style={styles.row}>
              <T variant="smallBold">Mode</T>
              <T variant="small">{USE_MOCKS ? 'Mock store (EXPO_PUBLIC_USE_MOCKS=1)' : 'Live Supabase'}</T>
            </View>
            <T variant="small">
              To switch, restart with `npm run mock` (mocks) or `npm run dev` (live). Mock mode never needs the network.
            </T>
            <Button
              label="Summon instant demo book"
              icon="⚡"
              loading={busy === 'Instant book'}
              disabled={!fellowship}
              onPress={() => run('Instant book', async () => {
                if (!fellowship) throw new Error('Join a fellowship first');
                // `demo` is proposed in REQUESTS.md; EV's generate-storyline skips the LLM when it is set.
                const req = { fellowship_id: fellowship.id, mode: 'first', demo: true } as GenerateStorylineRequest;
                await generateStoryline(req);
                closeDemoTools();
                router.navigate('/(tabs)/coloring');
              })}
            />
            <Button
              label="Replay the summoning ritual"
              variant="secondary"
              onPress={() => { closeDemoTools(); router.push({ pathname: '/onboarding', params: { step: 'summon' } }); }}
            />
            <Button
              label="Replay the tour"
              variant="secondary"
              onPress={() => run('Replay tour', async () => { await resetCoachMarks(); setNote('Coach marks reset. Visit each tab.'); })}
            />
            <Button
              label="Restart onboarding"
              variant="secondary"
              loading={busy === 'Restart onboarding'}
              onPress={() => Alert.alert('Restart onboarding?', 'Your profile stays — you will just walk through Muse’s intro again.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Restart', onPress: () => run('Restart onboarding', async () => {
                  await updateProfile({ onboarded: false });
                  closeDemoTools();
                  router.replace('/onboarding');
                }) },
              ])}
            />
            <View style={styles.row}>
              <T variant="smallBold">SerpApi</T>
              <T variant="small">live/cached counts not exposed yet</T>
            </View>
            {note ? <T variant="small" color={ink.danger}>{note}</T> : null}
          </ScrollView>
          <Button label="Close" variant="ghost" onPress={closeDemoTools} style={{ marginTop: space.sm }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: scrim.strong },
  center: { flex: 1, justifyContent: 'center', padding: space.lg },
  card: { maxHeight: '86%', backgroundColor: ink.paper, borderRadius: radius.lg, borderWidth: 2.5, borderColor: ink.ink, padding: space.xl },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, flexWrap: 'wrap' },
});
