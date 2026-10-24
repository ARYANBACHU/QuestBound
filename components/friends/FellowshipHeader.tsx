// Owner: MP. Friends tab header: fellowship name, area, crests with online dots, Invite button.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, ink, radius, space, type } from '@/shared/theme';
import type { Fellowship, FellowshipMember } from '@/shared/types';
import CrestRow from './CrestRow';

export interface FellowshipHeaderProps {
  fellowship: Fellowship;
  members: FellowshipMember[];
  online: Set<string>;
  onInvite: () => void;
  onPressMembers?: () => void;
}

export default function FellowshipHeader({ fellowship, members, online, onInvite, onPressMembers }: FellowshipHeaderProps) {
  const onlineCount = members.filter((m) => online.has(m.user_id)).length;
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View style={styles.titleCol}>
          <Text style={styles.name} numberOfLines={2}>
            {fellowship.name}
          </Text>
          {fellowship.area_label ? <Text style={styles.area}>📍 {fellowship.area_label}</Text> : null}
        </View>
        <Pressable onPress={onInvite} style={({ pressed }) => [styles.invite, pressed && styles.pressed]} accessibilityLabel="Invite friends">
          <Text style={styles.inviteText}>Invite</Text>
        </Pressable>
      </View>
      <Pressable onPress={onPressMembers} style={styles.crests} disabled={!onPressMembers}>
        <CrestRow userIds={members.map((m) => m.user_id)} members={members} size={30} max={6} online={online} />
        <Text style={styles.count}>
          {members.length} {members.length === 1 ? 'hero' : 'heroes'}
          {onlineCount ? ` · ${onlineCount} here now` : ''}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingBottom: space.md },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  titleCol: { flex: 1 },
  name: { fontFamily: fonts.display, fontSize: type.title, color: ink.ink, lineHeight: 32 },
  area: { fontFamily: fonts.body, fontSize: type.small, color: ink.inkSoft, marginTop: 2 },
  invite: { borderWidth: 3, borderColor: ink.ink, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: ink.page, marginTop: 2 },
  inviteText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.ink },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  crests: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  count: { fontFamily: fonts.body, fontSize: type.small, color: ink.inkSoft },
});
