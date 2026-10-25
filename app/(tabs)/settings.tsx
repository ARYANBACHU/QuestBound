// Owner: AB. Settings: hero card (focal point) + one primary action (Invite friends), then calm grouped rows:
// your hero · fellowship (incl. New storyline) · sound · Sage · about. "Leave fellowship" lives in the "…" menu.
// Hidden: tap the version label 5× (or long-press Sage's FAB) for Demo Tools.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionMenu } from '@/components/shell/ActionMenu';
import { AvailabilityPicker, BudgetPicker } from '@/components/shell/BudgetTimePicker';
import { Button } from '@/components/shell/Button';
import { KeyboardSafeScroll } from '@/components/shell/KeyboardSafe';
import { CrayonPicker, CrayonPreview, crayonName } from '@/components/shell/CrayonPicker';
import { CrestPicker } from '@/components/shell/CrestPicker';
import { INTEREST_MIN, InterestPicker } from '@/components/shell/InterestPicker';
import { useMusicToggle } from '@/components/shell/music';
import { NewStorylineSheet } from '@/components/shell/NewStorylineSheet';
import { Sheet } from '@/components/shell/Sheet';
import { setSoundSetting, useSoundSettings } from '@/components/shell/soundSettings';
import { T } from '@/components/shell/T';
import { TAB_CONTENT_BOTTOM_PAD } from '@/components/shell/TabBar';
import { Crest, InviteSheet } from '@/components/shell/teammates';
import { resetCoachMarks } from '@/components/wizard/coachMarks';
import { SageBubble } from '@/components/wizard/SageBubble';
import { useWizard } from '@/components/wizard/WizardProvider';
import { useFellowship } from '@/lib/fellowship';
import { useSession } from '@/lib/session';
import type { Budget } from '@/shared/types';
import {
  CRAYONS, CRESTS, INTERESTS, SCREEN_GRADIENTS, accent, fonts, ink, panel, radius, shadow, space, type, ui,
  type CrayonColor, type CrestId,
} from '@/shared/theme';

