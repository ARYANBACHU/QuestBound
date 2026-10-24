// Owner: MP. The "Fellowship" segment: every hero with crest, crayon, interests, missions done, founder badge.
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { CRESTS, INTERESTS, fonts, ink, radius, space, type, type CrestId } from '@/shared/theme';
import type { FellowshipMember, Mission } from '@/shared/types';
import Crest from './Crest';
import { crayonHex } from './color';

const INTEREST_LABEL = Object.fromEntries(INTERESTS.map((i) => [i.id, i.label]));

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface MembersViewProps {
  members: FellowshipMember[];
  /** Missions of the current book (for "N missions colored"). */
  missions: Mission[];
  online: Set<string>;
  myId: string | null;
  onInvite: () => void;
  onOpenMember: (userId: string) => void;
}

export default function MembersView({ members, missions, online, myId, onInvite, onOpenMember }: MembersViewProps) {
  const stats = useMemo(() => {
    const out: Record<string, { count: number; points: number }> = {};
    missions
      .filter((m) => m.status === 'complete')
      .forEach((m) =>
        m.completed_by.forEach((uid) => {
          out[uid] ??= { count: 0, points: 0 };
          out[uid].count += 1;
          out[uid].points += m.points;
        }),
      );
    return out;
  }, [missions]);

  // Founder first, then me, then by join order.
  const sorted = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.role !== b.role) return a.role === 'founder' ? -1 : 1;
        if (a.user_id === myId) return -1;
        if (b.user_id === myId) return 1;
        return a.joined_at < b.joined_at ? -1 : 1;
      }),
    [members, myId],
  );

  return (
    <FlatList
      data={sorted}
      keyExtractor={(m) => m.user_id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>A fellowship of one is still a fellowship. But stories are better with friends — invite some.</Text>
      }
      renderItem={({ item }) => {
        const p = item.profile;
        const s = stats[item.user_id];
        const isMe = item.user_id === myId;
        return (
          <Pressable
            onPress={() => onOpenMember(item.user_id)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${p?.display_name ?? 'member'}`}
          >
            <Crest crest={p?.crest} color={p?.color} size={64} online={online.has(item.user_id)} />
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {p?.display_name ?? 'A wanderer'}
                  {p ? <Text style={styles.crestTitle}> the {CRESTS[p.crest as CrestId]?.title ?? 'Wanderer'}</Text> : null}
                </Text>
              </View>
              <View style={styles.badges}>
                {item.role === 'founder' ? (
                  <View style={[styles.badge, styles.founder]}>
                    <Text style={styles.badgeText}>👑 Founder</Text>
                  </View>
                ) : null}
                {isMe ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>You</Text>
                  </View>
                ) : null}
                {p ? (
                  <View style={styles.swatchRow}>
                    <View style={[styles.swatch, { backgroundColor: crayonHex(p.color) }]} />
                    <Text style={styles.swatchText}>{cap(p.color)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.stat}>
                {s ? `${s.count} mission${s.count === 1 ? '' : 's'} colored · ${s.points} pts` : 'No regions colored yet'}
              </Text>
              {p?.interests?.length ? (
                <View style={styles.chips}>
                  {p.interests.slice(0, 6).map((id) => (
                    <View key={id} style={styles.chip}>
                      <Text style={styles.chipText}>{INTEREST_LABEL[id] ?? id}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      }}
      ListFooterComponent={
        <Pressable onPress={onInvite} style={({ pressed }) => [styles.invite, pressed && styles.pressed]}>
          <Text style={styles.inviteText}>Invite friends</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, gap: space.md },
  empty: { fontFamily: fonts.displayItalic, fontSize: type.body, color: ink.inkSoft, textAlign: 'center', padding: space.xl },
  card: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    backgroundColor: ink.page,
    borderWidth: 3,
    borderColor: ink.ink,
    borderRadius: radius.lg,
  },
  cardPressed: { transform: [{ scale: 0.985 }], backgroundColor: ink.lavenderMist },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontFamily: fonts.display, fontSize: type.heading, color: ink.ink, flexShrink: 1 },
  crestTitle: { fontFamily: fonts.displayItalic, fontSize: type.body, color: ink.inkSoft },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  badge: { borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 1, backgroundColor: ink.page },
  founder: { backgroundColor: ink.gold },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: ink.ink },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: ink.ink },
  swatchText: { fontFamily: fonts.bodyBold, fontSize: 12, color: ink.inkSoft },
  stat: { fontFamily: fonts.body, fontSize: type.small, color: ink.inkSoft, marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm },
  chip: { backgroundColor: ink.lavenderMist, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  chipText: { fontFamily: fonts.body, fontSize: 12, color: ink.ink },
  invite: { marginTop: space.md, borderRadius: radius.pill, borderWidth: 3, borderColor: ink.ink, backgroundColor: ink.ink, paddingVertical: space.md, alignItems: 'center' },
  inviteText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.page },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
