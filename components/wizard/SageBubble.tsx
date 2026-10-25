// Owner: AB. Sage + speech bubble with a typewriter reveal (~25 ms/char, tap to skip).
// Each NEW line makes Sage talk and ping once (speakKey = the text unless you pass one).
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ink, realm, space, ui, type SageExpression, type SageSize } from '@/shared/theme';
import { T } from '@/components/shell/T';
import { Sage } from './Sage';
import { useTypewriter } from './useTypewriter';

export interface SageBubbleProps {
  text: string;
  expression?: SageExpression;
  sageSize?: SageSize | number;
  /** row = Sage left of the bubble; stack = Sage above it (centered). */
  layout?: 'row' | 'stack';
  typewriter?: boolean;
  /** Override the "new line" key (defaults to the text). Pass null to never talk/ping. */
  speakKey?: string | null;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void; // called on tap once the text is fully shown
}

export function SageBubble({
  text, expression = 'idle', sageSize = 'md', layout = 'row', typewriter = true, speakKey, style, onPress,
}: SageBubbleProps) {
  const { shown, done, skip } = useTypewriter(text, 25, typewriter);
  const stack = layout === 'stack';
  return (
    <Pressable
      accessibilityRole="text"
      accessibilityLabel={`Sage says: ${text}`}
      onPress={() => (done ? onPress?.() : skip())}
      style={[stack ? styles.stack : styles.row, style]}
    >
      <Sage expression={expression} size={sageSize} speakKey={speakKey === undefined ? text : speakKey} />
      <View style={[styles.bubbleWrap, stack ? styles.bubbleStack : styles.bubbleRow]}>
        <View style={[styles.tail, stack ? styles.tailUp : styles.tailLeft]} />
        <View style={styles.bubble}>
          {/* Invisible full text reserves the final height so the layout doesn't jump while typing. */}
          <T variant="body" style={styles.ghost}>{text}</T>
          <T variant="body" style={styles.live}>{shown}</T>
        </View>
      </View>
    </Pressable>
  );
}

const TAIL = 16;
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stack: { alignItems: 'center', gap: space.sm },
  bubbleWrap: { flexShrink: 1 },
  bubbleRow: { flex: 1, paddingLeft: TAIL / 2 },
  bubbleStack: { alignSelf: 'stretch', paddingTop: TAIL / 2 },
  bubble: {
    backgroundColor: realm.royalMist, borderRadius: ui.cardRadius, borderWidth: 2, borderColor: ink.ink, overflow: 'hidden',
    paddingVertical: space.md, paddingHorizontal: space.lg,
  },
  tail: {
    position: 'absolute', width: TAIL, height: TAIL, backgroundColor: realm.royalMist, borderColor: ink.ink, zIndex: 1,
    transform: [{ rotate: '45deg' }],
  },
  tailLeft: { left: 1, top: '50%', marginTop: -TAIL / 2, borderLeftWidth: 2, borderBottomWidth: 2 },
  tailUp: { top: 1, left: '50%', marginLeft: -TAIL / 2, borderLeftWidth: 2, borderTopWidth: 2 },
  ghost: { opacity: 0 },
  live: { position: 'absolute', top: space.md, left: space.lg, right: space.lg },
});
