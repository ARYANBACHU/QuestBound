// Owner: AB. Mission detail + proof submission — the core loop's action.
// Photo → uploadProof → submitProof → Magic Mirror → wax seal (pass) or Muse's hint (fail).
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/shell/Button';
import { MagicMirror } from '@/components/shell/MagicMirror';
import { regionLabel } from '@/components/shell/missionUtils';
import { ParchmentLoading } from '@/components/shell/ParchmentLoading';
import { ParticipantPicker } from '@/components/shell/ParticipantPicker';
import { StatusPill } from '@/components/shell/StatusPill';
import { T } from '@/components/shell/T';
import { CrestRow, MissionTypeIcon, MISSION_TYPE_LABEL } from '@/components/shell/teammates';
import { WaxSeal } from '@/components/shell/WaxSeal';
import { MuseBubble } from '@/components/wizard/MuseBubble';
import { useTypewriter } from '@/components/wizard/useTypewriter';
import { submitProof, uploadProof } from '@/lib/api';
import { useChat } from '@/lib/chat';
import { useFellowship, profileOf } from '@/lib/fellowship';
import { useMission, useStoryline } from '@/lib/game';
import { useSession } from '@/lib/session';
import type { Mission, SubmitProofRequest, SubmitProofResponse } from '@/shared/types';
import { fonts, ink, radius, space, type } from '@/shared/theme';

const TEXT_MAX = 280;

type Phase =
  | { kind: 'form' }
  | { kind: 'working'; step: 'upload' | 'verify' }
  | { kind: 'result'; res: SubmitProofResponse };

