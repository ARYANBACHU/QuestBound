// Owner: AB. Sage-guided onboarding: welcome → bards → name+crest → crayon → interests → budget/time → fellowship → summon.
// Deep-linkable with ?step=<id> (the gate uses ?step=fellowship and ?step=summon).
// Layout: Sage + bubble sit right next to the step's content, centered as one group (no dead space); one primary
// action at the bottom; one decorative layer (castle skyline). Sage is lg on intro-style steps, md beside forms.
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, Pressable, StyleSheet, TextInput, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvailabilityPicker, BudgetPicker } from '@/components/shell/BudgetTimePicker';
import { Button } from '@/components/shell/Button';
import { CRAYON_QUIPS, CrayonPicker, CrayonPreview, crayonName } from '@/components/shell/CrayonPicker';
import { CrestPicker } from '@/components/shell/CrestPicker';
import { CastleSkyline } from '@/components/shell/Decor';
import { INTEREST_MAX, INTEREST_MIN, InterestPicker } from '@/components/shell/InterestPicker';
import { KeyboardSafe, KeyboardSafeScroll } from '@/components/shell/KeyboardSafe';
import { useMusicToggle } from '@/components/shell/music';
import { QuillDots } from '@/components/shell/QuillDots';
import { T } from '@/components/shell/T';
import { Crest, InviteCard, QrScanner, parseInviteCode } from '@/components/shell/teammates';
import { SageBubble } from '@/components/wizard/SageBubble';
import { interestQuip } from '@/components/wizard/quips';
import { SummonRitual } from '@/components/wizard/SummonRitual';
import { generateStoryline } from '@/lib/api';
import { useFellowship } from '@/lib/fellowship';
import { useStoryline } from '@/lib/game';
import { useSession } from '@/lib/session';
import type { Budget, GenerateStorylineRequest } from '@/shared/types';
import {
  CRESTS, SAGE_CREDIT, SCREEN_GRADIENTS, fonts, ink, panel, radius, shadow, space, type, ui,
  type CrayonColor, type CrestId, type SageExpression,
} from '@/shared/theme';

// A broken screen shows Sage's "Something went awry — tap to recover" instead of crashing (B1).
export { RouteErrorBoundary as ErrorBoundary } from '@/components/shell/ErrorBoundary';

const STEPS = ['welcome', 'bards', 'name', 'crayon', 'interests', 'budget', 'fellowship', 'summon'] as const;
type Step = (typeof STEPS)[number];
const FIRST_LOCKED = STEPS.indexOf('fellowship'); // no going back past the saved profile

/** "Meaningfully changed": compare names ignoring case and extra spaces. */
const normName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

