// Owner: AB. Muse-guided onboarding: welcome → name+crest → crayon → interests → budget/time → fellowship → summon.
// Deep-linkable with ?step=<id> (the gate uses ?step=fellowship and ?step=summon).
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BudgetPicker, AvailabilityPicker } from '@/components/shell/BudgetTimePicker';
import { Button } from '@/components/shell/Button';
import { CrayonPicker, crayonName } from '@/components/shell/CrayonPicker';
import { CrestPicker } from '@/components/shell/CrestPicker';
import { INTEREST_MAX, INTEREST_MIN, InterestPicker } from '@/components/shell/InterestPicker';
import { QuillDots } from '@/components/shell/QuillDots';
import { T } from '@/components/shell/T';
import { InviteCard, QrScanner, parseInviteCode } from '@/components/shell/teammates';
import { MuseBubble } from '@/components/wizard/MuseBubble';
import { interestQuip } from '@/components/wizard/quips';
import { SummonRitual } from '@/components/wizard/SummonRitual';
import { generateStoryline } from '@/lib/api';
import { useFellowship } from '@/lib/fellowship';
import { useStoryline } from '@/lib/game';
import { useSession } from '@/lib/session';
import type { Budget, GenerateStorylineRequest } from '@/shared/types';
import { CRESTS, fonts, ink, radius, space, type, type CrayonColor, type CrestId } from '@/shared/theme';

