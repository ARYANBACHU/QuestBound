// Owner: AB. Big primary / secondary buttons in thick ink, coloring-book style.
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ink, radius, space } from '@/shared/theme';
import { T } from './T';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: string; // emoji
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}

export function Button({ label, onPress, onLongPress, variant = 'primary', disabled, loading, icon, style, small }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const fg = isPrimary ? ink.page : variant === 'danger' ? ink.danger : ink.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onLongPress={onLongPress}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.dangerBox,
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <T variant={small ? 'small' : 'body'} style={styles.icon}>{icon}</T> : null}
          <T variant={small ? 'smallBold' : 'bodyBold'} color={fg}>{label}</T>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54, borderRadius: radius.lg, paddingHorizontal: space.xl, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: ink.ink,
  },
  small: { minHeight: 38, paddingHorizontal: space.lg, borderWidth: 2, borderRadius: radius.pill },
  primary: { backgroundColor: ink.ink },
  secondary: { backgroundColor: ink.page },
  dangerBox: { backgroundColor: ink.page, borderColor: ink.danger },
  ghost: { borderColor: 'transparent', backgroundColor: 'transparent' },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.97 }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  icon: { fontSize: 18 },
});
