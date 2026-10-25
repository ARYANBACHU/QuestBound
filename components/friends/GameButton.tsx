// Owner: MP. Chunky "game" button: face + darker bottom edge that compresses on press (theme `gameButton` / `ui`).
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, gameButton, type, ui, type GameButtonTone } from '@/shared/theme';
import { haptic } from './haptics';

export interface GameButtonProps {
  label: string;
  onPress?: () => void;
  tone?: GameButtonTone;
  size?: 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export default function GameButton({ label, onPress, tone = 'primary', size = 'md', disabled, loading, style, accessibilityLabel }: GameButtonProps) {
  const [down, setDown] = useState(false);
  const c = gameButton[tone];
  const h = size === 'sm' ? ui.buttonHeightSm : ui.buttonHeight;
  const depth = down ? ui.buttonDepthPressed : ui.buttonDepth;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={[{ height: h + ui.buttonDepth, opacity: off && !loading ? 0.45 : 1 }, style]}
    >
      <View
        style={[
          styles.edge,
          { height: h + depth, marginTop: ui.buttonDepth - depth, backgroundColor: c.edge, borderRadius: ui.buttonRadius },
        ]}
      >
        <View style={[styles.face, { height: h, backgroundColor: c.face, borderRadius: ui.buttonRadius, borderColor: c.edge }]}>
          {loading ? (
            <ActivityIndicator color={c.label} />
          ) : (
            <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: c.label }]} numberOfLines={1}>
              {label}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edge: { overflow: 'hidden' },
  face: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderWidth: 2 },
  label: { fontFamily: fonts.bodyBold, fontSize: type.body + 1 },
  labelSm: { fontSize: type.body - 1 },
});
