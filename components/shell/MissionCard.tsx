// Owner: AB. One mission on the board: type + points, title, place (tap → Maps), who it needs, status. Tap → detail.
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { openInMaps } from '@/lib/maps';
import type { FellowshipMember, Mission, Page } from '@/shared/types';
import { chips, ink, panel, radius, shadow, space, ui, type Mood } from '@/shared/theme';
import { completerColor, needsLabel } from './missionUtils';
import { StatusPill } from './StatusPill';
import { T } from './T';
import { CrestRow, MissionTypeIcon, MISSION_TYPE_LABEL } from './teammates';
import { playSfx } from './sfx';

export function MissionCard({ mission, members, mood, locked }: {
  mission: Mission;
  members: FellowshipMember[];
  page?: Page | null;
  mood?: Mood;
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
        Haptics.selectionAsync().catch(() => {}); playSfx('open');
        router.push({ pathname: '/mission/[id]', params: { id: mission.id } });
      }}
      style={({ pressed }) => [styles.card, locked && styles.locked, pressed && styles.pressed]}
    >
      {done ? <View style={[styles.stripe, { backgroundColor: done }]} /> : null}
      <View style={[styles.iconBox, mood && { backgroundColor: mood.tintStrong }]}>
        <MissionTypeIcon type={mission.type} size={26} color={locked ? ink.muted : ink.ink} />
      </View>
      <View style={styles.main}>
        <T variant="smallBold" color={mood?.deep ?? ink.inkSoft} numberOfLines={1}>
          {MISSION_TYPE_LABEL[mission.type]} · {mission.points} pts{needs ? ` · ${needs}` : ''}
        </T>
        <T variant="bodyBold" numberOfLines={2} color={locked ? ink.muted : ink.ink}>{locked ? 'A sealed mission' : mission.title}</T>
        {!locked && mission.place ? (
          <Pressable
            onPress={() => { Haptics.selectionAsync().catch(() => {}); playSfx('open'); openInMaps(mission.place); }}
            hitSlop={6}
            accessibilityRole="link"
            accessibilityLabel={`${mission.place.title}. Open in Maps`}
            style={styles.place}
          >
            <T variant="small" color={chips.secondary.fg} numberOfLines={1}>📍 {mission.place.title}</T>
          </Pressable>
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
    flexDirection: 'row', gap: space.md, backgroundColor: panel.parchment, borderRadius: ui.cardRadius - 6,
    borderWidth: 2, borderColor: panel.border, padding: space.md, overflow: 'hidden', ...shadow.sm,
  },
  locked: { borderColor: ink.muted, borderStyle: 'dashed', opacity: 0.55 },
  pressed: { transform: [{ scale: ui.pressScale }] },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7 },
  iconBox: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ink.lavenderMist,
  },
  main: { flex: 1, gap: 2 },
  place: {
    alignSelf: 'flex-start', maxWidth: '100%', marginTop: space.xs, paddingHorizontal: space.sm, paddingVertical: 1,
    borderRadius: radius.pill, backgroundColor: chips.secondary.bg,
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
});
