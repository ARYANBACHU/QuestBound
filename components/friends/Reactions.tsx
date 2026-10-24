// Owner: MP. Reaction chips under a chat item + the long-press picker.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { fonts, ink, radius, space } from '@/shared/theme';
import { REACTIONS, type ReactionEmoji, type Reactions } from '@/lib/chat';
import { haptic } from './haptics';

export function ReactionChips({
  messageId,
  reactions,
  myId,
  onToggle,
  align = 'center',
}: {
  messageId: string;
  reactions: Reactions;
  myId: string | null;
  onToggle: (emoji: ReactionEmoji) => void;
  align?: 'left' | 'center' | 'right';
}) {
  const forMsg = reactions[messageId];
  const entries = REACTIONS.map((e) => [e, forMsg?.[e] ?? []] as const).filter(([, users]) => users.length);
  if (!entries.length) return null;
  return (
    <View style={[styles.chips, align === 'left' ? styles.left : align === 'right' ? styles.right : styles.center]}>
      {entries.map(([emoji, users]) => {
        const mine = !!myId && users.includes(myId);
        return (
          <Pressable
            key={emoji}
            onPress={() => {
              onToggle(emoji);
              haptic.select();
            }}
            style={[styles.chip, mine && styles.chipMine]}
            accessibilityLabel={`${emoji} ${users.length}${mine ? ', including you' : ''}`}
          >
            <Text style={styles.chipEmoji} allowFontScaling={false}>
              {emoji}
            </Text>
            <Text style={[styles.chipCount, mine && styles.chipCountMine]}>{users.length}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ReactionPicker({
  onPick,
  align = 'center',
}: {
  onPick: (emoji: ReactionEmoji) => void;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <Animated.View entering={FadeIn.duration(120)} style={[styles.pickerWrap, align === 'left' ? styles.left : align === 'right' ? styles.right : styles.center]}>
      <View style={styles.picker}>
        {REACTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => {
              onPick(emoji);
              haptic.tap();
            }}
            hitSlop={4}
            style={({ pressed }) => [styles.pick, pressed && styles.pickPressed]}
            accessibilityLabel={`React ${emoji}`}
          >
            <Text style={styles.pickEmoji} allowFontScaling={false}>
              {emoji}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: space.lg, marginTop: -2, marginBottom: space.xs },
  left: { justifyContent: 'flex-start', paddingLeft: 56 },
  right: { justifyContent: 'flex-end' },
  center: { justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: ink.muted,
    backgroundColor: ink.page,
  },
  chipMine: { borderColor: ink.ink, backgroundColor: ink.lavenderMist },
  chipEmoji: { fontSize: 14 },
  chipCount: { fontFamily: fonts.bodyBold, fontSize: 12, color: ink.inkSoft },
  chipCountMine: { color: ink.ink },
  pickerWrap: { flexDirection: 'row', paddingHorizontal: space.lg, marginBottom: space.xs },
  picker: {
    flexDirection: 'row',
    gap: 2,
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 2.5,
    borderColor: ink.ink,
    backgroundColor: ink.page,
  },
  pick: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pickPressed: { backgroundColor: ink.lavenderMist, transform: [{ scale: 1.15 }] },
  pickEmoji: { fontSize: 24 },
});
