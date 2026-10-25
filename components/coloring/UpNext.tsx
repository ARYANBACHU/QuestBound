// Owner: AD. "Up next" — the next uncolored mission on the page, so the space under the page is useful.
import { Pressable, StyleSheet, View } from 'react-native';
import { ink, panel, shadow, space, ui, type Mood } from '@/shared/theme';
import type { Mission } from '@/shared/types';
import { MISSION_TYPE_LABEL, MissionTypeIcon } from './MissionTypeIcon';
import { Txt } from './ui';

const ORDER: Record<Mission['status'], number> = { pending: 0, open: 1, locked: 2, complete: 3 };

export function nextMission(missions: Mission[]): Mission | null {
  return [...missions].filter((m) => m.status === 'open' || m.status === 'pending').sort((a, b) => ORDER[a.status] - ORDER[b.status])[0] ?? null;
}

export function UpNext({ mission, mood, onPress }: { mission: Mission; mood: Mood; onPress: () => void }) {
  const waiting = mission.status === 'pending';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: ui.pressScale }] }]}
      accessibilityRole="button"
      accessibilityLabel={`Up next: ${mission.title}`}
    >
      <View style={[styles.icon, { backgroundColor: mood.tintStrong }]}>
        <MissionTypeIcon type={mission.type} size={26} color={mood.deep} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt v="smallBold" color={mood.deep}>{waiting ? 'Waiting on a friend' : `Up next · ${MISSION_TYPE_LABEL[mission.type]}`}</Txt>
        <Txt v="bodyBold" numberOfLines={1}>{mission.title}</Txt>
        {mission.place ? <Txt v="small" color={ink.inkSoft} numberOfLines={1}>📍 {mission.place.title}</Txt> : null}
      </View>
      <Txt v="heading" color={mood.deep}>›</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginTop: space.lg, padding: space.md,
    backgroundColor: panel.parchment, borderWidth: ui.borderWidth, borderColor: ink.ink, borderRadius: ui.cardRadius, overflow: 'hidden',
    ...shadow.sm,
  },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
