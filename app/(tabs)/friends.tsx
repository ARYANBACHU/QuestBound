// Owner: MP. Friends tab. The chat is the hero: header (name + crests + Invite) → one "Up next" strip → chat.
// The fellowship roster (points, profiles) opens from the crests.
import { useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_GRADIENTS, fonts, ink, moodFor, space, type } from '@/shared/theme';
import { useSession } from '@/lib/session';
import { useFellowship } from '@/lib/fellowship';
import { useChat } from '@/lib/chat';
import { useMissions, useStoryline } from '@/lib/game';
import ChatView from '@/components/friends/ChatView';
import FellowshipHeader from '@/components/friends/FellowshipHeader';
import GameButton from '@/components/friends/GameButton';
import InviteSheet from '@/components/friends/InviteSheet';
import MemberSheet from '@/components/friends/MemberSheet';
import MembersView from '@/components/friends/MembersView';
import UpNext from '@/components/friends/UpNext';
import { Sage } from '@/components/friends/sage';
import { haptic } from '@/components/friends/haptics';

type View_ = 'chat' | 'fellowship';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useSession();
  const { fellowship, members, loading } = useFellowship();
  const chat = useChat(fellowship?.id ?? null);
  const [view, setView] = useState<View_>('chat');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const { storyline, pages, activePage, loading: storyLoading } = useStoryline(fellowship?.id ?? null);
  const { missions } = useMissions(storyline?.id ?? null);
  const missionsById = useMemo(() => Object.fromEntries(missions.map((m) => [m.id, m])), [missions]);
  const mood = moodFor(activePage?.template_id ?? pages[0]?.template_id);
  const gradient = SCREEN_GRADIENTS[mood.id];

  if (loading && !fellowship) {
    return (
      <LinearGradient colors={gradient} style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Sage expression="thinking" size="md" />
        <ActivityIndicator color={ink.ink} />
        <Text style={styles.muted}>Gathering your fellowship…</Text>
      </LinearGradient>
    );
  }

  if (!fellowship) {
    return (
      <LinearGradient colors={gradient} style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Sage expression="sleepy" size="lg" />
        <Text style={styles.emptyTitle}>You walk alone, for now</Text>
        <Text style={styles.emptyBody}>Every tale needs companions. Found a fellowship, or join your friends with their code.</Text>
        <GameButton
          label="Find my fellowship"
          onPress={() => router.push({ pathname: '/onboarding', params: { step: 'fellowship' } })}
          style={styles.cta}
        />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradient} style={[styles.screen, { paddingTop: insets.top + space.sm }]}>
      {/* Tapping anywhere above the chat puts the keyboard away (buttons inside still work). */}
      <Pressable onPress={Keyboard.dismiss} accessible={false}>
        <FellowshipHeader
          fellowship={fellowship}
          members={members}
          online={chat.online}
          onInvite={() => {
            Keyboard.dismiss();
            setInviteOpen(true);
          }}
          onPressMembers={() => {
            Keyboard.dismiss();
            setView('fellowship');
          }}
        />
        {view === 'chat' ? (
          <UpNext
            storyline={storyline}
            pages={pages}
            activePage={activePage}
            missions={missions}
            members={members}
            myId={userId}
            loading={storyLoading}
          />
        ) : null}
      </Pressable>
      {view === 'chat' ? (
        <>
          <View style={styles.body}>
            <ChatView
              chat={chat}
              members={members}
              myId={userId}
              missionsById={missionsById}
              surface={mood.tint}
              onShowFellowship={() => setView('fellowship')}
              onOpenMember={setOpenMemberId}
            />
          </View>
        </>
      ) : (
        <View style={styles.body}>
          <Pressable
            onPress={() => {
              haptic.select();
              setView('chat');
            }}
            hitSlop={10}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back to the chat"
          >
            <Text style={styles.backText}>‹ Back to the chat</Text>
          </Pressable>
          <MembersView
            members={members}
            missions={missions}
            online={chat.online}
            myId={userId}
            onInvite={() => setInviteOpen(true)}
            onOpenMember={setOpenMemberId}
          />
        </View>
      )}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ink.paper }, // fallback under the mood gradient
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl, gap: space.sm },
  body: { flex: 1 },
  muted: { fontFamily: fonts.body, fontSize: type.small, color: ink.inkSoft },
  emptyTitle: { fontFamily: fonts.display, fontSize: type.title, color: ink.ink, textAlign: 'center', marginTop: space.md },
  emptyBody: { fontFamily: fonts.displayItalic, fontSize: type.body, color: ink.inkSoft, textAlign: 'center', lineHeight: 22 },
  cta: { marginTop: space.lg, alignSelf: 'stretch' },
  back: { paddingHorizontal: space.lg, paddingVertical: space.xs, alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.bodyBold, fontSize: type.body - 1, color: ink.inkSoft },
  pressed: { opacity: 0.7 },
});