type Editing = null | 'identity' | 'crayon' | 'interests' | 'time';
const NOTIFY_KEY = 'qb.notify';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, userId, updateProfile } = useSession();
  const fs = useFellowship();
  const { openDemoTools } = useWizard();
  const [editing, setEditing] = useState<Editing>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newBookOpen, setNewBookOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const taps = useRef<number[]>([]);
  const { music, setMusic } = useMusicToggle();
  const { sfx } = useSoundSettings();

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

  if (!profile) {
    return (
      <LinearGradient colors={SCREEN_GRADIENTS.castle} style={styles.fill}>
        <SafeAreaView style={[styles.fill, styles.empty]} edges={['top']}>
          <SageBubble layout="stack" sageSize={120} expression="surprised"
            text="I can't find your page yet. Finish onboarding and I'll set up your hero." />
          <Button label="Start onboarding" onPress={() => router.replace('/onboarding')} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const interestLabels = profile.interests.map((id) => INTERESTS.find((i) => i.id === id)?.label ?? id);
  const menu = fs.fellowship ? [{ label: 'Leave fellowship', icon: '🚪', danger: true, onPress: () => setLeaveOpen(true) }] : [];

  return (
    <LinearGradient colors={SCREEN_GRADIENTS.castle} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.headRow}>
            <T variant="title" style={styles.fill}>Settings</T>
            <ActionMenu items={menu} />
          </View>

          {/* Hero card — the focal point */}
          <Pressable style={styles.hero} onPress={() => setEditing('identity')} accessibilityRole="button"
            accessibilityLabel={`${profile.display_name}, edit name and crest`}>
            <Crest crest={profile.crest} color={profile.color} size={76} />
            <View style={styles.fill}>
              <T variant="heading">{profile.display_name || 'Nameless hero'}</T>
              <T variant="small">the {CRESTS[profile.crest]?.title ?? 'Hero'} · {crayonName(profile.color)} crayon</T>
              {fs.fellowship ? <T variant="small" numberOfLines={1}>of {fs.fellowship.name}</T> : null}
            </View>
            <T variant="heading" color={ink.muted}>›</T>
          </Pressable>
          {fs.fellowship ? (
            <Button label="Invite friends" icon="📜" tone="gold" onPress={() => setInviteOpen(true)} style={styles.primary} />
          ) : (
            <Button label="Found or join a fellowship" onPress={() => router.push({ pathname: '/onboarding', params: { step: 'fellowship' } })}
              style={styles.primary} />
          )}

          <Section title="Your hero">
            <Row label="Name & crest" value={`${profile.display_name} · ${CRESTS[profile.crest]?.emoji ?? ''}`} onPress={() => setEditing('identity')} />
            <Row label="Crayon" value={crayonName(profile.color)} swatch={CRAYONS[profile.color]} onPress={() => setEditing('crayon')} />
            <Row label="Interests" value={interestLabels.slice(0, 2).join(', ') + (interestLabels.length > 2 ? ` +${interestLabels.length - 2}` : '')} onPress={() => setEditing('interests')} />
            <Row label="Budget & time" value={`${profile.budget === 'free' ? 'Free' : profile.budget} · ${profile.availability.length} slot${profile.availability.length === 1 ? '' : 's'}`} onPress={() => setEditing('time')} last />
          </Section>

          {fs.fellowship ? (
            <Section title="Fellowship">
              <Row label="Invite code" value={fs.fellowship.invite_code} mono onPress={() => setInviteOpen(true)} />
              <Row label="Members" value={`${fs.members.length} hero${fs.members.length === 1 ? '' : 'es'}`} />
              <Row label="New storyline" value="Pick a difficulty" onPress={() => setNewBookOpen(true)} last />
            </Section>
          ) : null}

          <Section title="Sound">
            <ToggleRow label="Music" sub="Shall the bards play?" value={music} onChange={setMusic} />
            <ToggleRow label="Sound effects" sub="Sage's chime, crayons, page turns" value={sfx} onChange={(v) => setSoundSetting('sfx', v)} last />
          </Section>

          <Section title="Sage">
            <Row label="Replay the tour" value="Sage explains each tab" onPress={async () => { await resetCoachMarks(); setToast('Tour reset — visit each tab.'); }} />
            <ToggleRow label="Proclamation alerts" sub="Hear when a friend colors a region" value={notify}
              onChange={(v) => { setNotify(v); AsyncStorage.setItem(NOTIFY_KEY, v ? '1' : '0').catch(() => {}); }} last />
          </Section>

          <View style={styles.about}>
            <T variant="story" center>A coloring book your fellowship fills in by living it.</T>
            <T variant="small" center>Made at HackTX 2026 · Sage is powered by Meta's Muse Spark · real places by SerpApi</T>
            <Pressable onPress={tapVersion} hitSlop={10} accessibilityLabel={`Version ${version}`}>
              <T variant="small" center color={ink.muted}>Questbound v{version}</T>
            </Pressable>
          </View>
        </ScrollView>

        {toast ? (
          <View style={styles.toast} pointerEvents="none">
            <T variant="smallBold" color={ink.page}>{toast}</T>
          </View>
        ) : null}

        <ProfileEditor
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setToast('Saved in Sage’s finest ink.'); }}
          takenBy={Object.fromEntries(fs.members.filter((m) => m.user_id !== userId && m.profile).map((m) => [m.profile!.color, m.profile!.crest]))}
          profile={profile}
          save={updateProfile}
        />
        <LeaveSheet visible={leaveOpen} onClose={() => setLeaveOpen(false)} name={fs.fellowship?.name ?? 'your fellowship'}
          onLeave={async () => {
            await fs.leave();
            setLeaveOpen(false);
            router.replace({ pathname: '/onboarding', params: { step: 'fellowship' } });
          }} />
        <NewStorylineSheet visible={newBookOpen} onClose={() => setNewBookOpen(false)} />
        <InviteSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} fellowship={fs.fellowship} />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ---------- leave (confirm) ----------
function LeaveSheet({ visible, onClose, onLeave, name }: { visible: boolean; onClose: () => void; onLeave: () => Promise<void>; name: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (visible) setError(null); }, [visible]);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.sheetBody}>
        <SageBubble expression="surprised" sageSize={64}
          text={`Leave ${name}? Regions you colored stay colored, and you can rejoin with the invite code.`} />
        {error ? <T variant="small" color={ink.danger}>{error}</T> : null}
        <Button label="Leave the fellowship" variant="danger" loading={busy} onPress={async () => {
          setBusy(true);
          try { await onLeave(); } catch (e) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            setError(`Couldn't leave: ${e instanceof Error ? e.message : String(e)}. Try again in a moment.`);
          } finally { setBusy(false); }
        }} />
        <Button label="Stay" variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}

