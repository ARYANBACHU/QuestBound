// Owner: AB. Grid of 8 crests; the selected one bounces. Used by onboarding + settings.
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { CREST_LIST, CRESTS, CRAYONS, ink, radius, space, type CrayonColor, type CrestId } from '@/shared/theme';
import { T } from './T';
import { playSfx } from './sfx';

export function CrestPicker({ value, onChange, color }: { value: CrestId | null; onChange: (c: CrestId) => void; color?: CrayonColor }) {
  return (
    <View style={styles.grid}>
      {CREST_LIST.map((id) => (
        <CrestCell key={id} id={id} selected={value === id} ring={color ? CRAYONS[color] : ink.ink} onPress={() => onChange(id)} />
      ))}
    </View>
  );
}

function CrestCell({ id, selected, ring, onPress }: { id: CrestId; selected: boolean; ring: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (selected) scale.value = withSequence(withSpring(1.18, { damping: 6, stiffness: 300 }), withSpring(1, { damping: 8 }));
  }, [selected, scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={CRESTS[id].title}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); playSfx('tap'); onPress(); }}
      style={styles.cell}
    >
      <Animated.View style={[styles.disc, selected && { borderColor: ring, borderWidth: 4, backgroundColor: ink.lavenderMist }, anim]}>
        <T style={styles.emoji}>{CRESTS[id].emoji}</T>
      </Animated.View>
      <T variant={selected ? 'smallBold' : 'small'} color={selected ? ink.ink : ink.inkSoft} numberOfLines={1}>{CRESTS[id].title}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.lg },
  cell: { width: '24%', alignItems: 'center', gap: space.xs },
  disc: {
    width: 64, height: 64, borderRadius: radius.pill, borderWidth: 2, borderColor: ink.ink, backgroundColor: ink.page,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 32, lineHeight: 40 },
});
