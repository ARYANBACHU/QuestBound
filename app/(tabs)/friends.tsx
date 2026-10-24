// Owner: MP. Friends tab: fellowship header + Chat | Fellowship.
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, ink, radius, space, type } from '@/shared/theme';
import { useSession } from '@/lib/session';
import { useFellowship } from '@/lib/fellowship';
import { useChat } from '@/lib/chat';
import { useMissions, useStoryline } from '@/lib/game';
import ChatView from '@/components/friends/ChatView';
import FellowshipHeader from '@/components/friends/FellowshipHeader';
import InviteSheet from '@/components/friends/InviteSheet';
import MemberSheet from '@/components/friends/MemberSheet';
import MembersView from '@/components/friends/MembersView';
import SegmentControl from '@/components/friends/SegmentControl';

type Segment = 'chat' | 'fellowship';
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'chat', label: 'Chat' },
  { value: 'fellowship', label: 'Fellowship' },
];

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useSession();
  const { fellowship, members, loading } = useFellowship();
  const chat = useChat(fellowship?.id ?? null);
  const [segment, setSegment] = useState<Segment>('chat');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const { storyline, pages } = useStoryline(fellowship?.id ?? null);
  const { missions } = useMissions(storyline?.id ?? null);

  if (loading && !fellowship) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={ink.ink} />
        <Text style={styles.muted}>Gathering your fellowship…</Text>
      </View>
    );
  }

  if (!fellowship) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.bigEmoji}>🧙</Text>
        <Text style={styles.emptyTitle}>You walk alone, for now</Text>
        <Text style={styles.emptyBody}>Every tale needs companions. Found a fellowship, or join your friends with their code.</Text>
        <Pressable
          onPress={() => router.push({ pathname: '/onboarding', params: { step: 'fellowship' } })}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Find my fellowship</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.sm }]}>
      <FellowshipHeader
        fellowship={fellowship}
        members={members}
        online={chat.online}
        onInvite={() => setInviteOpen(true)}
        onPressMembers={() => setSegment('fellowship')}
      />
      <SegmentControl options={SEGMENTS} value={segment} onChange={setSegment} />
      <View style={styles.body}>
        {segment === 'chat' ? (
          <ChatView
            chat={chat}
            members={members}
            myId={userId}
            onShowFellowship={() => setSegment('fellowship')}
            onOpenMember={setOpenMemberId}
          />
        ) : (
          <MembersView
            members={members}
            missions={missions}
            online={chat.online}
            myId={userId}
            onInvite={() => setInviteOpen(true)}
            onOpenMember={setOpenMemberId}
          />
        )}
      </View>
      <InviteSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} fellowship={fellowship} />
      {openMemberId ? (
        <MemberSheet
          member={members.find((m) => m.user_id === openMemberId) ?? null}
          members={members}
          myId={userId}
          online={chat.online}
          chat={chat}
          missions={missions}
          pages={pages}
          onClose={() => setOpenMemberId(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ink.paper },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl, gap: space.sm },
  body: { flex: 1, marginTop: space.sm, backgroundColor: ink.paper },
  muted: { fontFamily: fonts.body, fontSize: type.small, color: ink.muted },
  bigEmoji: { fontSize: 56 },
  emptyTitle: { fontFamily: fonts.display, fontSize: type.title, color: ink.ink, textAlign: 'center' },
  emptyBody: { fontFamily: fonts.displayItalic, fontSize: type.body, color: ink.inkSoft, textAlign: 'center', lineHeight: 22 },
  cta: { marginTop: space.lg, borderRadius: radius.pill, borderWidth: 3, borderColor: ink.ink, backgroundColor: ink.ink, paddingVertical: space.md, paddingHorizontal: space.xl },
  ctaText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.page },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
