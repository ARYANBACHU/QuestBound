// Owner: AB. Pick who did the mission (member crests, multi or single select). "Me" is always included in multi mode.
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import type { FellowshipMember } from '@/shared/types';
import { CRAYONS, ink, radius, space } from '@/shared/theme';
import { T } from './T';
import { Crest } from './teammates';

export function ParticipantPicker({ members, meId, value, onChange, mode = 'multi', exclude = [] }: {
  members: FellowshipMember[];
  meId: string | null;
  value: string[];
  onChange: (ids: string[]) => void;
  mode?: 'multi' | 'single';
  exclude?: string[];
}) {
  return (
    <View style={styles.grid}>
      {members.filter((m) => m.profile && !exclude.includes(m.user_id)).map((m) => {
        const on = value.includes(m.user_id);
        const isMe = m.user_id === meId;
        const p = m.profile!;
        return (
          <Pressable
            key={m.user_id}
            accessibilityRole={mode === 'single' ? 'radio' : 'checkbox'}
            accessibilityState={{ checked: on, disabled: mode === 'multi' && isMe }}
            disabled={mode === 'multi' && isMe}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              if (mode === 'single') onChange([m.user_id]);
              else onChange(on ? value.filter((v) => v !== m.user_id) : [...value, m.user_id]);
            }}
            style={[styles.cell, on && { borderColor: CRAYONS[p.color], backgroundColor: ink.lavenderMist }]}
          >
            <Crest crest={p.crest} color={p.color} size={44} ring={on} />
            <T variant={on ? 'smallBold' : 'small'} numberOfLines={1}>{isMe ? 'You' : p.display_name}</T>
            {on ? <View style={styles.check}><T variant="smallBold" color={ink.page}>✓</T></View> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: {
    width: 84, alignItems: 'center', gap: space.xs, paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 2.5,
    borderColor: ink.lavenderMist, backgroundColor: ink.page,
  },
  check: {
    position: 'absolute', top: 4, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: ink.ink,
    alignItems: 'center', justifyContent: 'center',
  },
});
