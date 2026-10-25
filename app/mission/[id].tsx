// Owner: AB. Mission detail + proof submission — the core loop's action.
// Photo → uploadProof → submitProof (+ GPS for place missions) → Magic Mirror → reward pack (pass) or Sage's hint (fail).
// One primary action pinned at the bottom; secondary actions (reroll, maps) in the "…" menu.
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionMenu, type MenuItem } from '@/components/shell/ActionMenu';
import { Button } from '@/components/shell/Button';
import { KeyboardSafe, KeyboardSafeScroll } from '@/components/shell/KeyboardSafe';
import { MagicMirror } from '@/components/shell/MagicMirror';
import { regionLabel } from '@/components/shell/missionUtils';
import { ParchmentLoading } from '@/components/shell/ParchmentLoading';
import { ParticipantPicker } from '@/components/shell/ParticipantPicker';
import { RerollSheet } from '@/components/shell/RerollSheet';
import { playSfx } from '@/components/shell/sfx';
import { T } from '@/components/shell/T';
import { CrestRow, MissionTypeIcon } from '@/components/shell/teammates';
import { formatDistance, hasCoords, useProximity, type Proximity } from '@/components/shell/useProximity';
import { RewardPack, crayonHex } from '@/components/shell/RewardPack';
import { WaxSeal } from '@/components/shell/WaxSeal';
import { SageBubble } from '@/components/wizard/SageBubble';
import { submitProof, uploadProof } from '@/lib/api';
import { useChat } from '@/lib/chat';
import { useFellowship, profileOf } from '@/lib/fellowship';
import { CREW_LABEL, crewOf, useMission, useStoryline } from '@/lib/game';
import { openInMaps } from '@/lib/maps';
import { useSession } from '@/lib/session';
import type { Mission, Page, Place, SubmitProofRequest, SubmitProofResponse } from '@/shared/types';
import {
  SCREEN_GRADIENTS, accent, chips, fonts, ink, moodFor, panel, radius, shadow, space, type, ui, type Mood,
} from '@/shared/theme';

