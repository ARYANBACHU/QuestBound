// Owner: MP. Overlapping crests for a set of members, with a "+N" chip. Exported for AB + AD.
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, ink } from '@/shared/theme';
import type { FellowshipMember } from '@/shared/types';
import { profileOf } from '@/lib/fellowship';
import Crest from './Crest';

export interface CrestRowProps {
  userIds: string[];
  members: FellowshipMember[];
  size?: number;
  max?: number;
  /** Show green dots for these user ids (e.g. `useChat(id).online`). */
  online?: Set<string>;
  style?: StyleProp<ViewStyle>;
}

export default function CrestRow({ userIds, members, size = 24, max = 5, online, style }: CrestRowProps) {
  const shown = userIds.slice(0, max);
  const extra = userIds.length - shown.length;
  const overlap = Math.round(size * 0.3);
  return (
    <View style={[styles.row, style]}>
      {shown.map((id, i) => {
        const p = profileOf(members, id);
        return (
          <View key={id} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: shown.length - i }}>
            <Crest crest={p?.crest} color={p?.color} size={size} online={online?.has(id)} />
          </View>
        );
      })}
      {extra > 0 ? (
        <View
          style={[
            styles.more,
            { width: size, height: size, borderRadius: size / 2, marginLeft: shown.length ? -overlap : 0, borderWidth: Math.max(2, Math.round(size * 0.08)) },
          ]}
        >
          <Text style={[styles.moreText, { fontSize: Math.max(10, Math.round(size * 0.38)) }]} allowFontScaling={false}>
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  more: { alignItems: 'center', justifyContent: 'center', backgroundColor: ink.lavenderMist, borderColor: ink.ink },
  moreText: { fontFamily: fonts.bodyBold, color: ink.ink },
});
