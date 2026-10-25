// Owner: AB. Chunky "game" buttons: rounded face + darker bottom edge that compresses on press, bold Nunito label.
// Variants keep the Round 1 API (AD re-exports this as InkButton): primary · secondary · ghost · danger.
// `tone` picks any gameButton face for primary (e.g. 'forest', 'gold').
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { gameButton, ink, space, ui, type GameButtonTone } from '@/shared/theme';
import { playSfx, type SfxName } from './sfx';
import { T } from './T';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  tone?: GameButtonTone;
  disabled?: boolean;
  loading?: boolean;
  icon?: string; // emoji
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  accessibilityHint?: string;
  /** Sound on press (U7). Default 'tap'; pass the action's own sound ('send', 'open', …) or null for silence. */
  sfx?: SfxName | null;
}

export function Button({
  label, onPress, onLongPress, variant = 'primary', tone, disabled, loading, icon, style, small, accessibilityHint, sfx = 'tap',
}: ButtonProps) {
  const off = disabled || loading;
  const height = small ? ui.buttonHeightSm : ui.buttonHeight;

  if (variant === 'ghost') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!off }}
        disabled={off}
        onPress={() => { Haptics.selectionAsync().catch(() => {}); if (sfx) playSfx(sfx); onPress?.(); }}
        onLongPress={onLongPress}
        hitSlop={6}
        style={({ pressed }) => [styles.ghost, { minHeight: height - 8 }, off && styles.disabled, pressed && styles.ghostPressed, style]}
      >
        <View style={styles.row}>
          {icon ? <T variant="body" style={styles.icon}>{icon}</T> : null}
          <T variant={small ? 'smallBold' : 'bodyBold'} color={ink.inkSoft}>{label}</T>
        </View>
      </Pressable>
    );
  }

  const look = variant === 'secondary' ? gameButton.ghost
    : variant === 'danger' ? { face: ink.page, edge: gameButton.danger.edge, label: ink.danger }
    : gameButton[tone ?? 'primary'];
  const depth = small ? ui.buttonDepth - 1 : ui.buttonDepth;
  const pressedDepth = ui.buttonDepthPressed;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onLongPress={onLongPress}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); if (sfx) playSfx(sfx); onPress?.(); }}
      style={[{ paddingBottom: depth }, off && styles.disabled, style]}
    >
      {({ pressed }) => (
        <>
          <View
            style={[styles.edge, { top: depth, backgroundColor: look.edge, borderRadius: ui.buttonRadius }]}
          />
          <View
            style={[
              styles.face,
              {
                minHeight: height, backgroundColor: look.face, borderRadius: ui.buttonRadius,
                paddingHorizontal: small ? space.lg : space.xl,
                borderColor: variant === 'danger' ? ink.danger : ink.ink,
                transform: [{ translateY: pressed && !off ? depth - pressedDepth : 0 }],
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={look.label} />
            ) : (
              <View style={styles.row}>
                {icon ? <T variant={small ? 'small' : 'body'} style={styles.icon}>{icon}</T> : null}
                <T variant={small ? 'smallBold' : 'bodyBold'} color={look.label} style={!small && styles.big} numberOfLines={1}>
                  {label}
                </T>
              </View>
            )}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, borderWidth: ui.borderWidth, borderColor: ink.ink },
  face: { alignItems: 'center', justifyContent: 'center', borderWidth: ui.borderWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  icon: { fontSize: 18 },
  big: { fontSize: 17 },
  disabled: { opacity: 0.45 },
  ghost: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, borderRadius: ui.buttonRadius },
  ghostPressed: { opacity: 0.6 },
});
