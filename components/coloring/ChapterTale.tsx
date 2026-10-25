// Owner: AD. A finished chapter, read-only: every mission, who colored it, and the line of story it became.
import { Pressable, StyleSheet, View } from 'react-native';
import { ink, panel, shadow, space, ui, type Mood } from '@/shared/theme';
import { regionDef } from '@/shared/templates';
import type { FellowshipMember, Mission, Page } from '@/shared/types';
import { CrestRow } from './Crests';
import { MissionTypeIcon } from './MissionTypeIcon';
import { Txt } from './ui';

export function ChapterTale({ page, missions, members, mood, onOpen }: {
  page: Page; missions: Mission[]; members: FellowshipMember[]; mood: Mood; onOpen: (missionId: string) => void;
}) {
  const done = [...missions]
    .filter((m) => m.status === 'complete')
    .sort((a, b) => (a.completed_at ?? '').localeCompare(b.completed_at ?? ''));
  if (!done.length) return null;
  return (
    <View style={styles.card}>
      <Txt v="smallBold" color={mood.deep}>The tale of this chapter</Txt>
      {done.map((m, i) => (
        <Pressable
          key={m.id}
          onPress={() => onOpen(m.id)}
          style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={`${m.title}. ${m.story_line ?? ''}`}
        >
          <MissionTypeIcon type={m.type} size={22} color={mood.deep} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="bodyBold" numberOfLines={1}>{regionDef(page.template_id, m.region_id)?.label ?? m.title}</Txt>
            <Txt v="story" color={ink.inkSoft} numberOfLines={3}>{m.story_line ?? m.title}</Txt>
          </View>
          <CrestRow userIds={m.completed_by} members={members} size={24} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.lg, marginTop: space.lg, padding: space.lg, gap: space.sm, backgroundColor: panel.parchment,
    borderWidth: ui.borderWidth, borderColor: ink.ink, borderRadius: ui.cardRadius, overflow: 'hidden', ...shadow.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  divider: { borderTopWidth: 1, borderTopColor: panel.parchmentEdge },
});