// A broken screen shows Sage's "Something went awry — tap to recover" instead of crashing (B1).
export { RouteErrorBoundary as ErrorBoundary } from '@/components/shell/ErrorBoundary';

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
  const { pages, storyline } = useStoryline(fs.fellowship?.id ?? null);
  // V2: demo books (UT campus) show the distance but never block on location.
  const geoFree = storyline?.geo_enforced === false;
  const { messages } = useChat(fs.fellowship?.id ?? null);
  const page = pages.find((p) => p.id === mission?.page_id) ?? null;
  const mood = moodFor(page?.template_id);

  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const [photo, setPhoto] = useState<string | null>(null);
  const uploaded = useRef<{ uri: string; url: string } | null>(null); // never re-upload the same photo on retry
  const [text, setText] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [recipient, setRecipient] = useState<string | null>(null);
  const [giver, setGiver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rerollOpen, setRerollOpen] = useState(false);
  const [rerolled, setRerolled] = useState<string | null>(null);

  const actionable = !!mission && (mission.status === 'open' || mission.status === 'pending');
  const prox = useProximity(mission?.place, actionable);

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
      <Shell mood={mood} onClose={() => router.back()}>
        <View style={styles.centerFill}>
          <SageBubble layout="stack" expression="surprised" sageSize={120}
            text="Hmm. That mission scroll has blown away. Head back to the board and pick another." />
        </View>
        <Footer><Button label="Back to missions" onPress={() => router.navigate('/(tabs)/missions')} /></Footer>
      </Shell>
    );
  }

  const isGift = mission.proof_type === 'confirm';
  const isPhoto = mission.proof_type === 'photo' || mission.proof_type === 'group_photo';
  const iAmGiftRecipient = isGift && mission.status === 'pending' && giftGiver !== userId;
  const waitingOnGift = isGift && mission.status === 'pending' && !iAmGiftRecipient;
  const needPeople = mission.required_members >= 2 && !isGift;
  const minPeople = mission.type === 'gathering' && fs.members.length >= 4 ? mission.required_members - 1 : mission.required_members;

  // ---------- submit ----------
  const submit = async () => {
    if (!userId) return;
    setError(null);
    const req: SubmitProofRequest = { mission_id: mission.id, participant_ids: needPeople ? participants : [userId] };
    if (prox.coords && hasCoords(mission.place)) {
      req.lat = prox.coords.lat;
      req.lng = prox.coords.lng;
      if (prox.coords.accuracy_m != null) req.accuracy_m = Math.round(prox.coords.accuracy_m);
    }
    try {
      if (isPhoto) {
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); playSfx('error');
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
      <Shell mood={mood}>
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
        mood={mood}
        res={phase.res}
        geoFree={geoFree}
        mission={mission}
        photo={photo}
        page={page}
        color={crayonHex(profileOf(fs.members, phase.res.mission.completed_by[0] ?? userId)?.color)}
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
  const menu: MenuItem[] = [
    ...(mission.status === 'open' ? [{ label: 'Ask Sage for a different mission', icon: '🎲', onPress: () => setRerollOpen(true) }] : []),
    ...(mission.place ? [{ label: 'Open in Maps', icon: '🗺️', onPress: () => { openInMaps(mission.place); } }] : []),
  ];
  const primaryLabel = iAmGiftRecipient ? 'Seal it — I received the gift'
    : mission.proof_type === 'answer' ? 'Speak the answer'
    : isGift ? 'Send the gift'
    : error ? 'Try again' : 'Submit proof';

  return (
    <Shell mood={mood} onClose={() => router.back()} menu={menu}>
      <KeyboardSafe>
        <KeyboardSafeScroll contentContainerStyle={styles.content}>
          {/* Header: the focal point */}
          <View style={styles.kicker}>
            <View style={[styles.typeIcon, { backgroundColor: mood.tintStrong }]}>
              <MissionTypeIcon type={mission.type} size={22} />
            </View>
            <T variant="smallBold" color={mood.deep} style={styles.fill} numberOfLines={1}>
              {CREW_LABEL[crewOf(mission)]} · {regionLabel(page, mission)} · {mission.points} pts
            </T>
          </View>
          <T variant="title">{mission.title}</T>
          {mission.story_hook ? <T variant="story">{mission.story_hook}</T> : null}
          {rerolled ? <T variant="smallBold" color={accent.secondary}>{rerolled}</T> : null}
          {mission.description ? <T variant="body" style={styles.desc}>{mission.description}</T> : null}

          <View style={styles.who}>
            <T variant="smallBold">{whoLabel(mission, fs.members.length)}</T>
            {mission.assignee_ids.length ? <CrestRow userIds={mission.assignee_ids} members={fs.members} size={24} /> : null}
          </View>

          {mission.place ? <PlaceCard place={mission.place} prox={actionable ? prox : null} geoFree={geoFree} /> : null}

          {mission.trial_question ? (
            <View style={[styles.panel, { backgroundColor: mood.tint }]}>
              <T variant="smallBold" color={mood.deep}>The riddle</T>
              <T variant="story" color={ink.ink}>“{mission.trial_question}”</T>
            </View>
          ) : null}

          {mission.status === 'complete' ? (
            <View style={styles.doneBox}>
              <WaxSeal size={84} />
              <T variant="heading" center>Colored{completer ? ` by ${completer.display_name}` : ''}</T>
              {mission.story_line ? <T variant="story" center>{mission.story_line}</T> : null}
              <CrestRow userIds={mission.completed_by} members={fs.members} size={30} />
            </View>
          ) : mission.status === 'locked' ? (
            <View style={styles.doneBox}>
              <SageBubble expression="sleepy" sageSize={64} text="This mission is sealed until the chapter before it is fully colored." />
            </View>
          ) : (
            <View style={styles.proof}>
              <T variant="heading">Your proof</T>

              {needPeople ? (
                <View style={{ gap: space.sm }}>
                  <T variant="small">
                    Who did it? Pick at least {minPeople} hero{minPeople === 1 ? '' : 'es'} ({participants.length} chosen).
                  </T>
                  <ParticipantPicker members={fs.members} meId={userId} value={participants} onChange={setParticipants} />
                </View>
              ) : null}

              {isPhoto ? (
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
                    <Button label={photo ? 'Retake' : 'Take photo'} icon="📷" variant="secondary" onPress={() => pick('camera')} style={styles.fill} small sfx="open" />
                    <Button label="Choose photo" icon="🖼️" variant="secondary" onPress={() => pick('library')} style={styles.fill} small sfx="open" />
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
                    accessibilityLabel="Your verse"
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
                  accessibilityLabel="Your answer"
                  onSubmitEditing={() => canSubmit && submit()}
                  style={styles.input}
                />
              ) : null}

              {isGift ? (
                iAmGiftRecipient ? (
                  <View style={{ gap: space.sm }}>
                    <SageBubble text="A gift awaits your seal! Who gave it to you?" expression="happy" sageSize={56} />
                    <ParticipantPicker members={fs.members} meId={userId} value={giver ? [giver] : []}
                      onChange={(ids) => setGiver(ids[0] ?? null)} mode="single" exclude={userId ? [userId] : []} />
                  </View>
                ) : waitingOnGift ? (
                  <SageBubble text="Your gift is on its way. Once your friend seals it, the region fills with color." sageSize={56} />
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
            </View>
          )}
        </KeyboardSafeScroll>

        <Footer>
          {mission.status === 'complete' ? (
            <Button label="See it on the page" onPress={() => router.navigate('/(tabs)/coloring')} />
          ) : mission.status === 'locked' || waitingOnGift ? (
            <Button label="Back to missions" variant="secondary" onPress={() => router.back()} />
          ) : (
            <Button label={primaryLabel} onPress={submit} disabled={!canSubmit} sfx="send" />
          )}
        </Footer>
      </KeyboardSafe>

      <RerollSheet
        mission={mission}
        visible={rerollOpen}
        onClose={() => setRerollOpen(false)}
        onRerolled={(next) => {
          setText(''); setPhoto(null); uploaded.current = null; setError(null);
          setRerolled(`Sage rewrote this quest${next.title !== mission.title ? '' : ' (same title, new task)'}.`);
        }}
      />
    </Shell>
  );
}

// ---------- place ----------
function PlaceCard({ place, prox, geoFree }: { place: Place; prox: Proximity | null; geoFree: boolean }) {
  const meta = [place.rating ? `★ ${place.rating}` : null, place.category, place.when].filter(Boolean).join(' · ');
  return (
    <View style={styles.place}>
      <Pressable
        style={styles.placeMain}
        onPress={() => { Haptics.selectionAsync().catch(() => {}); playSfx('open'); openInMaps(place); }}
        accessibilityRole="link"
        accessibilityLabel={`${place.title}. Open in Maps`}
      >
        {place.thumbnail ? (
          <Image source={{ uri: place.thumbnail }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}><T style={styles.pin}>📍</T></View>
        )}
        <View style={styles.fill}>
          <T variant="bodyBold" numberOfLines={2}>{place.title}</T>
          {meta ? <T variant="small" numberOfLines={1}>{meta}</T> : null}
          {place.address ? <T variant="small" numberOfLines={1}>{place.address}</T> : null}
        </View>
      </Pressable>
      <View style={styles.placeActions}>
        <Pressable
          onPress={() => { Haptics.selectionAsync().catch(() => {}); playSfx('open'); openInMaps(place); }}
          style={styles.mapsBtn}
          accessibilityRole="button"
          accessibilityLabel="Open in Maps"
        >
          <T variant="smallBold" color={chips.secondary.fg}>🗺️ Open in Maps</T>
        </Pressable>
        {place.website ? (
          <Pressable onPress={() => Linking.openURL(place.website!).catch(() => {})} hitSlop={8} accessibilityRole="link">
            <T variant="small" style={styles.link}>Website</T>
          </Pressable>
        ) : null}
        <View style={styles.fill} />
        {prox ? <ProximityBadge prox={prox} geoFree={geoFree} /> : null}
      </View>
    </View>
  );
}

function ProximityBadge({ prox, geoFree }: { prox: Proximity; geoFree: boolean }) {
  switch (prox.status) {
    case 'off': return null;
    case 'asking':
    case 'locating': return <T variant="small">Finding you…</T>;
    case 'denied':
    case 'error':
      // Location isn't needed for a demo book — no warning, just a quiet note.
      if (geoFree) return <T variant="small" color={ink.inkSoft}>Counts from anywhere</T>;
      return (
        <Pressable onPress={prox.retry} hitSlop={8} accessibilityRole="button"
          accessibilityLabel="Location is off. Tap to try again">
          <T variant="smallBold" color={accent.warm}>{prox.status === 'denied' ? 'Location off · retry' : 'Can’t find you · retry'}</T>
        </Pressable>
      );
    case 'ready':
      return prox.close ? (
        <View style={[styles.badge, { backgroundColor: chips.secondary.bg, borderColor: chips.secondary.border }]}>
          <T variant="smallBold" color={chips.secondary.fg}>✨ You're close!</T>
        </View>
      ) : (
        <T variant="smallBold" color={ink.inkSoft}>
          {prox.distance_m != null ? `${formatDistance(prox.distance_m)} away` : ''}
          {geoFree ? <T variant="small" color={ink.inkSoft}>{prox.distance_m != null ? ' · ' : ''}counts from anywhere</T> : null}
        </T>
      );
  }
}

// ---------- result ----------
function Result({ mood, res, geoFree, mission, photo, page, color, onRetry, onPage, onMissions }: {
  mood: Mood; res: SubmitProofResponse; geoFree: boolean; mission: Mission; photo: string | null; page: Page | null; color: string;
  onRetry: () => void; onPage: () => void; onMissions: () => void;
}) {
  const { verdict } = res;
  const giftPending = verdict.pass && res.mission.status === 'pending';
  const storyLine = res.mission.story_line ?? res.completion?.story_line ?? verdict.flavor_text;
  const [revealed, setRevealed] = useState(false); // the reward pack finished (or was skipped)
  const lens = (verdict.lens_titles ?? []).filter(Boolean).slice(0, 3);
  const far = !geoFree && !verdict.pass && verdict.distance_m != null && verdict.distance_m > 0
    ? `You were about ${formatDistance(verdict.distance_m)} from the spot.` : null;

  useEffect(() => {
    if (!verdict.pass) playSfx('error');
  }, [verdict.pass]);
  useEffect(() => {
    if (!res.page_completed || !revealed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const t = setTimeout(onPage, 2600); // after the reward pack; AD plays the page turn on the coloring tab
    return () => clearTimeout(t);
  }, [res.page_completed, revealed, onPage]);

  const lensBox = lens.length ? (
    <View style={[styles.panel, styles.stretch, { backgroundColor: mood.tint }]}>
      <T variant="smallBold" color={mood.deep}>🔍 The Mirror sees</T>
      <T variant="small" color={ink.ink}>{lens.join(' · ')}</T>
    </View>
  ) : null;

  if (!verdict.pass) {
    return (
      <Shell mood={mood} onClose={onMissions}>
        <ScrollView contentContainerStyle={[styles.content, styles.resultContent]}>
          {photo ? <MagicMirror photoUri={photo} pondering={false} caption="" /> : null}
          {lensBox}
          <SageBubble expression="surprised" sageSize={72}
            text={[verdict.flavor_text || 'Not quite, traveler. Look again and try once more.', far].filter(Boolean).join(' ')} />
        </ScrollView>
        <Footer>
          <Button label="Try again" onPress={onRetry} />
          <Button label="Back to missions" variant="ghost" onPress={onMissions} />
        </Footer>
      </Shell>
    );
  }

  if (giftPending) {
    return (
      <Shell mood={mood} onClose={onMissions}>
        <View style={styles.centerFill}>
          <SageBubble layout="stack" expression="happy" sageSize={120}
            text={verdict.flavor_text || 'Gift sent! Now your friend must seal it. The banner waits.'} />
        </View>
        <Footer><Button label="Back to missions" onPress={onMissions} /></Footer>
      </Shell>
    );
  }

  return (
    <Shell mood={mood} onClose={onMissions}>
      <ScrollView contentContainerStyle={[styles.content, styles.resultContent]}>
        <T variant="title" center>{res.book_completed ? 'The book is finished!' : 'Region colored!'}</T>
        <T variant="small" center>{mission.title}</T>
        <RewardPack
          templateId={page?.template_id}
          regionId={res.mission.region_id}
          regionLabel={regionLabel(page, res.mission)}
          color={color}
          points={res.mission.points ?? mission.points ?? 0}
          storyLine={storyLine ?? ''}
          onDone={() => setRevealed(true)}
        />
        {res.page_completed && revealed ? (
          <View style={[styles.banner, styles.stretch]}>
            <T variant="heading" center>Chapter complete!</T>
            <T variant="small" center color={ink.ink}>The page is turning…</T>
          </View>
        ) : null}
        {revealed ? lensBox : null}
      </ScrollView>
      <Footer>
        <Button label={res.page_completed ? 'Turn the page' : 'See it on the page'} onPress={onPage} tone={res.page_completed ? 'gold' : undefined}
          sfx={res.page_completed ? 'page' : 'open'} />
        <Button label="Back to missions" variant="ghost" sfx="close" onPress={onMissions} />
      </Footer>
    </Shell>
  );
}

// ---------- frame ----------
function Shell({ children, onClose, menu, mood }: { children: React.ReactNode; onClose?: () => void; menu?: MenuItem[]; mood: Mood }) {
  return (
    <LinearGradient colors={SCREEN_GRADIENTS[mood.id]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          {onClose ? (
            <Pressable onPress={() => { playSfx('close'); onClose(); }} hitSlop={14} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
              <T variant="heading">✕</T>
            </Pressable>
          ) : <View style={styles.close} />}
          <View style={styles.grabber} />
          <View style={styles.menuSlot}>{menu?.length ? <ActionMenu items={menu} top={44} /> : null}</View>
        </View>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

function whoLabel(m: Mission, count: number) {
  if (m.type === 'gathering') return `👥 Whole fellowship — ${Math.max(m.required_members, 2)} of ${count} heroes`;
  if (m.type === 'gift') return '🎁 One gives, one receives';
  if (m.required_members >= 2) return `🤝 ${CREW_LABEL[crewOf(m)]} — needs ${m.required_members} heroes`;
  return '🧭 Solo — you can do this alone';
}

function readable(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (/network|fetch|timeout|abort/i.test(raw)) return 'The connection wobbled. Your proof is still here — tap Try again.';
  if (/not signed in|401/i.test(raw)) return 'Sage lost track of who you are. Reopen the app and try again.';
  return `${raw.slice(0, 140)}. Your proof is still here — tap Try again.`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  stretch: { alignSelf: 'stretch' },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: ink.muted },
  close: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  menuSlot: { width: 40, alignItems: 'flex-end' },
  content: { padding: space.lg, paddingTop: space.sm, paddingBottom: space.xl, gap: space.xs },
  resultContent: { alignItems: 'center', gap: space.lg, paddingTop: space.lg },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm, gap: space.xs },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  typeIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center' },
  desc: { marginTop: space.sm },
  who: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginTop: space.md },
  panel: {
    marginTop: space.md, padding: space.lg, borderRadius: ui.cardRadius, borderWidth: 2, borderColor: ink.ink, gap: space.xs,
    overflow: 'hidden',
  },
  place: {
    marginTop: space.md, borderRadius: ui.cardRadius, borderWidth: panel.borderWidth, borderColor: panel.border,
    backgroundColor: panel.parchment, overflow: 'hidden', ...shadow.sm,
  },
  placeMain: { flexDirection: 'row', gap: space.md, padding: space.md },
  thumb: { width: 64, height: 64, borderRadius: radius.md, borderWidth: 1.5, borderColor: ink.ink },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: ink.lavenderMist },
  pin: { fontSize: 26, lineHeight: 32 },
  placeActions: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm,
    borderTopWidth: 1.5, borderTopColor: panel.parchmentEdge,
  },
  mapsBtn: {
    paddingVertical: space.xs, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 2,
    borderColor: chips.secondary.border, backgroundColor: chips.secondary.bg,
  },
  link: { textDecorationLine: 'underline' },
  badge: { paddingVertical: 2, paddingHorizontal: space.sm, borderRadius: radius.pill, borderWidth: 1.5 },
  proof: { marginTop: space.xl, gap: space.lg },
  doneBox: { marginTop: space.xl, alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  previewWrap: { alignItems: 'center', gap: space.xs },
  input: {
    minHeight: 54, borderWidth: ui.borderWidth, borderColor: ink.ink, borderRadius: radius.md, paddingHorizontal: space.lg,
    paddingVertical: space.md, backgroundColor: ink.page, fontFamily: fonts.body, fontSize: type.body, color: ink.ink,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top', fontFamily: fonts.displayItalic, fontSize: type.body + 1 },
  error: { padding: space.md, borderRadius: radius.md, borderWidth: 2, borderColor: ink.danger, backgroundColor: ink.page, gap: 2 },
  banner: { padding: space.md, borderRadius: ui.cardRadius, backgroundColor: accent.goldSoft, borderWidth: 2.5, borderColor: ink.ink, overflow: 'hidden' },
  sealRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  storyBox: { minHeight: 80, paddingHorizontal: space.md, justifyContent: 'center' },
});
