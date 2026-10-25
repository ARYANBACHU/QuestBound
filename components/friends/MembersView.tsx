// Owner: MP. The fellowship roster, ranked by points (leaderboard): crest, name, one line of progress.
// Details (interests, regions colored, nudge) live in the MemberSheet a tap away.
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { CRESTS, accent, fonts, ink, panel, shadow, space, type, ui, type CrestId } from '@/shared/theme';
import type { FellowshipMember, Mission } from '@/shared/types';
import Crest from './Crest';
import GameButton from './GameButton';
import { leaderboard } from './points';
import { Sage } from './sage';

export interface MembersViewProps {
  members: FellowshipMember[];
  /** Missions of the current book (points + missions colored). */
  missions: Mission[];
  online: Set<string>;
  myId: string | null;
  onInvite: () => void;
  onOpenMember: (userId: string) => void;
}

export default function MembersView({ members, missions, online, myId, onInvite, onOpenMember }: MembersViewProps) {
  const rows = useMemo(() => {
    const byId = Object.fromEntries(members.map((m) => [m.user_id, m]));
    const board = leaderboard(members, missions);
    // Ties share a rank (and a crown).
    return board
      .map((r) => ({ ...r, rank: 1 + board.filter((o) => o.points > r.points).length, member: byId[r.user_id] }))
      .filter((r) => r.member);
  }, [members, missions]);

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.user_id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Sage expression="idle" size="md" />
          <Text style={styles.empty}>A fellowship of one is still a fellowship. But stories are better with friends.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const p = item.member.profile;
        const isMe = item.user_id === myId;
        const crestTitle = p ? (CRESTS[p.crest as CrestId]?.title ?? 'Wanderer') : 'Wanderer';
        return (
          <Pressable
            onPress={() => onOpenMember(item.user_id)}
            style={({ pressed }) => [styles.card, isMe && styles.cardMe, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${p?.display_name ?? 'A wanderer'}, ${item.points} points. Open profile`}
          >
            <Text style={[styles.rank, item.rank === 1 && item.points > 0 && styles.rankTop]}>
              {item.rank === 1 && item.points > 0 ? '👑' : item.rank}
            </Text>
            <Crest crest={p?.crest} color={p?.color} size={48} online={online.has(item.user_id)} />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {p?.display_name ?? 'A wanderer'}
                {isMe ? <Text style={styles.you}> (you)</Text> : null}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                the {crestTitle}
                {item.member.role === 'founder' ? ' · founder' : ''}
                {' · '}
                {item.missions ? `${item.missions} region${item.missions === 1 ? '' : 's'}` : 'crayon still sharp'}
              </Text>
            </View>
            <Text style={styles.points}>
              {item.points}
              <Text style={styles.pts}> pts</Text>
            </Text>
          </Pressable>
        );
      }}
      ListFooterComponent={<GameButton label="Invite friends" tone="forest" onPress={onInvite} style={styles.invite} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingTop: space.sm, gap: space.sm },
  emptyBox: { alignItems: 'center', gap: space.md, padding: space.xl },
  empty: { fontFamily: fonts.displayItalic, fontSize: type.body, color: ink.inkSoft, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    backgroundColor: panel.parchment,
    borderWidth: ui.borderWidth,
    borderColor: ink.ink,
    borderRadius: ui.cardRadius,
    ...shadow.sm,
  },
  cardMe: { backgroundColor: accent.primarySoft },
  pressed: { opacity: 0.85, transform: [{ scale: ui.pressScale }] },
  rank: { width: 26, textAlign: 'center', fontFamily: fonts.display, fontSize: type.heading, color: ink.inkSoft },
  rankTop: { fontSize: type.heading - 2 },
  info: { flex: 1 },
  name: { fontFamily: fonts.display, fontSize: type.heading - 2, color: ink.ink },
  you: { fontFamily: fonts.body, fontSize: type.small, color: ink.inkSoft },
  sub: { fontFamily: fonts.body, fontSize: type.small, color: ink.inkSoft, marginTop: 1 },
  points: { fontFamily: fonts.display, fontSize: type.heading, color: accent.primary },
  pts: { fontFamily: fonts.bodyBold, fontSize: 12, color: ink.inkSoft },
  invite: { marginTop: space.md },
});
