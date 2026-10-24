// Owner: AB. Mission status: open (ink outline) · pending (hourglass) · complete (completer's crayon + crest) · locked.
import { StyleSheet, View } from 'react-native';
import type { FellowshipMember, Mission } from '@/shared/types';
import { CRAYONS, ink, radius, space } from '@/shared/theme';
import { T } from './T';
import { Crest } from './teammates';

export function StatusPill({ mission, members }: { mission: Mission; members: FellowshipMember[] }) {
  if (mission.status === 'complete') {
    const p = members.find((m) => m.user_id === mission.completed_by[0])?.profile;
    return (
      <View style={[styles.pill, { backgroundColor: p ? CRAYONS[p.color] : ink.gold, borderColor: ink.ink }]}>
        {p ? <Crest crest={p.crest} color={p.color} size={20} ring={false} /> : null}
        <T variant="smallBold" color={ink.page}>Colored</T>
      </View>
    );
  }
  if (mission.status === 'pending') {
    return (
      <View style={[styles.pill, { backgroundColor: ink.lavenderMist }]}>
        <T variant="smallBold">⏳ Waiting</T>
      </View>
    );
  }
  if (mission.status === 'locked') {
    return (
      <View style={[styles.pill, { borderColor: ink.muted }]}>
        <T variant="smallBold" color={ink.muted}>🔒 Locked</T>
      </View>
    );
  }
  return (
    <View style={styles.pill}>
      <T variant="smallBold">Open</T>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs, borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill,
    paddingVertical: 2, paddingLeft: space.xs, paddingRight: space.sm, minHeight: 28, backgroundColor: ink.page,
  },
});
