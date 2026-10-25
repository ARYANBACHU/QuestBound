// Owner: MP. A hero's page: crest, crayon, interests, the regions they've colored this book, and a "Send a raven"
// nudge that posts a playful Sage line in the chat.
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CRESTS, INTERESTS, fonts, ink, radius, space, type, ui, type CrestId } from '@/shared/theme';
import { regionDef } from '@/shared/templates';
import type { FellowshipMember, Mission, Page, Profile } from '@/shared/types';
import type { ChatState } from '@/lib/chat';
import { heroName, profileOf } from '@/lib/fellowship';
import Crest from './Crest';
import { crayonHex, withAlpha } from './color';
import { haptic } from './haptics';
import { pointsFor } from './points';

const INTEREST_LABEL = Object.fromEntries(INTERESTS.map((i) => [i.id, i.label]));
const NUDGE_COOLDOWN_MS = 10 * 60 * 1000;
const lastNudged = new Map<string, number>();

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The line Sage's raven carries. */
export function nudgeLine(from: Profile | undefined, target: Profile, lastSeenIso: string | null, waiting: Mission | undefined): string {
  const crest = CRESTS[target.crest as CrestId]?.title ?? 'Wanderer';
  let seen: string;
  if (!lastSeenIso) seen = 'has not said a word to the fellowship yet';
  else {
    const days = Math.floor((Date.now() - new Date(lastSeenIso).getTime()) / 86_400_000);
    seen = days >= 1 ? `has not been seen in ${days} day${days === 1 ? '' : 's'}` : 'has gone suspiciously quiet';
  }
  const tail = waiting ? ` ${waiting.title} still waits.` : ' The story is not the same without them.';
  const sender = from ? from.display_name : 'Someone';
  return `🪶 ${sender} sent Sage's raven to ${heroName(target)}: “The ${crest} ${seen}…${tail}”`;
}

export interface MemberSheetProps {
  member: FellowshipMember | null;
  members: FellowshipMember[];
  myId: string | null;
  online: Set<string>;
  chat: ChatState;
  missions: Mission[];
  pages: Page[];
  onClose: () => void;
}

