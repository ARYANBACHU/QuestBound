// Owner: AD. Bottom sheet shown when a region is tapped.
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { regionDef } from '@/shared/templates';
import { ink, radius, space } from '@/shared/theme';
import type { FellowshipMember, Mission, Page } from '@/shared/types';
import { MISSION_TYPE_LABEL, MissionTypeIcon } from './MissionTypeIcon';
import { CrestRow } from './Crests';
import { STATUS_LABEL, crayonHex, missionColors } from './pageUtils';
import { InkButton, Txt } from './ui';

export function MissionSheet({ mission, page, members, onClose }: { mission: Mission | null; page: Page | null; members: FellowshipMember[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const region = mission && page ? regionDef(page.template_id, mission.region_id) : undefined;
  const done = mission?.status === 'complete';
  const color = mission && done ? crayonHex(missionColors(mission, members)[0]) : ink.ink;

  const openMaps = () => {
    if (!mission?.place) return;
    const q = encodeURIComponent([mission.place.title, mission.place.address].filter(Boolean).join(' '));
    Linking.openURL(`https://maps.google.com/?q=${q}`).catch(() => {});
  };

  return (
    <Modal visible={!!mission} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close mission" />
      {mission && (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.grip} />
          <ScrollView contentContainerStyle={{ gap: space.md }} showsVerticalScrollIndicator={false}>
            <View style={styles.row}>
              <MissionTypeIcon type={mission.type} size={26} />
              <Txt v="smallBold">{MISSION_TYPE_LABEL[mission.type]}{region ? ` · ${region.label}` : ''}</Txt>
              <View style={[styles.status, done && { backgroundColor: color, borderColor: color }]}>
                <Txt v="smallBold" color={done ? ink.page : ink.inkSoft}>{STATUS_LABEL[mission.status]}</Txt>
              </View>
            </View>
            <Txt v="title">{mission.title}</Txt>
            {mission.story_hook ? <Txt v="story">{mission.story_hook}</Txt> : null}
            {mission.description ? <Txt v="body">{mission.description}</Txt> : null}

            {mission.place && (
              <Pressable onPress={openMaps} style={styles.place} accessibilityRole="link" accessibilityLabel={`Open ${mission.place.title} in maps`}>
                <Txt v="body">📍</Txt>
                <View style={{ flex: 1 }}>
                  <Txt v="bodyBold">{mission.place.title}</Txt>
                  {mission.place.address ? <Txt v="small" numberOfLines={1}>{mission.place.address}</Txt> : null}
                  {mission.place.when ? <Txt v="small">{mission.place.when}</Txt> : null}
                </View>
                <Txt v="smallBold">Map ›</Txt>
              </Pressable>
            )}

            <View style={styles.row}>
              <Txt v="smallBold">
                {mission.required_members > 1 ? `Needs ${mission.required_members} heroes` : 'A solo quest'}
              </Txt>
              <View style={{ flex: 1 }} />
              {mission.assignee_ids.length ? (
                <CrestRow userIds={mission.assignee_ids} members={members} size={26} />
              ) : (
                <Txt v="small">Anyone can take it</Txt>
              )}
            </View>

            {done ? (
              <View style={[styles.done, { borderColor: color }]}>
                {mission.story_line ? <Txt v="story" color={ink.ink}>“{mission.story_line}”</Txt> : null}
                <View style={styles.row}>
                  <CrestRow userIds={mission.completed_by} members={members} size={30} />
                  <Txt v="smallBold">colored this page</Txt>
                </View>
              </View>
            ) : mission.status === 'locked' ? (
              <Txt v="small">This mission unlocks when its chapter begins.</Txt>
            ) : (
              <InkButton
                label={mission.status === 'pending' ? 'See who we’re waiting on' : 'Open mission'}
                onPress={() => {
                  onClose();
                  router.push(`/mission/${mission.id}`);
                }}
              />
            )}
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: ink.ink, opacity: 0.25 },
  sheet: {
    backgroundColor: ink.page, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderWidth: 2.5, borderBottomWidth: 0,
    borderColor: ink.ink, paddingHorizontal: space.xl, paddingTop: space.sm, maxHeight: '80%',
  },
  grip: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, backgroundColor: ink.muted, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  status: { marginLeft: 'auto', borderWidth: 1.5, borderColor: ink.muted, borderRadius: 999, paddingHorizontal: space.sm, paddingVertical: 2 },
  place: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md,
    backgroundColor: ink.lavenderMist, borderWidth: 1.5, borderColor: ink.ink,
  },
  done: { gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 2.5, borderStyle: 'dashed' },
});
