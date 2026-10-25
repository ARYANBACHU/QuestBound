// Owner: AB. Settings: profile (reusing onboarding pickers), fellowship + invite, tour, notifications, about.
// Hidden: tap the version label 5× (or long-press the Muse FAB) for Demo Tools.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvailabilityPicker, BudgetPicker } from '@/components/shell/BudgetTimePicker';
import { Button } from '@/components/shell/Button';
import { CrayonPicker, crayonName } from '@/components/shell/CrayonPicker';
import { CrestPicker } from '@/components/shell/CrestPicker';
import { INTEREST_MIN, InterestPicker } from '@/components/shell/InterestPicker';
import { T } from '@/components/shell/T';
import { TAB_CONTENT_BOTTOM_PAD } from '@/components/shell/TabBar';
import { Crest, InviteSheet } from '@/components/shell/teammates';
import { resetCoachMarks } from '@/components/wizard/coachMarks';
import { useWizard } from '@/components/wizard/WizardProvider';
import { useFellowship } from '@/lib/fellowship';
import { useSession } from '@/lib/session';
import type { Budget } from '@/shared/types';
import { CRAYONS, CRESTS, INTERESTS, fonts, ink, radius, scrim, space, type, type CrayonColor, type CrestId } from '@/shared/theme';

type Editing = null | 'identity' | 'crayon' | 'interests' | 'time';
const NOTIFY_KEY = 'qb.notify';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, userId, updateProfile } = useSession();
  const fs = useFellowship();
  const { openDemoTools } = useWizard();
  const [editing, setEditing] = useState<Editing>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFY_KEY).then((v) => v != null && setNotify(v === '1')).catch(() => {});
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const tapVersion = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      openDemoTools();
    }
  };

  const leave = () => {
    Alert.alert(
      'Leave the fellowship?',
      `You'll leave ${fs.fellowship?.name ?? 'your fellowship'}. Regions you colored stay colored. You can rejoin with the invite code.`,
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive', onPress: async () => {
            try {
              await fs.leave();
              router.replace({ pathname: '/onboarding', params: { step: 'fellowship' } });
            } catch (e) {
              Alert.alert('Could not leave', `${e instanceof Error ? e.message : String(e)}. Try again in a moment.`);
            }
          },
        },
      ],
    );
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ padding: space.xl, gap: space.lg }}>
          <T variant="title">Settings</T>
          <T variant="body">Muse can't find your page yet. Finish onboarding to set up your hero.</T>
          <Button label="Start onboarding" onPress={() => router.replace('/onboarding')} />
        </View>
      </SafeAreaView>
    );
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const interestLabels = profile.interests.map((id) => INTERESTS.find((i) => i.id === id)?.label ?? id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <T variant="title">Settings</T>

        {/* Hero card */}
        <View style={styles.hero}>
          <Crest crest={profile.crest} color={profile.color} size={72} />
          <View style={{ flex: 1 }}>
            <T variant="heading">{profile.display_name || 'Nameless hero'}</T>
            <T variant="small">the {CRESTS[profile.crest]?.title ?? 'Hero'} · {crayonName(profile.color)} crayon</T>
          </View>
        </View>

        <Section title="Your hero">
          <Row label="Name & crest" value={`${profile.display_name} · ${CRESTS[profile.crest]?.emoji ?? ''}`} onPress={() => setEditing('identity')} />
          <Row label="Crayon" value={crayonName(profile.color)} swatch={CRAYONS[profile.color]} onPress={() => setEditing('crayon')} />
          <Row label="Interests" value={interestLabels.slice(0, 3).join(', ') + (interestLabels.length > 3 ? ` +${interestLabels.length - 3}` : '')} onPress={() => setEditing('interests')} />
          <Row label="Budget & time" value={`${profile.budget === 'free' ? 'Free' : profile.budget} · ${profile.availability.length} slot${profile.availability.length === 1 ? '' : 's'}`} onPress={() => setEditing('time')} last />
        </Section>

        <Section title="Fellowship">
          {fs.fellowship ? (
            <>
              <Row label="Name" value={fs.fellowship.name} />
              <Row label="Invite code" value={fs.fellowship.invite_code} mono onPress={() => setInviteOpen(true)} />
              <Row label="Members" value={`${fs.members.length} hero${fs.members.length === 1 ? '' : 'es'}`} last />
              <View style={styles.sectionButtons}>
                <Button label="Invite friends" small onPress={() => setInviteOpen(true)} style={{ flex: 1 }} />
                <Button label="Leave fellowship" small variant="danger" onPress={leave} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <View style={{ padding: space.lg, gap: space.md }}>
              <T variant="body">You're not in a fellowship yet. No hero walks alone!</T>
              <Button label="Found or join one" small onPress={() => router.push({ pathname: '/onboarding', params: { step: 'fellowship' } })} />
            </View>
          )}
        </Section>

        <Section title="Muse">
          <Row label="Replay the tour" value="Muse explains each tab again" onPress={async () => { await resetCoachMarks(); setToast('Tour reset — visit each tab.'); }} />
          <View style={[styles.row, styles.rowLast]}>
            <View style={{ flex: 1 }}>
              <T variant="bodyBold">Proclamation alerts</T>
              <T variant="small">Hear when a friend colors a region</T>
            </View>
            <Switch
              value={notify}
              onValueChange={(v) => { setNotify(v); AsyncStorage.setItem(NOTIFY_KEY, v ? '1' : '0').catch(() => {}); }}
              trackColor={{ true: ink.ink, false: ink.lavenderMist }}
              thumbColor={ink.page}
            />
          </View>
        </Section>

        <Section title="About">
          <View style={{ padding: space.lg, gap: space.xs }}>
            <T variant="story">A coloring book your fellowship fills in by living it.</T>
            <T variant="small">Made at HackTX 2026 · Muse runs on Meta's Muse Spark · places by SerpApi</T>
          </View>
        </Section>

        <Pressable onPress={tapVersion} hitSlop={10} accessibilityLabel={`Version ${version}`}>
          <T variant="small" center color={ink.muted} style={{ marginTop: space.lg }}>Questbound v{version}</T>
        </Pressable>
      </ScrollView>

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <T variant="smallBold" color={ink.page}>{toast}</T>
        </View>
      ) : null}

      <ProfileEditor
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setToast('Saved in Muse’s finest ink.'); }}
        takenBy={Object.fromEntries(fs.members.filter((m) => m.user_id !== userId && m.profile).map((m) => [m.profile!.color, m.profile!.crest]))}
        profile={profile}
        save={updateProfile}
      />

      <InviteSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} fellowship={fs.fellowship} />
    </SafeAreaView>
  );
}

