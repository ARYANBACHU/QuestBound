// Owner: AD. Text + button primitives for the coloring/storybook screens. Txt wraps AB's components/shell/T
// (keeps AD's short `v` prop). InkButton is a chunky "game" button built on the shared gameButton tokens
// (same props as AB's Button, plus `tone`).
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { T, type TProps, type TVariant } from '@/components/shell/T';
import { gameButton, ink, space, ui, type ChipTone, chips, type GameButtonTone } from '@/shared/theme';

export function Txt({ v = 'body', ...rest }: Omit<TProps, 'variant'> & { v?: TVariant }) {
  return <T variant={v} {...rest} />;
}

export interface InkButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  tone?: GameButtonTone; // overrides variant's colors
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_TONE: Record<NonNullable<InkButtonProps['variant']>, GameButtonTone> = {
  primary: 'primary', secondary: 'ghost', ghost: 'ghost', danger: 'danger',
};

export function InkButton({ label, onPress, variant = 'primary', tone, disabled, loading, icon, small, style }: InkButtonProps) {
  const c = gameButton[tone ?? VARIANT_TONE[variant]];
  const h = small ? ui.buttonHeightSm : ui.buttonHeight;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={[{ minHeight: h + ui.buttonDepth }, off && { opacity: 0.55 }, style]}
    >
      {({ pressed }) => (
        <View style={[styles.edge, { backgroundColor: c.edge, minHeight: h + ui.buttonDepth, paddingTop: pressed ? ui.buttonDepth - ui.buttonDepthPressed : 0 }]}>
          <View style={[styles.face, { backgroundColor: c.face, minHeight: h, paddingHorizontal: small ? space.lg : space.xl }]}>
            {loading ? (
              <ActivityIndicator color={c.label} />
            ) : (
              <View style={styles.row}>
                {icon ? <T variant={small ? 'small' : 'body'}>{icon}</T> : null}
                <T variant={small ? 'smallBold' : 'bodyBold'} color={c.label}>{label}</T>
              </View>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

/** A small colored pill (status, counts). */
export function Chip({ label, tone = 'neutral', style }: { label: string; tone?: ChipTone; style?: StyleProp<ViewStyle> }) {
  const c = chips[tone];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg, borderColor: c.border }, style]}>
      <T variant="smallBold" color={c.fg} numberOfLines={1}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  edge: { borderRadius: ui.buttonRadius, borderWidth: ui.borderWidth, borderColor: ink.ink, overflow: 'hidden', justifyContent: 'flex-start' },
  face: { borderRadius: ui.buttonRadius - ui.borderWidth, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chip: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: ui.chipRadius, paddingHorizontal: space.sm, paddingVertical: 2, overflow: 'hidden' },
});
