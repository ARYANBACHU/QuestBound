// Owner: MP. Friends tab header — one line of identity: fellowship name, the crests (tap → the fellowship), Invite.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, ink, space, type } from '@/shared/theme';
import type { Fellowship, FellowshipMember } from '@/shared/types';
import CrestRow from './CrestRow';
import GameButton from './GameButton';
import { HeaderMusicToggle } from '@/components/shell/music';

export interface FellowshipHeaderProps {
  fellowship: Fellowship;
  members: FellowshipMember[];
  online: Set<string>;
  onInvite: () => void;
  onPressMembers?: () => void;
}

export default function FellowshipHeader({ fellowship, members, online, onInvite, onPressMembers }: FellowshipHeaderProps) {
  const here = members.filter((m) => online.has(m.user_id)).length;
  return (
    <View style={styles.wrap}>
      <View style={styles.titleCol}>
        <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {fellowship.name}
        </Text>
        <Pressable
          onPress={onPressMembers}
          disabled={!onPressMembers}
          hitSlop={8}
          style={({ pressed }) => [styles.crests, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${members.length} heroes, ${here} here now. See the fellowship`}
        >
          <CrestRow userIds={members.map((m) => m.user_id)} members={members} size={26} max={5} online={online} />
          <Text style={styles.count}>
            {here ? `${here} here now` : `${members.length} ${members.length === 1 ? 'hero' : 'heroes'}`} ›
          </Text>
        </Pressable>
      </View>
      <HeaderMusicToggle />
      <GameButton label="Invite" size="sm" onPress={onInvite} accessibilityLabel="Invite friends" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  titleCol: { flex: 1 },
  name: { fontFamily: fonts.display, fontSize: type.title, color: ink.ink, lineHeight: 32 },
  crests: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs, alignSelf: 'flex-start' },
  count: { fontFamily: fonts.bodyBold, fontSize: type.small, color: ink.inkSoft },
  pressed: { opacity: 0.7 },
});