// ---------- profile editor (bottom sheet) ----------
function ProfileEditor({ editing, onClose, onSaved, profile, save, takenBy }: {
  editing: Editing;
  onClose: () => void;
  onSaved: () => void;
  profile: NonNullable<ReturnType<typeof useSession>['profile']>;
  save: ReturnType<typeof useSession>['updateProfile'];
  takenBy: Partial<Record<CrayonColor, CrestId>>;
}) {
  const [name, setName] = useState(profile.display_name);
  const [crest, setCrest] = useState<CrestId>(profile.crest);
  const [color, setColor] = useState<CrayonColor>(profile.color);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [budget, setBudget] = useState<Budget>(profile.budget);
  const [availability, setAvailability] = useState<string[]>(profile.availability);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset drafts each time the sheet opens.
  useEffect(() => {
    if (!editing) return;
    setName(profile.display_name); setCrest(profile.crest); setColor(profile.color);
    setInterests(profile.interests); setBudget(profile.budget); setAvailability(profile.availability); setError(null);
  }, [editing, profile]);

  const valid = editing === 'identity' ? name.trim().length > 0
    : editing === 'interests' ? interests.length >= INTEREST_MIN
    : editing === 'time' ? availability.length > 0 : true;

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing === 'identity') await save({ display_name: name.trim(), crest });
      if (editing === 'crayon') await save({ color });
      if (editing === 'interests') await save({ interests });
      if (editing === 'time') await save({ budget, availability });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSaved();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setError(`Couldn't save: ${e instanceof Error ? e.message : String(e)}. Try again.`);
    } finally {
      setSaving(false);
    }
  };

  const title = { identity: 'Name & crest', crayon: 'Your crayon', interests: 'Interests', time: 'Budget & time' };

  return (
    <Modal visible={!!editing} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { maxHeight: '88%' }]}>
        <T variant="title">{editing ? title[editing] : ''}</T>
        <ScrollView style={{ marginTop: space.md }} contentContainerStyle={{ gap: space.lg, paddingBottom: space.md }} keyboardShouldPersistTaps="handled">
          {editing === 'identity' ? (
            <>
              <TextInput value={name} onChangeText={setName} maxLength={24} placeholder="Your name" placeholderTextColor={ink.muted} style={styles.input} />
              <CrestPicker value={crest} onChange={setCrest} color={color} />
            </>
          ) : null}
          {editing === 'crayon' ? (
            <>
              <T variant="small">Regions you color from now on use your new crayon.</T>
              <CrayonPicker value={color} onChange={setColor} takenBy={takenBy} />
            </>
          ) : null}
          {editing === 'interests' ? (
            <>
              <T variant="small">Muse uses these to write your next missions. Pick at least {INTEREST_MIN}.</T>
              <InterestPicker value={interests} onChange={setInterests} />
            </>
          ) : null}
          {editing === 'time' ? (
            <>
              <BudgetPicker value={budget} onChange={setBudget} />
              <AvailabilityPicker value={availability} onChange={setAvailability} />
            </>
          ) : null}
          {error ? <T variant="small" color={ink.danger}>{error}</T> : null}
        </ScrollView>
        <Button label="Save" onPress={onSave} loading={saving} disabled={!valid} />
        <Button label="Cancel" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: space.xl }}>
      <T variant="smallBold" color={ink.inkSoft} style={{ marginBottom: space.sm, marginLeft: space.xs }}>{title.toUpperCase()}</T>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value, onPress, swatch, mono, last }: {
  label: string; value: string; onPress?: () => void; swatch?: string; mono?: boolean; last?: boolean;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && { backgroundColor: ink.lavenderMist }]}
    >
      <T variant="bodyBold" style={{ flexShrink: 0 }}>{label}</T>
      <View style={styles.rowValue}>
        {swatch ? <View style={[styles.swatch, { backgroundColor: swatch }]} /> : null}
        <T variant="small" numberOfLines={1} style={[{ flexShrink: 1 }, mono && styles.mono]}>{value}</T>
        {onPress ? <T variant="heading" color={ink.muted}>›</T> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ink.paper },
  content: { padding: space.lg, paddingBottom: TAB_CONTENT_BOTTOM_PAD },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.lg, padding: space.lg, borderRadius: radius.lg,
    borderWidth: 2.5, borderColor: ink.ink, backgroundColor: ink.page,
  },
  card: { borderRadius: radius.md, borderWidth: 2, borderColor: ink.ink, backgroundColor: ink.page, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 54,
    paddingHorizontal: space.lg, paddingVertical: space.sm, borderBottomWidth: 1.5, borderBottomColor: ink.lavenderMist,
  },
  rowLast: { borderBottomWidth: 0 },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: ink.ink },
  mono: { fontFamily: fonts.display, fontSize: type.body, letterSpacing: 3, color: ink.ink },
  sectionButtons: { flexDirection: 'row', gap: space.sm, padding: space.md, borderTopWidth: 1.5, borderTopColor: ink.lavenderMist },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: scrim.base },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: ink.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 2, borderBottomWidth: 0, borderColor: ink.ink, padding: space.xl, paddingBottom: space.xxl,
  },
  input: {
    minHeight: 54, borderWidth: 2.5, borderColor: ink.ink, borderRadius: radius.md, paddingHorizontal: space.lg,
    backgroundColor: ink.page, fontFamily: fonts.bodyBold, fontSize: type.heading, color: ink.ink,
  },
  toast: {
    position: 'absolute', alignSelf: 'center', bottom: TAB_CONTENT_BOTTOM_PAD, backgroundColor: ink.ink, borderRadius: radius.pill,
    paddingVertical: space.sm, paddingHorizontal: space.lg,
  },
});
