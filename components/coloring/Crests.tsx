// Owner: AD. Local crest bubble + row. Swap to MP's components/friends/Crest.tsx once it lands.
import { StyleSheet, Text, View } from 'react-native';
import { CRESTS, ink, type CrestId } from '@/shared/theme';
import type { FellowshipMember } from '@/shared/types';
import { profileOf } from '@/lib/fellowship';
import { crayonHex } from './pageUtils';

export function CrestBubble({ userId, members, size = 28 }: { userId: string; members: FellowshipMember[]; size?: number }) {
  const p = profileOf(members, userId);
  const emoji = p ? CRESTS[p.crest as CrestId]?.emoji ?? '✨' : '✨';
  return (
    <View
      accessibilityLabel={p?.display_name ?? 'A hero'}
      style={[styles.bubble, { width: size, height: size, borderRadius: size / 2, borderColor: crayonHex(p?.color) }]}
    >
      <Text style={{ fontSize: size * 0.55 }}>{emoji}</Text>
    </View>
  );
}

export function CrestRow({ userIds, members, size = 28 }: { userIds: string[]; members: FellowshipMember[]; size?: number }) {
  return (
    <View style={styles.row}>
      {userIds.map((id, i) => (
        <View key={id} style={{ marginLeft: i ? -size * 0.25 : 0 }}>
          <CrestBubble userId={id} members={members} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { backgroundColor: ink.page, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
