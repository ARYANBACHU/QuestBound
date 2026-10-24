// Owner: AB. One mission on the dashboard. Tap → /mission/<id>.
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import type { FellowshipMember, Mission, Page } from '@/shared/types';
import { ink, radius, space } from '@/shared/theme';
import { completerColor, needsLabel, regionLabel } from './missionUtils';
import { StatusPill } from './StatusPill';
import { T } from './T';
import { CrestRow, MissionTypeIcon, MISSION_TYPE_LABEL } from './teammates';

export function MissionCard({ mission, members, page, locked }: {
  mission: Mission;
  members: FellowshipMember[];
  page?: Page | null;
  locked?: boolean;
}) {
  const router = useRouter();
  const done = completerColor(mission, members);
  const needs = needsLabel(mission);
  const crests = mission.status === 'complete' ? mission.completed_by : mission.assignee_ids;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${mission.title}, ${MISSION_TYPE_LABEL[mission.type]}, ${mission.status}`}
      disabled={locked}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        router.push({ pathname: '/mission/[id]', params: { id: mission.id } });
      }}
      style={({ pressed }) => [styles.card, locked && styles.locked, pressed && styles.pressed]}
    >
      {done ? <View style={[styles.stripe, { backgroundColor: done }]} /> : null}
      <View style={styles.iconBox}>
        <MissionTypeIcon type={mission.type} size={28} color={locked ? ink.muted : ink.ink} />
      </View>
      <View style={styles.main}>
        <T variant="small" color={ink.muted} numberOfLines={1}>
          {MISSION_TYPE_LABEL[mission.type]} · {regionLabel(page, mission)} · {mission.points} pts
        </T>
        <T variant="bodyBold" numberOfLines={2} color={locked ? ink.muted : ink.ink}>{locked ? 'A sealed mission' : mission.title}</T>
        {!locked && mission.story_hook ? (
          <T variant="story" numberOfLines={1} style={styles.hook}>{mission.story_hook}</T>
        ) : null}
        {!locked ? (
          <View style={styles.meta}>
            {mission.place ? (
              <View style={styles.chip}><T variant="small" numberOfLines={1}>📍 {mission.place.title}</T></View>
            ) : null}
            {needs ? <View style={[styles.chip, styles.needs]}><T variant="smallBold">{needs}</T></View> : null}
          </View>
        ) : null}
        <View style={styles.footer}>
          {crests.length ? <CrestRow userIds={crests} members={members} size={22} max={4} /> : <View />}
          {!locked ? <StatusPill mission={mission} members={members} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', gap: space.md, backgroundColor: ink.page, borderRadius: radius.md, borderWidth: 2, borderColor: ink.ink,
    padding: space.md, overflow: 'hidden',
  },
  locked: { borderColor: ink.muted, borderStyle: 'dashed', opacity: 0.55 },
  pressed: { transform: [{ scale: 0.985 }] },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  iconBox: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ink.lavenderMist,
  },
  main: { flex: 1, gap: 2 },
  hook: { fontSize: 14, lineHeight: 19 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  chip: { borderWidth: 1.5, borderColor: ink.inkSoft, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 1, maxWidth: '100%' },
  needs: { borderColor: ink.ink, backgroundColor: ink.lavenderMist },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
});