// ---------- profile editor ----------
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
    <Sheet visible={!!editing} onClose={onClose}>
      <T variant="title">{editing ? title[editing] : ''}</T>
      <KeyboardSafeScroll style={styles.editor} contentContainerStyle={styles.editorBody}>
        {editing === 'identity' ? (
          <>
            <TextInput value={name} onChangeText={setName} maxLength={24} placeholder="Your name" placeholderTextColor={ink.muted}
              style={styles.input} accessibilityLabel="Your name" />
            <CrestPicker value={crest} onChange={setCrest} color={color} />
          </>
        ) : null}
        {editing === 'crayon' ? (
          <>
            <View style={styles.previewRow}><CrayonPreview color={color} width={112} /></View>
            <CrayonPicker value={color} onChange={setColor} takenBy={takenBy} />
            <T variant="small">Regions you color from now on use your new crayon.</T>
          </>
        ) : null}
        {editing === 'interests' ? (
          <>
            <T variant="small">Sage uses these to write your next missions. Pick at least {INTEREST_MIN}.</T>
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
      </KeyboardSafeScroll>
      <View style={styles.editorFoot}>
        <Button label="Save" onPress={onSave} loading={saving} disabled={!valid} />
        <Button label="Cancel" variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <T variant="smallBold" color={ink.inkSoft} style={styles.sectionTitle}>{title}</T>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function ToggleRow({ label, sub, value, onChange, last }: {
  label: string; sub: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.fill}>
        <T variant="bodyBold">{label}</T>
        <T variant="small">{sub}</T>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label}
        trackColor={{ true: accent.primary, false: ink.lavenderMist }} thumbColor={ink.page} />
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
      style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && styles.rowPressed]}
    >
      <T variant="bodyBold" style={styles.rowLabel}>{label}</T>
      <View style={styles.rowValue}>
        {swatch ? <View style={[styles.swatch, { backgroundColor: swatch }]} /> : null}
        <T variant="small" numberOfLines={1} style={[styles.shrink, mono && styles.mono]}>{value}</T>
        {onPress ? <T variant="heading" color={ink.muted}>›</T> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  shrink: { flexShrink: 1 },
  empty: { justifyContent: 'center', padding: space.xl, gap: space.xl },
  content: { padding: space.lg, paddingBottom: TAB_CONTENT_BOTTOM_PAD },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.lg, padding: space.lg, borderRadius: ui.cardRadius,
    borderWidth: panel.borderWidth, borderColor: panel.border, backgroundColor: panel.parchment, ...shadow.md,
  },
  primary: { marginTop: space.lg },
  section: { marginTop: space.xl },
  sectionTitle: { marginBottom: space.sm, marginLeft: space.xs },
  card: {
    borderRadius: ui.cardRadius - 6, borderWidth: 2, borderColor: panel.border, backgroundColor: panel.parchment, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 54,
    paddingHorizontal: space.lg, paddingVertical: space.sm, borderBottomWidth: 1.5, borderBottomColor: panel.parchmentEdge,
  },
  rowLast: { borderBottomWidth: 0 },
  rowPressed: { backgroundColor: panel.parchmentEdge },
  rowLabel: { flexShrink: 0 },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: ink.ink },
  mono: { fontFamily: fonts.display, fontSize: type.body, letterSpacing: 3, color: ink.ink },
  about: { marginTop: space.xxl, gap: space.xs, alignItems: 'center' },
  sheetBody: { gap: space.lg, paddingBottom: space.sm },
  editor: { marginTop: space.md, flexGrow: 0 },
  editorBody: { gap: space.lg, paddingBottom: space.md },
  editorFoot: { gap: space.xs, paddingTop: space.sm },
  previewRow: { alignItems: 'center' },
  input: {
    minHeight: 54, borderWidth: ui.borderWidth, borderColor: ink.ink, borderRadius: radius.md, paddingHorizontal: space.lg,
    backgroundColor: ink.page, fontFamily: fonts.bodyBold, fontSize: type.heading, color: ink.ink,
  },
  toast: {
    position: 'absolute', alignSelf: 'center', bottom: TAB_CONTENT_BOTTOM_PAD, backgroundColor: ink.ink, borderRadius: radius.pill,
    paddingVertical: space.sm, paddingHorizontal: space.lg,
  },
});
