// Owner: AD. U3: the montage's own mark — a little reel of story frames unspooling from a book, with a play
// notch and a spark. Smaller, storybook-italic label so it reads as "a special thing", not another big button.
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { fonts, ink, panel, radius, space, ui } from '@/shared/theme';
import { Txt } from '@/components/coloring/ui';

export function MontageIcon({ size = 22, color = ink.ink, accent = ink.gold }: { size?: number; color?: string; accent?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* the book's spine + open cover */}
      <Path d="M3 18.5 V6.5 Q3 5 4.5 5 H8 Q9.5 5 9.5 6.5 V18.5 Q8.6 17.6 7.2 17.6 H3 Z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      {/* frames unspooling to the right */}
      <Path d="M9.5 8 Q13 6.6 21 7.6 V17 Q13 16 9.5 17.4" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Rect x={11.6} y={8.4} width={2.6} height={1.5} rx={0.5} fill={color} />
      <Rect x={16.4} y={8.6} width={2.6} height={1.5} rx={0.5} fill={color} />
      <Rect x={11.6} y={14.6} width={2.6} height={1.5} rx={0.5} fill={color} />
      <Rect x={16.4} y={14.8} width={2.6} height={1.5} rx={0.5} fill={color} />
      {/* play notch */}
      <Path d="M14.2 10.6 L17.6 12.3 L14.2 14 Z" fill={accent} stroke={color} strokeWidth={1.1} strokeLinejoin="round" />
      {/* spark */}
      <Path d="M20.5 2.2 Q20.9 3.6 22.3 4 Q20.9 4.4 20.5 5.8 Q20.1 4.4 18.7 4 Q20.1 3.6 20.5 2.2 Z" fill={accent} />
      <Circle cx={6.2} cy={11.5} r={1.2} fill={accent} />
    </Svg>
  );
}

export function MontageButton({ onPress, label = 'Montage', big = false }: { onPress: () => void; label?: string; big?: boolean }) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Play the ${label.toLowerCase()}`}
      style={({ pressed }) => [styles.pill, big && styles.big, pressed && { transform: [{ scale: ui.pressScale }] }]}
    >
      <MontageIcon size={big ? 26 : 18} />
      <View>
        {big ? <Txt v="small" color={ink.inkSoft} style={styles.eyebrow}>PLAY THE</Txt> : null}
        <Txt v="small" color={ink.ink} style={big ? styles.labelBig : styles.label}>{label}</Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, paddingVertical: 5,
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: ink.ink, backgroundColor: panel.parchment, overflow: 'hidden',
  },
  big: { alignSelf: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, borderWidth: 2 },
  label: { fontFamily: fonts.displayItalic, fontSize: 14, lineHeight: 18 },
  labelBig: { fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 22 },
  eyebrow: { fontSize: 9, lineHeight: 11, letterSpacing: 1.6, fontFamily: fonts.bodyBold },
});
