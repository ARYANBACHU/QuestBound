// Owner: AD. Bottom sheet shown when a region is tapped. One primary action; everything else is quiet.
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { regionDef } from '@/shared/templates';
import { ink, moodFor, radius, scrim, space, ui } from '@/shared/theme';
import type { FellowshipMember, Mission, Page } from '@/shared/types';
import { MISSION_TYPE_LABEL, MissionTypeIcon } from './MissionTypeIcon';
import { CrestRow } from './Crests';
import { crayonHex, missionColors } from './pageUtils';
import { InkButton, Txt } from './ui';

export function MissionSheet({ mission, page, members, onClose }: { mission: Mission | null; page: Page | null; members: FellowshipMember[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const region = mission && page ? regionDef(page.template_id, mission.region_id) : undefined;
  const mood = moodFor(page?.template_id);
  const done = mission?.status === 'complete';
  const color = mission && done ? crayonHex(missionColors(mission, members)[0]) : ink.ink;
  const readOnly = page?.status === 'complete' || mission?.status === 'locked';

  return (
    <Modal visible={!!mission} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close mission" />
      {mission && (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={[styles.band, { backgroundColor: mood.tint }]}>
            <View style={styles.grip} />
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: mood.tintStrong }]}>
                <MissionTypeIcon type={mission.type} size={24} color={mood.deep} />
              </View>
              <Txt v="smallBold" color={mood.deep} style={{ flex: 1 }} numberOfLines={1}>
                {MISSION_TYPE_LABEL[mission.type]}{region ? ` · ${region.label}` : ''}
              </Txt>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Txt v="title">{mission.title}</Txt>
            {mission.story_hook ? <Txt v="story">{mission.story_hook}</Txt> : null}
            {mission.description ? <Txt v="body">{mission.description}</Txt> : null}

            {mission.place ? <PlaceRow mission={mission} /> : null}

            <View style={styles.row}>
              <Txt v="smallBold" style={{ flex: 1 }}>
                {mission.required_members > 1 ? `Needs ${mission.required_members} heroes` : 'A solo quest'}
                {mission.assignee_ids.length ? '' : ' · anyone can take it'}
              </Txt>
              {mission.assignee_ids.length ? <CrestRow userIds={mission.assignee_ids} members={members} size={26} /> : null}
            </View>

            {done ? (
              <View style={[styles.done, { borderColor: color }]}>
                {mission.story_line ? <Txt v="story" color={ink.ink}>“{mission.story_line}”</Txt> : null}
                <View style={styles.row}>
                  <CrestRow userIds={mission.completed_by} members={members} size={30} />
                  <Txt v="smallBold">colored this region</Txt>
                </View>
              </View>
            ) : readOnly ? (
              <Txt v="small" color={ink.inkSoft}>This mission unlocks when its chapter begins.</Txt>
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

function PlaceRow({ mission }: { mission: Mission }) {
  const place = mission.place!;
  const openMaps = () => {
    const q = encodeURIComponent([place.title, place.address].filter(Boolean).join(' '));
    Linking.openURL(`https://maps.google.com/?q=${q}`).catch(() => {});
  };
  return (
    <Pressable onPress={openMaps} style={styles.place} accessibilityRole="link" accessibilityLabel={`Open ${place.title} in maps`}>
      <Txt v="body">📍</Txt>
      <View style={{ flex: 1 }}>
        <Txt v="bodyBold" numberOfLines={1}>{place.title}</Txt>
        {place.address ? <Txt v="small" numberOfLines={1}>{place.address}</Txt> : null}
        {place.when ? <Txt v="small">{place.when}</Txt> : null}
      </View>
      <Txt v="smallBold">Map ›</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: scrim.base },
  sheet: {
    backgroundColor: ink.page, borderTopLeftRadius: ui.cardRadius, borderTopRightRadius: ui.cardRadius, borderWidth: ui.borderWidth,
    borderBottomWidth: 0, borderColor: ink.ink, maxHeight: '82%', overflow: 'hidden',
  },
  band: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md, gap: space.sm },
  grip: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, backgroundColor: ink.muted },
  body: { gap: space.md, paddingHorizontal: space.xl, paddingTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  place: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: ink.lavenderMist, borderWidth: 1.5, borderColor: ink.ink,
  },
  done: { gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 2.5, borderStyle: 'dashed' },
});