const STEPS = ['welcome', 'name', 'crayon', 'interests', 'budget', 'fellowship', 'summon'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string; replay?: string }>();
  const { profile, updateProfile, userId } = useSession();
  const fs = useFellowship();
  const story = useStoryline(fs.fellowship?.id ?? null);

  const initial: Step = (STEPS as readonly string[]).includes(params.step ?? '') ? (params.step as Step) : 'welcome';
  const [step, setStep] = useState<Step>(initial);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [crest, setCrest] = useState<CrestId | null>(profile?.crest ?? null);
  const [color, setColor] = useState<CrayonColor | null>(profile?.color ?? null);
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [quip, setQuip] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget>(profile?.budget ?? '$');
  const [availability, setAvailability] = useState<string[]>(profile?.availability ?? ['weekends']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // fellowship step
  const [fMode, setFMode] = useState<'choose' | 'found' | 'join' | 'invite'>('choose');
  const [fName, setFName] = useState('');
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanKey, setScanKey] = useState(0); // QrScanner fires once per mount; re-key after a failed join

  // summon step
  const [summoning, setSummoning] = useState(false);
  const skipped = useRef(false);

  const go = (s: Step) => { setError(null); setStep(s); };
  const idx = STEPS.indexOf(step);

  // Colors taken by fellow members (shown with their crest on the crayon).
  const takenBy = useMemo(() => {
    const out: Partial<Record<CrayonColor, CrestId>> = {};
    fs.members.forEach((m) => { if (m.user_id !== userId && m.profile) out[m.profile.color] = m.profile.crest; });
    return out;
  }, [fs.members, userId]);

  // Joiners whose fellowship already has a book skip the summon step.
  useEffect(() => {
    if (step !== 'summon' || params.replay === '1' || skipped.current || summoning) return;
    if (!story.loading && story.storyline) {
      skipped.current = true;
      router.replace('/(tabs)/coloring');
    }
  }, [step, story.loading, story.storyline, params.replay, summoning, router]);

  const afterProfile = () => {
    if (!fs.fellowship) go('fellowship');
    else if (story.storyline) router.replace('/(tabs)/coloring');
    else go('summon');
  };

  const saveProfile = async () => {
    if (!crest || !color) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ display_name: name.trim(), crest, color, interests, budget, availability, onboarded: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      afterProfile();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setError(`Muse couldn't save your page: ${msg(e)}. Check your connection and tap again.`);
    } finally {
      setSaving(false);
    }
  };

  const found = async () => {
    setSaving(true);
    setError(null);
    try {
      await fs.createFellowship(fName.trim() || 'The Lantern Fellowship');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFMode('invite');
    } catch (e) {
      setError(`The fellowship couldn't be founded: ${msg(e)}. Try again.`);
    } finally {
      setSaving(false);
    }
  };

  const join = async (raw: string) => {
    const c = parseInviteCode(raw);
    if (!c) { setError('Invite codes are 6 letters or numbers, like LNTRN7.'); return; }
    setScanning(false);
    setScanKey((k) => k + 1);
    setSaving(true);
    setError(null);
    try {
      await fs.joinByCode(c);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      go('summon'); // auto-skips to the tabs if the fellowship already has a book
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setError(`No fellowship answered to "${c}". Check the code with your friend and try again. (${msg(e)})`);
    } finally {
      setSaving(false);
    }
  };

  const summon = async (demo = false) => {
    if (!fs.fellowship) { go('fellowship'); return; }
    setSummoning(true);
    setError(null);
    try {
      const req = { fellowship_id: fs.fellowship.id, mode: 'first', ...(demo ? { demo: true } : {}) } as GenerateStorylineRequest;
      await generateStoryline(req);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      skipped.current = true;
      router.replace('/(tabs)/coloring');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setError(`The ink ran dry: ${msg(e)}. Try again, or let me write a quick demo book.`);
      setSummoning(false);
    }
  };

  if (summoning) {
    const area = fs.fellowship?.area_label ?? 'Austin';
    return (
      <SummonRitual
        lines={[
          'Gathering your interests…',
          `Consulting the maps of ${area.split(',')[0]}…`,
          'Asking the town criers what is on this week…',
          'Weaving your friends into the plot…',
          'Inking the first chapter…',
          'Drying the ink. Almost there…',
        ]}
      />
    );
  }

  // ---------- per-step content ----------
  let bubble = '';
  let body: React.ReactNode = null;
  let primary: { label: string; onPress: () => void; disabled?: boolean } | null = null;
  let secondary: { label: string; onPress: () => void } | null = null;

  switch (step) {
    case 'welcome':
      bubble = "Greetings, traveler. I'm Muse. I write fairy tales about real friends — and you're about to be in one.";
      body = (
        <View style={styles.welcome}>
          <T style={styles.bigEmoji}>📖</T>
          <T variant="hero" center>Questbound</T>
          <T variant="story" center>A coloring book your fellowship fills in by living it.</T>
        </View>
      );
      primary = { label: 'Begin', onPress: () => go('name') };
      break;

    case 'name':
      bubble = name.trim() && crest
        ? `${name.trim()} the ${CRESTS[crest].title}. The bards will love that.`
        : 'Every hero needs a name and a crest. What do bards call you?';
      body = (
        <View style={{ gap: space.xl }}>
          <View style={{ gap: space.sm }}>
            <T variant="bodyBold">What do bards call you?</T>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={ink.muted}
              maxLength={24}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              style={styles.input}
            />
          </View>
          <View style={{ gap: space.md }}>
            <T variant="bodyBold">Choose your crest</T>
            <CrestPicker value={crest} onChange={setCrest} color={color ?? undefined} />
          </View>
        </View>
      );
      primary = { label: 'Next', onPress: () => go('crayon'), disabled: !name.trim() || !crest };
      break;

    case 'crayon':
      bubble = color && takenBy[color]
        ? `${crayonName(color)} is already a friend's crayon. You may share it — but your regions will look alike.`
        : 'Pick your crayon. Everything you do will be painted in it.';
      body = <CrayonPicker value={color} onChange={setColor} takenBy={takenBy} />;
      primary = { label: 'Next', onPress: () => go('interests'), disabled: !color };
      break;

    case 'interests':
      bubble = quip ?? `What makes a good day for you? Pick ${INTEREST_MIN} to ${INTEREST_MAX}. I'll weave them into the story.`;
      body = (
        <InterestPicker
          value={interests}
          onChange={setInterests}
          onPick={(id, next) => setQuip(interestQuip(id, next))}
        />
      );
      primary = {
        label: interests.length < INTEREST_MIN ? `Pick ${INTEREST_MIN - interests.length} more` : 'Next',
        onPress: () => go('budget'),
        disabled: interests.length < INTEREST_MIN,
      };
      break;

    case 'budget':
      bubble = 'Quests can be free as moonlight or fancy as a feast. What suits your purse — and when are you free?';
      body = (
        <View style={{ gap: space.xl }}>
          <View style={{ gap: space.sm }}>
            <T variant="bodyBold">Budget</T>
            <BudgetPicker value={budget} onChange={setBudget} />
          </View>
          <View style={{ gap: space.sm }}>
            <T variant="bodyBold">When are you free?</T>
            <AvailabilityPicker value={availability} onChange={setAvailability} />
          </View>
        </View>
      );
      primary = { label: 'Seal my page', onPress: saveProfile, disabled: availability.length === 0 };
      break;

    case 'fellowship':
      if (fMode === 'invite' && fs.fellowship) {
        bubble = `${fs.fellowship.name} is founded! Summon your friends — they scan this or type the code.`;
        body = (
          <View style={{ gap: space.md }}>
            <T variant="heading" center>Summon your friends</T>
            <InviteCard fellowship={fs.fellowship} />
            <T variant="small" center>You can always invite more from the Friends tab.</T>
          </View>
        );
        primary = { label: 'Continue', onPress: () => go('summon') };
      } else if (fMode === 'found') {
        bubble = 'Every fellowship needs a name worth singing. Choose well.';
        body = (
          <View style={{ gap: space.sm }}>
            <T variant="bodyBold">Name your fellowship</T>
            <TextInput
              value={fName}
              onChangeText={setFName}
              placeholder="The Lantern Fellowship"
              placeholderTextColor={ink.muted}
              maxLength={40}
              autoCapitalize="words"
              style={styles.input}
            />
          </View>
        );
        primary = { label: 'Found the fellowship', onPress: found };
        secondary = { label: 'Back', onPress: () => setFMode('choose') };
      } else if (fMode === 'join') {
        bubble = 'Show me the invite. Scan your friend’s QR, or type their 6-letter code.';
        body = (
          <View style={{ gap: space.lg }}>
            <Button label="Scan QR code" icon="📷" variant="secondary" onPress={() => setScanning(true)} />
            <View style={{ gap: space.sm }}>
              <T variant="bodyBold">Or type the code</T>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))}
                placeholder="LNTRN7"
                placeholderTextColor={ink.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                style={[styles.input, styles.codeInput]}
                onSubmitEditing={() => code.length === 6 && join(code)}
              />
            </View>
          </View>
        );
        primary = { label: 'Join the fellowship', onPress: () => join(code), disabled: code.length !== 6 };
        secondary = { label: 'Back', onPress: () => { setScanning(false); setFMode('choose'); } };
      } else {
        bubble = `Now, ${name.trim() || profile?.display_name || 'traveler'}: no hero walks alone. Start a fellowship, or join your friends?`;
        body = (
          <View style={{ gap: space.lg }}>
            <ChoiceCard emoji="🏰" title="Found a fellowship" sub="Start a new one and invite your friends." onPress={() => setFMode('found')} />
            <ChoiceCard emoji="🗝️" title="Join one" sub="Scan a friend’s QR or type their code." onPress={() => setFMode('join')} />
          </View>
        );
      }
      break;

    case 'summon':
      bubble = 'Shall I write your first book? I’ll blend everyone’s interests with real places nearby.';
      body = (
        <View style={styles.welcome}>
          <T style={styles.bigEmoji}>📜</T>
          <T variant="title" center>{fs.fellowship?.name ?? 'Your fellowship'}</T>
          <T variant="story" center>
            {fs.members.length > 1
              ? `${fs.members.length} heroes stand ready. More can join later — the story grows with you.`
              : 'Your friends can join any time — the story grows with you.'}
          </T>
        </View>
      );
      primary = { label: 'Summon our story', onPress: () => summon(false) };
      if (error) secondary = { label: 'Write a quick demo book instead', onPress: () => summon(true) };
      break;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <View style={styles.topRow}>
            {idx > 0 && idx < 5 ? (
              <Pressable onPress={() => go(STEPS[idx - 1])} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
                <T variant="heading">‹</T>
              </Pressable>
            ) : <View style={{ width: 12 }} />}
            <QuillDots count={STEPS.length} index={idx} />
            <View style={{ width: 12 }} />
          </View>
          <MuseBubble text={bubble} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {body}
          {error ? <T variant="small" color={ink.danger} style={{ marginTop: space.lg }}>{error}</T> : null}
        </ScrollView>
        <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
          <QrScanner
            key={scanKey}
            onCode={join}
            onCancel={() => setScanning(false)}
            onTypeCode={() => setScanning(false)}
          />
        </Modal>
        <View style={styles.bottom}>
          {primary ? <Button label={primary.label} onPress={primary.onPress} disabled={primary.disabled} loading={saving} /> : null}
          {secondary ? <Button label={secondary.label} variant="ghost" onPress={secondary.onPress} /> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChoiceCard({ emoji, title, sub, onPress }: { emoji: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}
      style={({ pressed }) => [styles.choice, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <T style={styles.choiceEmoji}>{emoji}</T>
      <View style={{ flex: 1 }}>
        <T variant="heading">{title}</T>
        <T variant="small">{sub}</T>
      </View>
      <T variant="heading">›</T>
    </Pressable>
  );
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ink.paper },
  top: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  body: { padding: space.lg, paddingTop: space.xl, flexGrow: 1 },
  bottom: { paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm, gap: space.xs },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingVertical: space.xl },
  bigEmoji: { fontSize: 72, lineHeight: 88 },
  input: {
    minHeight: 54, borderWidth: 2.5, borderColor: ink.ink, borderRadius: radius.md, paddingHorizontal: space.lg,
    backgroundColor: ink.page, fontFamily: fonts.bodyBold, fontSize: type.heading, color: ink.ink,
  },
  codeInput: { fontFamily: fonts.display, fontSize: type.title, letterSpacing: 6, textAlign: 'center' },
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.lg, borderWidth: 2.5,
    borderColor: ink.ink, backgroundColor: ink.page,
  },
  choiceEmoji: { fontSize: 40, lineHeight: 50 },
});
