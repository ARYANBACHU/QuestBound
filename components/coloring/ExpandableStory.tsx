// Owner: AD. Narrated story text that clamps to N lines with a fade-out + "Read more ▾" chip ("Show less ▴" when open).
'use no memo';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, type as typeScale, ui, space, type Mood } from '@/shared/theme';
import { Txt } from './ui';

const LINE_H = typeScale.body * 1.5; // matches T "story" closely enough for the estimate

export function ExpandableStory({ text, lines = 3, mood, fadeColor }: { text: string; lines?: number; mood: Mood; fadeColor: string }) {
  const [open, setOpen] = useState(false);
  const [measured, setMeasured] = useState<number | null>(null); // full line count (native onTextLayout)
  const [width, setWidth] = useState(0);
  // Web has no onTextLayout: estimate from width (Fraunces italic ≈ 0.47em per char).
  const estimate = width ? Math.ceil((text.length * typeScale.body * 0.47) / width) : 0;
  const total = measured ?? estimate;
  const overflow = total > lines;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {/* invisible full-length copy, only to count lines on native */}
      {Platform.OS !== 'web' && measured === null ? (
        <Txt v="story" style={styles.measure} onTextLayout={(e) => setMeasured(e.nativeEvent.lines.length)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {text}
        </Txt>
      ) : null}
      <Pressable
        onPress={() => overflow && setOpen((o) => !o)}
        disabled={!overflow}
        accessibilityRole={overflow ? 'button' : 'text'}
        accessibilityLabel={text}
        accessibilityHint={overflow ? (open ? 'Show less of the passage' : 'Read the whole passage') : undefined}
      >
        <View>
          <Txt v="story" numberOfLines={open || !overflow ? undefined : lines}>{text}</Txt>
          {overflow && !open ? (
            <LinearGradient
              pointerEvents="none"
              colors={[`${fadeColor}00`, fadeColor]}
              style={[styles.fade, { height: LINE_H * 1.4 }]}
            />
          ) : null}
        </View>
        {overflow ? (
          <View style={[styles.chip, { backgroundColor: mood.tintStrong, borderColor: mood.deep }]}>
            <Txt v="smallBold" color={mood.deep} style={{ fontFamily: fonts.bodyBold }}>{open ? 'Show less ▴' : 'Read more ▾'}</Txt>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  measure: { position: 'absolute', opacity: 0, left: 0, right: 0 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  chip: {
    alignSelf: 'flex-start', marginTop: space.xs, borderWidth: 1.5, borderRadius: ui.chipRadius, overflow: 'hidden',
    paddingHorizontal: space.md, paddingVertical: 3,
  },
});
