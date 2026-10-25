// Owner: AB. Hidden judge-table toolkit. Open: long-press Sage's FAB, or tap the version label in Settings 5×.
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { resetCoachMarks } from '@/components/wizard/coachMarks';
import { Sage } from '@/components/wizard/Sage';
import { useWizard } from '@/components/wizard/WizardProvider';
import { USE_MOCKS } from '@/lib/env';
import { useFellowship } from '@/lib/fellowship';
import { useGenerationInfo, useStoryline } from '@/lib/game';
import { useSession } from '@/lib/session';
import type { GenerateStorylineRequest } from '@/shared/types';
import { ink, panel, scrim, shadow, space, ui } from '@/shared/theme';
import { Button } from './Button';
import { useNewBook } from './NewBook';
import { T } from './T';

export function DemoTools() {
  const { demoOpen, closeDemoTools } = useWizard();
  const router = useRouter();
  const { fellowship } = useFellowship();
  const { storyline } = useStoryline(fellowship?.id ?? null);
  const { writeBook } = useNewBook();
  const { info } = useGenerationInfo(storyline?.id ?? null);
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

  // Close the tools first, then write through the one shared host (no Modal swaps — B1).
  const summonDemo = (label: string, demo: GenerateStorylineRequest['demo']) => {
    if (!fellowship) { setNote('Join a fellowship first'); return; }
    closeDemoTools();
    writeBook({
      demo,
      lines: demo === 'ut'
        ? ['Unrolling a map of the Forty Acres…', 'Polishing the Tower’s orange glow…', 'Hiding riddles near Turtle Pond…', 'Inking Chapter I…']
        : ['Pulling a finished tale off the shelf…', 'Dusting off the chapters…', 'Almost there…'],
    }).then((ok) => { if (!ok) setNote(`${label} failed — check the connection and try again.`); });
  };

  const confirm = (title: string, body: string, ok: string, fn: () => void) => {
    if (Platform.OS === 'web') { fn(); return; } // RN-web has no Alert
    Alert.alert(title, body, [{ text: 'Cancel', style: 'cancel' }, { text: ok, onPress: fn }]);
  };

  const serp = info?.serp;

  return (
    <Modal visible={demoOpen} transparent animationType="fade" onRequestClose={closeDemoTools}>
        <>
          <Pressable style={styles.backdrop} onPress={closeDemoTools} accessibilityLabel="Close demo tools" />
          <View style={styles.center} pointerEvents="box-none">
            <View style={styles.cardShadow}>
              <View style={styles.card}>
                <View style={styles.head}>
                  <Sage expression="proud" size={56} variant="face" still />
                  <View style={styles.fill}>
                    <T variant="title">Demo tools</T>
                    <T variant="small">For the judging table. Shh.</T>
                  </View>
                </View>
                <ScrollView contentContainerStyle={styles.body}>
                  <Button label="Start UT campus demo" icon="🤘" tone="lantern" loading={busy === 'UT campus demo'} disabled={!fellowship}
                    onPress={() => confirm('Start the UT campus demo?', 'Your current book goes to the Storybook and Sage writes “The Legend of the Forty Acres”.', 'Start',
                      () => summonDemo('UT campus demo', 'ut'))} />
                  <Button label="Summon instant demo book" icon="⚡" variant="secondary" loading={busy === 'Instant book'} disabled={!fellowship}
                    onPress={() => summonDemo('Instant book', true)} />
                  <Button label="Replay the summoning ritual" variant="secondary"
                    onPress={() => { closeDemoTools(); router.push({ pathname: '/onboarding', params: { step: 'summon', replay: '1' } }); }} />
                  <Button label="Replay the tour" variant="secondary"
                    onPress={() => run('Replay tour', async () => { await resetCoachMarks(); setNote('Coach marks reset. Visit each tab.'); })} />
                  <Button label="Restart onboarding" variant="secondary" loading={busy === 'Restart onboarding'}
                    onPress={() => confirm('Restart onboarding?', 'Your profile stays — you will just walk through Sage’s intro again.', 'Restart',
                      () => run('Restart onboarding', async () => {
                        await updateProfile({ onboarded: false });
                        closeDemoTools();
                        router.replace('/onboarding');
                      }))} />

                  <View style={styles.facts}>
                    <Fact k="Mode" v={USE_MOCKS ? 'Mock store (npm run mock)' : 'Live Supabase (npm run dev)'} />
                    <Fact k="SerpApi" v={serp ? `${serp.live} live · ${serp.cached} cached${serp.stale ? ` · ${serp.stale} stale` : ''}${serp.failed ? ` · ${serp.failed} failed` : ''}` : 'no data for this book yet'} />
                    {info?.places_count ? <Fact k="Real places" v={`${info.places_count} in this book`} /> : null}
                  </View>
                  {note ? <T variant="small" color={ink.danger}>{note}</T> : null}
                </ScrollView>
                <Button label="Close" variant="ghost" onPress={closeDemoTools} />
              </View>
            </View>
          </View>
        </>
    </Modal>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.fact}>
      <T variant="smallBold">{k}</T>
      <T variant="small" style={styles.factV}>{v}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: scrim.strong },
  center: { flex: 1, justifyContent: 'center', padding: space.lg },
  cardShadow: { maxHeight: '88%', borderRadius: ui.cardRadius, ...shadow.lg },
  card: {
    flexShrink: 1, backgroundColor: panel.parchment, borderRadius: ui.cardRadius, borderWidth: panel.borderWidth,
    borderColor: panel.border, padding: space.xl, overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  body: { gap: space.md, paddingBottom: space.sm },
  facts: { gap: space.xs, paddingTop: space.sm, borderTopWidth: 1.5, borderTopColor: panel.parchmentEdge },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  factV: { flexShrink: 1, textAlign: 'right' },
});
