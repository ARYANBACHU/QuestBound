// Owner: AB. The one Text wrapper. Use <T variant="..."> instead of <Text> so fonts + sizes stay consistent.
import { StyleSheet, Text, type TextProps } from 'react-native';
import { fonts, ink, type } from '@/shared/theme';

export type TVariant = 'hero' | 'title' | 'heading' | 'body' | 'bodyBold' | 'small' | 'smallBold' | 'story';

export interface TProps extends TextProps {
  variant?: TVariant;
  color?: string;
  center?: boolean;
}

export function T({ variant = 'body', color, center, style, ...rest }: TProps) {
  return (
    <Text
      {...rest}
      style={[styles[variant], color ? { color } : null, center ? styles.center : null, style]}
    />
  );
}

const styles = StyleSheet.create({
  hero: { fontFamily: fonts.display, fontSize: type.hero, lineHeight: type.hero * 1.15, color: ink.ink },
  title: { fontFamily: fonts.display, fontSize: type.title, lineHeight: type.title * 1.2, color: ink.ink },
  heading: { fontFamily: fonts.display, fontSize: type.heading, lineHeight: type.heading * 1.25, color: ink.ink },
  body: { fontFamily: fonts.body, fontSize: type.body, lineHeight: type.body * 1.4, color: ink.ink },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: type.body, lineHeight: type.body * 1.4, color: ink.ink },
  small: { fontFamily: fonts.body, fontSize: type.small, lineHeight: type.small * 1.4, color: ink.inkSoft },
  smallBold: { fontFamily: fonts.bodyBold, fontSize: type.small, lineHeight: type.small * 1.4, color: ink.inkSoft },
  story: { fontFamily: fonts.displayItalic, fontSize: type.body + 1, lineHeight: (type.body + 1) * 1.45, color: ink.inkSoft },
  center: { textAlign: 'center' },
});
