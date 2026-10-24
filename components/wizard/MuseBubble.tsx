// Owner: AB. 🧙 + lavender speech bubble with a typewriter reveal (~25 ms/char). Tap to skip.
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ink, radius, space } from '@/shared/theme';
import { T } from '@/components/shell/T';
import { MuseAvatar } from './MuseAvatar';
import { useTypewriter } from './useTypewriter';

export interface MuseBubbleProps {
  text: string;
  typewriter?: boolean;
  avatarSize?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void; // called on tap once the text is fully shown
}

export function MuseBubble({ text, typewriter = true, avatarSize = 40, style, onPress }: MuseBubbleProps) {
  const { shown, done, skip } = useTypewriter(text, 25, typewriter);
  return (
    <Pressable
      accessibilityRole="text"
      accessibilityLabel={`Muse says: ${text}`}
      onPress={() => (done ? onPress?.() : skip())}
      style={[styles.row, style]}
    >
      <MuseAvatar size={avatarSize} />
      <View style={styles.bubble}>
        <View style={styles.tail} />
        {/* Invisible full text reserves the final height so the layout doesn't jump while typing. */}
        <T variant="body" style={styles.ghost}>{text}</T>
        <T variant="body" style={styles.live}>{shown}</T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  bubble: {
    flex: 1, backgroundColor: ink.lavenderMist, borderRadius: radius.lg, borderWidth: 2, borderColor: ink.ink,
    paddingVertical: space.md, paddingHorizontal: space.lg,
  },
  tail: {
    position: 'absolute', left: -9, top: 16, width: 16, height: 16, backgroundColor: ink.lavenderMist,
    borderLeftWidth: 2, borderBottomWidth: 2, borderColor: ink.ink, transform: [{ rotate: '45deg' }],
  },
  ghost: { opacity: 0 },
  live: { position: 'absolute', top: space.md, left: space.lg, right: space.lg },
});