export default function MemberSheet({ member, members, myId, online, chat, missions, pages, onClose }: MemberSheetProps) {
  const insets = useSafeAreaInsets();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = member?.profile;
  const isMe = member?.user_id === myId;

  const colored = useMemo(() => {
    if (!member) return [];
    const pageById = Object.fromEntries(pages.map((pg) => [pg.id, pg]));
    return missions
      .filter((m) => m.status === 'complete' && (m.completed_by ?? []).includes(member.user_id))
      .sort((a, b) => (a.completed_at ?? '').localeCompare(b.completed_at ?? ''))
      .map((m) => {
        const pg = pageById[m.page_id];
        return { m, region: pg ? (regionDef(pg.template_id, m.region_id)?.label ?? m.region_id) : m.region_id, chapter: pg?.chapter_number };
      });
  }, [member, missions, pages]);

  if (!member || !p) return null;

  const lastSeen = [...chat.messages].reverse().find((x) => x.user_id === member.user_id)?.created_at ?? null;
  const waiting =
    missions.find((m) => m.status === 'open' && (m.assignee_ids ?? []).includes(member.user_id)) ??
    missions.find((m) => m.status === 'open' && pages.find((pg) => pg.id === m.page_id)?.status === 'active');
  const cooling = Date.now() - (lastNudged.get(member.user_id) ?? 0) < NUDGE_COOLDOWN_MS;

  const nudge = async () => {
    setError(null);
    try {
      await chat.sendSystem(nudgeLine(profileOf(members, myId), p, lastSeen, waiting));
      lastNudged.set(member.user_id, Date.now());
      setSent(true);
      haptic.success();
    } catch (e) {
      haptic.warning();
      setError(e instanceof Error ? e.message : "Sage's raven got lost. Try again.");
    }
  };

  const close = () => {
    setSent(false);
    setError(null);
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grabber} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Crest crest={p.crest} color={p.color} size={96} online={online.has(member.user_id)} />
          <Text style={styles.name}>{p.display_name}</Text>
          <Text style={styles.title}>the {CRESTS[p.crest as CrestId]?.title ?? 'Wanderer'}</Text>
          <View style={styles.badges}>
            {member.role === 'founder' ? (
              <View style={[styles.badge, styles.founder]}>
                <Text style={styles.badgeText}>👑 Founder</Text>
              </View>
            ) : null}
            <View style={styles.badge}>
              <View style={[styles.swatch, { backgroundColor: crayonHex(p.color) }]} />
              <Text style={styles.badgeText}>{cap(p.color)} crayon</Text>
            </View>
            {online.has(member.user_id) ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Here now</Text>
              </View>
            ) : null}
          </View>

          {p.interests?.length ? (
            <View style={styles.chips}>
              {p.interests.map((id) => (
                <View key={id} style={styles.chip}>
                  <Text style={styles.chipText}>{INTEREST_LABEL[id] ?? id}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.section}>Colored in this book · {pointsFor(member.user_id, missions)} pts</Text>
          {colored.length ? (
            colored.map(({ m, region, chapter }) => (
              <View key={m.id} style={[styles.region, { borderLeftColor: crayonHex(p.color), backgroundColor: withAlpha(crayonHex(p.color), 0.08) }]}>
                <Text style={styles.regionTitle}>
                  {region}
                  {chapter ? <Text style={styles.regionChapter}> · Chapter {chapter}</Text> : null}
                </Text>
                <Text style={styles.regionMission}>{m.title}</Text>
                {m.story_line ? <Text style={styles.storyLine}>{m.story_line}</Text> : null}
              </View>
            ))
          ) : (
            <Text style={styles.empty}>
              {isMe ? 'Your crayon is still sharp. Pick a mission and color your first region.' : `${p.display_name}'s crayon is still sharp. No regions yet.`}
            </Text>
          )}

          {!isMe ? (
            <View style={styles.nudgeBox}>
              <Pressable
                disabled={sent || cooling}
                onPress={nudge}
                style={({ pressed }) => [styles.nudge, (sent || cooling) && styles.disabled, pressed && styles.pressed]}
              >
                <Text style={styles.nudgeText}>{sent || cooling ? 'The raven is on its way' : 'Send a raven 🪶'}</Text>
              </Pressable>
              <Text style={styles.hint}>
                {sent || cooling ? 'Give them a little while to answer.' : 'Sage will post a playful nudge in the chat.'}
              </Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: withAlpha(ink.ink, 0.45) },
  sheet: {
    maxHeight: '85%',
    backgroundColor: ink.paper,
    borderTopLeftRadius: ui.cardRadius,
    borderTopRightRadius: ui.cardRadius,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: ink.ink,
    overflow: 'hidden',
    paddingTop: space.sm,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: ink.muted, marginBottom: space.md },
  content: { alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.lg },
  name: { fontFamily: fonts.display, fontSize: type.hero, color: ink.ink, marginTop: space.md },
  title: { fontFamily: fonts.displayItalic, fontSize: type.heading, color: ink.inkSoft },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, marginTop: space.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 3, backgroundColor: ink.page },
  founder: { backgroundColor: ink.gold },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: type.small, color: ink.ink },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: ink.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: space.md },
  chip: { backgroundColor: ink.lavenderMist, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  chipText: { fontFamily: fonts.body, fontSize: 12, color: ink.ink },
  section: {
    alignSelf: 'stretch',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: ink.inkSoft,
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  region: { alignSelf: 'stretch', borderLeftWidth: 6, borderRadius: radius.sm, padding: space.md, marginBottom: space.sm },
  regionTitle: { fontFamily: fonts.display, fontSize: type.body, color: ink.ink },
  regionChapter: { fontFamily: fonts.body, fontSize: type.small, color: ink.inkSoft },
  regionMission: { fontFamily: fonts.body, fontSize: type.small, color: ink.inkSoft, marginTop: 2 },
  storyLine: { fontFamily: fonts.displayItalic, fontSize: type.body, color: ink.ink, marginTop: space.xs },
  empty: { alignSelf: 'stretch', fontFamily: fonts.displayItalic, fontSize: type.body, color: ink.inkSoft },
  nudgeBox: { alignSelf: 'stretch', marginTop: space.xl, alignItems: 'center' },
  nudge: { alignSelf: 'stretch', borderRadius: radius.pill, borderWidth: 3, borderColor: ink.ink, backgroundColor: ink.ink, paddingVertical: space.md, alignItems: 'center' },
  nudgeText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.page },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  hint: { fontFamily: fonts.body, fontSize: type.small, color: ink.muted, marginTop: space.sm, textAlign: 'center' },
  error: { fontFamily: fonts.body, fontSize: type.small, color: ink.danger, marginTop: space.sm, textAlign: 'center' },
});