export default function MissionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { mission, loading } = useMission(id ?? null);
  const { userId } = useSession();
  const fs = useFellowship();
  const { pages } = useStoryline(fs.fellowship?.id ?? null);
  const { messages } = useChat(fs.fellowship?.id ?? null);
  const page = pages.find((p) => p.id === mission?.page_id) ?? null;

  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const [photo, setPhoto] = useState<string | null>(null);
  const uploaded = useRef<{ uri: string; url: string } | null>(null); // never re-upload the same photo on retry
  const [text, setText] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [recipient, setRecipient] = useState<string | null>(null);
  const [giver, setGiver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId && participants.length === 0) setParticipants([userId]);
  }, [userId, participants.length]);

  // Gift: who sent it? The latest proclamation about this mission names the giver.
  const giftGiver = useMemo(() => {
    if (!mission || mission.proof_type !== 'confirm') return null;
    const m = [...messages].reverse().find((x) => x.payload?.mission_id === mission.id && x.payload?.user_id);
    return m?.payload?.user_id ?? null;
  }, [messages, mission]);
  useEffect(() => { if (giftGiver && !giver && giftGiver !== userId) setGiver(giftGiver); }, [giftGiver, giver, userId]);

  if (loading && !mission) return <ParchmentLoading line="Finding the mission scroll…" />;
  if (!mission) {
    return (
      <Shell onClose={() => router.back()}>
        <MuseBubble text="Hmm. That mission scroll has blown away. Head back to the board and pick another." />
        <Button label="Back to missions" onPress={() => router.navigate('/(tabs)/missions')} style={{ marginTop: space.xl }} />
      </Shell>
    );
  }

  const isGift = mission.proof_type === 'confirm';
  const iAmGiftRecipient = isGift && mission.status === 'pending' && giftGiver !== userId;
  const needPeople = mission.required_members >= 2 && !isGift;
  const minPeople = mission.type === 'gathering' && fs.members.length >= 4 ? mission.required_members - 1 : mission.required_members;

  // ---------- submit ----------
  const submit = async () => {
    if (!userId) return;
    setError(null);
    const req: SubmitProofRequest = { mission_id: mission.id, participant_ids: needPeople ? participants : [userId] };
    try {
      if (mission.proof_type === 'photo' || mission.proof_type === 'group_photo') {
        if (!photo) return;
        if (uploaded.current?.uri !== photo) {
          setPhase({ kind: 'working', step: 'upload' });
          const url = await uploadProof(photo, mission.fellowship_id);
          uploaded.current = { uri: photo, url };
        }
        req.proof_url = uploaded.current!.url;
      } else if (isGift) {
        const other = iAmGiftRecipient ? giver : recipient;
        if (!other) return;
        req.participant_ids = [userId, other];
        req.confirm_for = other;
      } else {
        req.proof_text = text.trim();
      }
      setPhase({ kind: 'working', step: 'verify' });
      const res = await submitProof(req);
      Haptics.notificationAsync(res.verdict.pass ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setPhase({ kind: 'result', res });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setError(readable(e));
      setPhase({ kind: 'form' });
    }
  };

  const pick = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { setError('The Mirror needs your camera. Allow it in Settings, or choose a photo instead.'); return; }
      }
      const r = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (!r.canceled && r.assets[0]) setPhoto(r.assets[0].uri);
    } catch (e) {
      setError(`Couldn't open the ${source}: ${readable(e)}`);
    }
  };

  // ---------- working / result ----------
  if (phase.kind === 'working') {
    return (
      <Shell onClose={undefined}>
        <View style={styles.centerFill}>
          <MagicMirror
            photoUri={photo}
            caption={phase.step === 'upload' ? 'Carrying your proof to the Mirror…' : 'The Mirror ponders…'}
          />
        </View>
      </Shell>
    );
  }
  if (phase.kind === 'result') {
    return (
      <Result
        res={phase.res}
        mission={mission}
        photo={photo}
        onRetry={() => setPhase({ kind: 'form' })}
        onPage={() => router.navigate('/(tabs)/coloring')}
        onMissions={() => router.navigate('/(tabs)/missions')}
      />
    );
  }

  // ---------- form ----------
  const canSubmit = (() => {
    if (needPeople && participants.length < minPeople) return false;
    switch (mission.proof_type) {
      case 'photo': case 'group_photo': return !!photo;
      case 'confirm': return iAmGiftRecipient ? !!giver : !!recipient;
      default: return text.trim().length > 0;
    }
  })();

  const completer = profileOf(fs.members, mission.completed_by[0]);

  return (
    <Shell onClose={() => router.back()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={60}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.kicker}>
            <MissionTypeIcon type={mission.type} size={22} />
            <T variant="smallBold" color={ink.inkSoft}>
              {MISSION_TYPE_LABEL[mission.type]} · {regionLabel(page, mission)} · {mission.points} pts
            </T>
            <View style={{ flex: 1 }} />
            <StatusPill mission={mission} members={fs.members} />
          </View>
          <T variant="title">{mission.title}</T>
          {mission.story_hook ? <T variant="story">{mission.story_hook}</T> : null}
          {mission.description ? <T variant="body" style={{ marginTop: space.sm }}>{mission.description}</T> : null}

          {/* Who */}
          <View style={styles.infoRow}>
            <T variant="smallBold">{whoLabel(mission, fs.members.length)}</T>
            {mission.assignee_ids.length ? <CrestRow userIds={mission.assignee_ids} members={fs.members} size={24} /> : null}
          </View>

          {/* Place */}
          {mission.place ? (
            <View style={styles.place}>
              {mission.place.thumbnail ? (
                <Image source={{ uri: mission.place.thumbnail }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}><T style={{ fontSize: 28, lineHeight: 34 }}>📍</T></View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="bodyBold" numberOfLines={2}>{mission.place.title}</T>
                <T variant="small" numberOfLines={1}>
                  {[mission.place.rating ? `★ ${mission.place.rating}` : null, mission.place.category, mission.place.when].filter(Boolean).join(' · ')}
                </T>
                {mission.place.address ? <T variant="small" numberOfLines={2}>{mission.place.address}</T> : null}
                <Pressable onPress={() => openMaps(mission)} hitSlop={8} accessibilityRole="link">
                  <T variant="smallBold" color={ink.ink} style={styles.link}>Open in Maps ↗</T>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Trial */}
          {mission.trial_question ? (
            <View style={styles.riddle}>
              <T variant="smallBold" color={ink.inkSoft}>The riddle</T>
              <T variant="story" color={ink.ink}>“{mission.trial_question}”</T>
            </View>
          ) : null}

          {/* Already colored */}
          {mission.status === 'complete' ? (
            <View style={styles.doneBox}>
              <WaxSeal size={84} />
              <T variant="heading" center>Colored{completer ? ` by ${completer.display_name}` : ''}</T>
              {mission.story_line ? <T variant="story" center>{mission.story_line}</T> : null}
              <CrestRow userIds={mission.completed_by} members={fs.members} size={30} />
              <Button label="See it on the page" onPress={() => router.navigate('/(tabs)/coloring')} style={{ alignSelf: 'stretch' }} />
            </View>
          ) : mission.status === 'locked' ? (
            <View style={styles.doneBox}>
              <T variant="heading" center>🔒 Sealed for now</T>
              <T variant="story" center>Finish the current chapter and this mission will unseal itself.</T>
            </View>
          ) : (
            <View style={styles.proof}>
              <T variant="heading">Submit proof</T>

              {needPeople ? (
                <View style={{ gap: space.sm }}>
                  <T variant="small">
                    Who did it? Pick at least {minPeople} hero{minPeople === 1 ? '' : 'es'} ({participants.length} chosen).
                  </T>
                  <ParticipantPicker members={fs.members} meId={userId} value={participants} onChange={setParticipants} />
                </View>
              ) : null}

              {(mission.proof_type === 'photo' || mission.proof_type === 'group_photo') ? (
                <View style={{ gap: space.md }}>
                  {photo ? (
                    <View style={styles.previewWrap}>
                      <MagicMirror photoUri={photo} pondering={false} caption="" />
                      <T variant="small" center>{mission.proof_type === 'group_photo' ? 'Everyone in the frame? Good.' : 'The Mirror is ready.'}</T>
                    </View>
                  ) : (
                    <T variant="small">{mission.verification_hint || 'Snap a photo that shows you did it.'}</T>
                  )}
                  <View style={styles.row}>
                    <Button label={photo ? 'Retake' : 'Take photo'} icon="📷" variant="secondary" onPress={() => pick('camera')} style={{ flex: 1 }} small />
                    <Button label="Choose photo" icon="🖼️" variant="secondary" onPress={() => pick('library')} style={{ flex: 1 }} small />
                  </View>
                </View>
              ) : null}

              {(mission.proof_type === 'text' || mission.proof_type === 'voice') ? (
                <View style={{ gap: space.xs }}>
                  <T variant="small">{mission.proof_type === 'voice' ? 'Speak or type your verse' : 'Your words become part of the book.'}</T>
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    multiline
                    maxLength={TEXT_MAX}
                    placeholder="Write your verse…"
                    placeholderTextColor={ink.muted}
                    style={[styles.input, styles.multiline]}
                  />
                  <T variant="small" style={{ alignSelf: 'flex-end' }}>{text.length}/{TEXT_MAX}</T>
                </View>
              ) : null}

              {mission.proof_type === 'answer' ? (
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Your answer"
                  placeholderTextColor={ink.muted}
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => canSubmit && submit()}
                  style={styles.input}
                />
              ) : null}

              {isGift ? (
                iAmGiftRecipient ? (
                  <View style={{ gap: space.sm }}>
                    <MuseBubble text="A gift awaits your seal! Who gave it to you?" avatarSize={32} />
                    <ParticipantPicker members={fs.members} meId={userId} value={giver ? [giver] : []}
                      onChange={(ids) => setGiver(ids[0] ?? null)} mode="single" exclude={userId ? [userId] : []} />
                  </View>
                ) : mission.status === 'pending' ? (
                  <MuseBubble text="Your gift is on its way. Once your friend seals it, the region fills with color." avatarSize={32} />
                ) : (
                  <View style={{ gap: space.sm }}>
                    <T variant="small">Who is receiving your gift? They'll confirm to seal it.</T>
                    <ParticipantPicker members={fs.members} meId={userId} value={recipient ? [recipient] : []}
                      onChange={(ids) => setRecipient(ids[0] ?? null)} mode="single" exclude={userId ? [userId] : []} />
                  </View>
                )
              ) : null}

              {error ? (
                <View style={styles.error}>
                  <T variant="smallBold" color={ink.danger}>The Mirror clouded over</T>
                  <T variant="small">{error}</T>
                </View>
              ) : null}

              {!(isGift && mission.status === 'pending' && !iAmGiftRecipient) ? (
                <Button
                  label={iAmGiftRecipient ? 'Seal it — I received the gift' : mission.proof_type === 'answer' ? 'Speak the answer'
                    : isGift ? 'Send the gift' : error ? 'Try again' : 'Submit proof'}
                  onPress={submit}
                  disabled={!canSubmit}
                />
              ) : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Shell>
  );
}

// ---------- result ----------
function Result({ res, mission, photo, onRetry, onPage, onMissions }: {
  res: SubmitProofResponse; mission: Mission; photo: string | null;
  onRetry: () => void; onPage: () => void; onMissions: () => void;
}) {
  const { verdict } = res;
  const giftPending = verdict.pass && res.mission.status === 'pending';
  const storyLine = res.mission.story_line ?? res.completion?.story_line ?? verdict.flavor_text;
  const [landed, setLanded] = useState(false);
  const { shown } = useTypewriter(storyLine ?? '', 28, landed);
  const lens = (verdict.lens_titles ?? []).filter(Boolean).slice(0, 3);

  useEffect(() => {
    if (!res.page_completed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const t = setTimeout(onPage, 3200); // AD plays the page turn on the coloring tab
    return () => clearTimeout(t);
  }, [res.page_completed, onPage]);

  return (
    <Shell onClose={onMissions}>
      <ScrollView contentContainerStyle={[styles.content, styles.resultContent]}>
        {lens.length ? (
          <View style={styles.lens}>
            <T variant="smallBold" color={ink.inkSoft}>🔍 The Mirror sees:</T>
            <T variant="small" color={ink.ink}>{lens.join(' · ')}</T>
          </View>
        ) : null}

        {!verdict.pass ? (
          <>
            {photo ? <MagicMirror photoUri={photo} pondering={false} caption="" /> : null}
            <MuseBubble text={verdict.flavor_text || 'Not quite, traveler. Look again and try once more.'} />
            <Button label="Try again" onPress={onRetry} style={{ alignSelf: 'stretch' }} />
            <Button label="Back to missions" variant="ghost" onPress={onMissions} />
          </>
        ) : giftPending ? (
          <>
            <T style={styles.bigEmoji}>🎁</T>
            <T variant="title" center>Gift sent!</T>
            <MuseBubble text={verdict.flavor_text || 'Now your friend must seal it. The banner waits.'} />
            <Button label="Back to missions" onPress={onMissions} style={{ alignSelf: 'stretch' }} />
          </>
        ) : (
          <>
            {res.page_completed ? (
              <View style={styles.banner}>
                <T variant="heading" center color={ink.page}>Chapter complete!</T>
                <T variant="small" center color={ink.page}>The page is turning…</T>
              </View>
            ) : null}
            <WaxSeal onLanded={() => setLanded(true)} />
            <T variant="title" center>{res.book_completed ? 'The book is finished!' : 'Region colored!'}</T>
            <T variant="small" center>{mission.title}</T>
            <View style={styles.storyBox}>
              <T variant="story" center color={ink.ink}>{shown || ' '}</T>
            </View>
            <Button label={res.page_completed ? 'Turn the page' : 'See it on the page'} onPress={onPage} style={{ alignSelf: 'stretch' }} />
            <Button label="Back to missions" variant="secondary" onPress={onMissions} style={{ alignSelf: 'stretch' }} />
          </>
        )}
      </ScrollView>
    </Shell>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.grabber} />
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={14} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <T variant="heading">✕</T>
          </Pressable>
        ) : null}
      </View>
      {children}
    </SafeAreaView>
  );
}

function whoLabel(m: Mission, count: number) {
  if (m.type === 'gathering') return `👥 Whole fellowship — ${Math.max(m.required_members, 2)} of ${count} heroes`;
  if (m.type === 'gift') return '🎁 One gives, one receives';
  if (m.required_members >= 2) return `🤝 Needs ${m.required_members} heroes`;
  return '🧭 Solo — you can do this alone';
}

function openMaps(m: Mission) {
  const p = m.place!;
  const url = p.link
    ?? (p.lat != null && p.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.title} ${p.address ?? ''}`)}`);
  Linking.openURL(url).catch(() => {});
}

function readable(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (/network|fetch|timeout|abort/i.test(raw)) return 'The connection wobbled. Your proof is still here — tap Try again.';
  if (/not signed in|401/i.test(raw)) return 'Muse lost track of who you are. Reopen the app and try again.';
  return `${raw.slice(0, 140)}. Your proof is still here — tap Try again.`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ink.paper },
  topBar: { height: 36, alignItems: 'center', justifyContent: 'center' },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: ink.muted },
  close: { position: 'absolute', right: space.lg, top: 4 },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.xs },
  resultContent: { alignItems: 'center', gap: space.lg, paddingTop: space.xl },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginTop: space.md },
  place: {
    flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 2, borderColor: ink.ink,
    backgroundColor: ink.page, marginTop: space.md,
  },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, borderWidth: 1.5, borderColor: ink.ink },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: ink.lavenderMist },
  link: { textDecorationLine: 'underline', marginTop: 2 },
  riddle: { marginTop: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: ink.lavenderMist, borderWidth: 2, borderColor: ink.ink, gap: space.xs },
  proof: { marginTop: space.xl, gap: space.lg, paddingTop: space.lg, borderTopWidth: 2, borderTopColor: ink.ink, borderStyle: 'dashed' },
  doneBox: { marginTop: space.xl, alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  previewWrap: { alignItems: 'center', gap: space.xs },
  input: {
    minHeight: 54, borderWidth: 2.5, borderColor: ink.ink, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md,
    backgroundColor: ink.page, fontFamily: fonts.body, fontSize: type.body, color: ink.ink,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top', fontFamily: fonts.displayItalic, fontSize: type.body + 1 },
  error: { padding: space.md, borderRadius: radius.md, borderWidth: 2, borderColor: ink.danger, backgroundColor: ink.page, gap: 2 },
  lens: { alignSelf: 'stretch', padding: space.md, borderRadius: radius.md, borderWidth: 2, borderColor: ink.ink, backgroundColor: ink.lavenderMist, gap: 2 },
  banner: { alignSelf: 'stretch', padding: space.md, borderRadius: radius.md, backgroundColor: ink.gold, borderWidth: 2.5, borderColor: ink.ink },
  storyBox: { minHeight: 80, paddingHorizontal: space.md, justifyContent: 'center' },
  bigEmoji: { fontSize: 72, lineHeight: 88 },
});
