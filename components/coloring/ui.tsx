// Owner: AD. Tiny local text + button primitives for the coloring/storybook screens (mirrors AB's shell style).
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import { fonts, ink, radius, space, type } from '@/shared/theme';

type Variant = 'hero' | 'title' | 'heading' | 'body' | 'bodyBold' | 'small' | 'smallBold' | 'story';

export function Txt({ v = 'body', color, center, style, ...rest }: TextProps & { v?: Variant; color?: string; center?: boolean }) {
  return <Text {...rest} style={[txt[v], color ? { color } : null, center ? { textAlign: 'center' } : null, style]} />;
}

export function InkButton({
  label, onPress, variant = 'primary', loading, disabled, small, style,
}: {
  label: string; onPress?: () => void; variant?: 'primary' | 'secondary'; loading?: boolean; disabled?: boolean; small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        btn.base, small && btn.small, primary ? btn.primary : btn.secondary,
        (disabled || loading) && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.97 }] }, style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? ink.page : ink.ink} />
      ) : (
        <Txt v={small ? 'smallBold' : 'bodyBold'} color={primary ? ink.page : ink.ink}>{label}</Txt>
      )}
    </Pressable>
  );
}

const txt = StyleSheet.create({
  hero: { fontFamily: fonts.display, fontSize: type.hero, lineHeight: type.hero * 1.15, color: ink.ink },
  title: { fontFamily: fonts.display, fontSize: type.title, lineHeight: type.title * 1.2, color: ink.ink },
  heading: { fontFamily: fonts.display, fontSize: type.heading, lineHeight: type.heading * 1.25, color: ink.ink },
  body: { fontFamily: fonts.body, fontSize: type.body, lineHeight: type.body * 1.4, color: ink.ink },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: type.body, lineHeight: type.body * 1.4, color: ink.ink },
  small: { fontFamily: fonts.body, fontSize: type.small, lineHeight: type.small * 1.4, color: ink.inkSoft },
  smallBold: { fontFamily: fonts.bodyBold, fontSize: type.small, lineHeight: type.small * 1.4, color: ink.inkSoft },
  story: { fontFamily: fonts.displayItalic, fontSize: type.body + 1, lineHeight: (type.body + 1) * 1.45, color: ink.inkSoft },
});

const btn = StyleSheet.create({
  base: {
    minHeight: 52, borderRadius: radius.lg, paddingHorizontal: space.xl, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: ink.ink,
  },
  small: { minHeight: 40, paddingHorizontal: space.lg, borderRadius: radius.md },
  primary: { backgroundColor: ink.ink },
  secondary: { backgroundColor: ink.page },
});
