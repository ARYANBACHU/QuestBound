// Owner: MP. A player's crest: emoji inside a paper circle with a thick crayon ring. Exported for AB + AD.
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { CRAYONS, CRESTS, ink, panel, type CrayonColor, type CrestId } from '@/shared/theme';
import { crayonHex } from './color';

export interface CrestProps {
  crest: CrestId | string | null | undefined;
  color: CrayonColor | string | null | undefined;
  size?: number;
  /** Thick crayon ring (default true). */
  ring?: boolean;
  /** Small green dot, bottom-right. */
  online?: boolean;
  /** Fill the circle with the crayon color instead of paper. */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function crestEmoji(crest: CrestId | string | null | undefined): string {
  return (crest && CRESTS[crest as CrestId]?.emoji) || '🛡️';
}

export default function Crest({ crest, color, size = 40, ring = true, online, filled, style }: CrestProps) {
  const ringW = ring ? Math.max(2, Math.round(size * 0.08)) : 0;
  const dot = Math.max(8, Math.round(size * 0.28));
  const hex = crayonHex(color);
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringW,
            borderColor: ring ? hex : ink.ink,
            backgroundColor: filled ? hex : panel.parchment,
          },
        ]}
      >
        <Text style={{ fontSize: Math.round(size * 0.52), lineHeight: Math.round(size * 0.68) }} allowFontScaling={false}>
          {crestEmoji(crest)}
        </Text>
      </View>
      {online ? (
        <View
          accessibilityLabel="online"
          style={[
            styles.dot,
            { width: dot, height: dot, borderRadius: dot / 2, borderWidth: Math.max(2, dot * 0.2), right: -1, bottom: -1 },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dot: { position: 'absolute', backgroundColor: CRAYONS.fern, borderColor: ink.paper },
});