export default function Onboarding() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string; replay?: string }>();
  const { profile, updateProfile, userId } = useSession();
  const fs = useFellowship();
  const story = useStoryline(fs.fellowship?.id ?? null);
  const { music, setMusic } = useMusicToggle();
  const { height } = useWindowDimensions();
  const compact = height < 720; // iPhone SE / mini
  const heroSage = compact ? 112 : 156;
  const rowSage = compact ? 64 : 84;

  const initial: Step = (STEPS as readonly string[]).includes(params.step ?? '') ? (params.step as Step) : 'welcome';
  const [step, setStep] = useState<Step>(initial);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [heardName, setHeardName] = useState(profile?.display_name?.trim() ?? ''); // the name Sage last reacted to
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

  // A4: the castle skyline only fills genuinely empty space between the content and the buttons
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const leftover = viewportH - contentH;

  // summon step
  const [summoning, setSummoning] = useState(false);
  const skipped = useRef(false);

  const go = (s: Step) => { setError(null); setStep(s); };
  const idx = STEPS.indexOf(step);

  // A2: Sage reacts to the name only after 700 ms without typing (or on blur), and only if it really changed.
  const settleName = (raw: string) => {
    const n = normName(raw);
    if (n.length < 2 || n === normName(heardName)) return;
    setHeardName(raw.trim().replace(/\s+/g, ' '));
  };
  useEffect(() => {
    const t = setTimeout(() => settleName(name), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Colors taken by fellow members (shown with their crest on the crayon).
  const takenBy = useMemo(() => {
    const out: Partial<Record<CrayonColor, CrestId>> = {};
    fs.members.forEach((m) => { if (m.user_id !== userId && m.profile) out[m.profile.color] = m.profile.crest; });
    return out;
  }, [fs.members, userId]);
  const takenName = (c: CrayonColor) => fs.members.find((m) => m.user_id !== userId && m.profile?.color === c)?.profile?.display_name;

  const founder = fs.members.find((m) => m.role === 'founder') ?? fs.members.find((m) => m.user_id === fs.fellowship?.created_by);
  const iAmFounder = !founder || founder.user_id === userId;
  const writing = story.storyline?.status === 'generating';

  // Book exists (and isn't still being written) → into the tabs. Covers joiners and the realtime "waiting" screen.
  useEffect(() => {
    if (step !== 'summon' || params.replay === '1' || skipped.current || summoning) return;
    if (!story.loading && story.storyline && story.storyline.status !== 'generating') {
      skipped.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
      await updateProfile({
        display_name: name.trim(), crest, color, interests, budget, availability, music_enabled: music, onboarded: true,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      afterProfile();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setError(`Sage couldn't save your page: ${msg(e)}. Check your connection and tap again.`);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
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
      go('summon'); // auto-skips to the tabs if the fellowship already has a book; else waits for the founder
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
      const req: GenerateStorylineRequest = { fellowship_id: fs.fellowship.id, mode: 'first', ...(demo ? { demo: true } : {}) };
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

  const area = (fs.fellowship?.area_label ?? 'Austin').split(',')[0];
  if (summoning || (step === 'summon' && writing)) {
    return (
      <SummonRitual
        lines={[
          'Gathering your interests…',
          `Consulting the maps of ${area}…`,
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
  let expression: SageExpression = 'idle';
  let hero = false; // big Sage stacked above the bubble (intro-style steps)
  let body: React.ReactNode = null;
  let primary: { label: string; onPress: () => void; disabled?: boolean; tone?: 'gold' | 'primary' } | null = null;
  let secondary: { label: string; onPress: () => void } | null = null;

  switch (step) {
    case 'welcome':
      hero = true;
      expression = 'happy';
      bubble = "Greetings, traveler. I'm Sage. I write fairy tales about real friends — and you're about to be in one.";
      body = (
        <View style={styles.center}>
          <T variant="hero" center>Questbound</T>
          <T variant="story" center>A coloring book your fellowship fills in by living it.</T>
        </View>
      );
      primary = { label: 'Begin', onPress: () => go('bards') };
      break;

    case 'bards':
      hero = true;
      expression = music ? 'happy' : 'idle';
      bubble = music
        ? 'Ah, the bards! They’ll play softly while you quest. Hush them any time with the little speaker by the tabs.'
        : 'Shall the bards play? A soft lute tune while you quest. You can change your mind any time.';
      primary = {
        label: music ? 'Onward' : 'Let the bards play', tone: music ? 'primary' : 'gold',
        onPress: () => { if (music) go('name'); else setMusic(true); },
      };
      secondary = music
        ? { label: 'Actually, silence please', onPress: () => setMusic(false) }
        : { label: 'Not now', onPress: () => { setMusic(false); go('name'); } };
      break;

    case 'name': {
      expression = heardName || crest ? 'happy' : 'idle';
      const crestTitle = crest ? CRESTS[crest].title : null;
      bubble = heardName && crestTitle
        ? `${heardName} the ${crestTitle}. The bards will love that.`
        : heardName
          ? `${heardName}! A name made for ballads. Now pick a crest for your banner.`
          : crestTitle
            ? `The ${crestTitle}! Splendid crest. And what do bards call you?`
            : 'Every hero needs a name and a crest. What do bards call you?';
      body = (
        <View style={{ gap: space.lg }}>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={() => settleName(name)}
            placeholder="Your name"
            placeholderTextColor={ink.muted}
            maxLength={24}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Your name"
            style={styles.input}
          />
          <CrestPicker value={crest} onChange={setCrest} color={color ?? undefined} />
        </View>
      );
      primary = { label: 'Next', onPress: () => go('crayon'), disabled: !name.trim() || !crest };
      break;
    }

    case 'crayon': {
      const friend = color ? takenName(color) : undefined;
      expression = color ? (friend ? 'surprised' : 'happy') : 'idle';
      bubble = !color
        ? 'Pick your crayon. Everything you do will be painted in it.'
        : friend
          ? `${crayonName(color)} is ${friend}'s crayon. You may share it — but your regions will look alike.`
          : CRAYON_QUIPS[color];
      body = (
        <View style={{ gap: space.lg }}>
          <View style={styles.previewRow}>
            <CrayonPreview color={color} width={compact ? 112 : 132} />
          </View>
          <CrayonPicker value={color} onChange={setColor} takenBy={takenBy} />
        </View>
      );
      primary = { label: color ? `Paint in ${crayonName(color)}` : 'Pick a crayon', onPress: () => go('interests'), disabled: !color };
      break;
    }

    case 'interests':
      expression = quip ? 'happy' : 'thinking';
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
      expression = 'thinking';
      bubble = 'Quests can be free as moonlight or fancy as a feast. What suits your purse — and when are you free?';
      body = (
        <View style={{ gap: space.lg }}>
          <BudgetPicker value={budget} onChange={setBudget} />
          <AvailabilityPicker value={availability} onChange={setAvailability} />
        </View>
      );
      primary = { label: 'Seal my page', onPress: saveProfile, disabled: availability.length === 0 };
      break;

    case 'fellowship':
      if (fMode === 'invite' && fs.fellowship) {
        expression = 'proud';
        bubble = `${fs.fellowship.name} is founded! Summon your friends — they scan this or type the code.`;
        body = <InviteCard fellowship={fs.fellowship} />;
        primary = { label: 'Continue', onPress: () => go('summon') };
      } else if (fMode === 'found') {
        expression = 'thinking';
        bubble = 'Every fellowship needs a name worth singing. Choose well.';
        body = (
          <TextInput
            value={fName}
            onChangeText={setFName}
            placeholder="The Lantern Fellowship"
            placeholderTextColor={ink.muted}
            maxLength={40}
            autoCapitalize="words"
            accessibilityLabel="Fellowship name"
            style={styles.input}
          />
        );
        primary = { label: 'Found the fellowship', onPress: found };
        secondary = { label: 'Back', onPress: () => setFMode('choose') };
      } else if (fMode === 'join') {
        bubble = 'Show me the invite. Scan your friend’s QR, or type their 6-letter code.';
        body = (
          <View style={{ gap: space.lg }}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))}
              placeholder="LNTRN7"
              placeholderTextColor={ink.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              accessibilityLabel="Invite code"
              style={[styles.input, styles.codeInput]}
              onSubmitEditing={() => code.length === 6 && join(code)}
            />
            <Button label="Scan a QR code instead" icon="📷" variant="secondary" small onPress={() => setScanning(true)} />
          </View>
        );
        primary = { label: 'Join the fellowship', onPress: () => join(code), disabled: code.length !== 6 };
        secondary = { label: 'Back', onPress: () => { setScanning(false); setFMode('choose'); } };
      } else {
        hero = !compact;
        bubble = `Now, ${name.trim() || profile?.display_name || 'traveler'}: no hero walks alone. Start a fellowship, or join your friends?`;
        body = (
          <View style={{ gap: space.md }}>
            <ChoiceCard emoji="🏰" title="Found a fellowship" sub="Start a new one and invite your friends." onPress={() => setFMode('found')} />
            <ChoiceCard emoji="🗝️" title="Join one" sub="Scan a friend’s QR or type their code." onPress={() => setFMode('join')} />
          </View>
        );
      }
      break;

    case 'summon': {
      hero = true;
      const heroes = (
        <View style={styles.center}>
          <T variant="title" center>{fs.fellowship?.name ?? 'Your fellowship'}</T>
          <View style={styles.crests}>
            {fs.members.filter((m) => m.profile).slice(0, 8).map((m) => (
              <Crest key={m.user_id} crest={m.profile!.crest} color={m.profile!.color} size={36} />
            ))}
          </View>
          <T variant="small" center>
            {fs.members.length > 1 ? `${fs.members.length} heroes stand ready.` : 'Your friends can join any time — the story grows with you.'}
          </T>
        </View>
      );
      if (iAmFounder || params.replay === '1') {
        expression = 'happy';
        bubble = 'Shall I write your first book? I’ll blend everyone’s interests with real places nearby.';
        body = heroes;
        primary = { label: 'Summon our story', onPress: () => summon(false), tone: 'gold' };
        if (error) secondary = { label: 'Write a quick demo book instead', onPress: () => summon(true) };
      } else {
        // A5: joined before the founder summoned. Wait (realtime), but anyone may summon.
        const fName2 = founder?.profile?.display_name ?? 'your founder';
        expression = 'sleepy';
        bubble = `Waiting for ${fName2} to summon the story… I’ll open the book the moment the ink is dry.`;
        body = heroes;
        primary = { label: 'Summon it myself', onPress: () => summon(false) };
        secondary = error ? { label: 'Write a quick demo book instead', onPress: () => summon(true) } : null;
      }
      break;
    }
  }

  return (
    <LinearGradient colors={SCREEN_GRADIENTS.castle} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <KeyboardSafe>
          <View style={styles.topRow}>
            {idx > 0 && idx < FIRST_LOCKED ? (
              <Pressable onPress={() => go(STEPS[idx - 1])} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
                <T variant="title">‹</T>
              </Pressable>
            ) : <View style={styles.side} />}
            <QuillDots count={STEPS.length} index={idx} />
            <View style={styles.side} />
          </View>

          <View style={styles.fill} onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}>
          {leftover > 96 ? <CastleSkyline height={Math.min(leftover / 2 - space.lg, compact ? 80 : 120)} /> : null}
          <KeyboardSafeScroll
            style={styles.fill}
            contentContainerStyle={[styles.body, compact && styles.bodyCompact]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.group} onLayout={(e) => setContentH(e.nativeEvent.layout.height)}>
            <SageBubble
              key={hero ? 'hero' : 'row'}
              text={bubble}
              expression={expression}
              layout={hero ? 'stack' : 'row'}
              sageSize={hero ? heroSage : rowSage}
            />
            {hero && step === 'welcome' ? <T variant="small" center style={styles.credit}>{SAGE_CREDIT}</T> : null}
            {body ? <View style={styles.content}>{body}</View> : null}
            {error ? (
              <View style={styles.error}>
                <T variant="small" color={ink.danger}>{error}</T>
              </View>
            ) : null}
            </View>
          </KeyboardSafeScroll>
          </View>

          <View style={styles.bottom}>
            {primary ? (
              <Button label={primary.label} onPress={primary.onPress} disabled={primary.disabled} loading={saving} tone={primary.tone} />
            ) : null}
            {secondary ? <Button label={secondary.label} variant="ghost" onPress={secondary.onPress} /> : null}
          </View>
        </KeyboardSafe>
        <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
          <QrScanner key={scanKey} onCode={join} onCancel={() => setScanning(false)} onTypeCode={() => setScanning(false)} />
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ChoiceCard({ emoji, title, sub, onPress }: { emoji: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}
      style={({ pressed }) => [styles.choice, pressed && { transform: [{ scale: ui.pressScale }] }]}
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
  fill: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, height: 40 },
  side: { width: 16 },
  body: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.lg, paddingVertical: space.lg, gap: space.lg },
  bodyCompact: { paddingVertical: space.sm, gap: space.md },
  group: { gap: space.lg },
  content: { gap: space.md },
  credit: { marginTop: -space.sm },
  center: { alignItems: 'center', gap: space.sm },
  crests: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xs, marginVertical: space.xs },
  previewRow: { alignItems: 'center' },
  bottom: { paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm, gap: space.xs },
  input: {
    minHeight: 56, borderWidth: ui.borderWidth, borderColor: ink.ink, borderRadius: radius.md, paddingHorizontal: space.lg,
    backgroundColor: ink.page, fontFamily: fonts.bodyBold, fontSize: type.heading, color: ink.ink,
  },
  codeInput: { fontFamily: fonts.display, fontSize: type.title, letterSpacing: 6, textAlign: 'center' },
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: panel.radius,
    borderWidth: panel.borderWidth, borderColor: panel.border, backgroundColor: panel.parchment, ...shadow.sm,
  },
  choiceEmoji: { fontSize: 36, lineHeight: 46 },
  error: { padding: space.md, borderRadius: radius.md, borderWidth: 2, borderColor: ink.danger, backgroundColor: ink.page },
});
