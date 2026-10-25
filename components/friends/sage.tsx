// Owner: MP. Local adapter for Sage (our wizard mascot) + its sound helper.
// AB owns the real ones: components/wizard/Sage.tsx and components/shell/sfx.ts. Until they reach main this file
// renders a placeholder with the same props and a silent playSfx with the same signature.
// TODO(MP): when AB's files land, replace the bodies below with:
//   export { default as Sage } from '@/components/wizard/Sage';
//   export { playSfx } from '@/components/shell/sfx';
import { StyleSheet, Text, View } from 'react-native';
import { SAGE_SIZES, ink, sageColors, type SageExpression, type SageSize } from '@/shared/theme';

export type SfxName = 'ping' | 'crayon' | 'page' | 'seal';

/** Short sound effect (no-op until AB's sfx helper lands). Never throws. */
export function playSfx(_name: SfxName): void {}

export interface SageProps {
  expression?: SageExpression;
  size?: SageSize;
}

const FACE: Record<SageExpression, string> = {
  idle: '🧙',
  happy: '🧙',
  thinking: '🧙',
  surprised: '🧙',
  proud: '🧙',
  sleepy: '🧙',
};

/** Placeholder Sage: a round robe-purple badge with the wizard face. */
export function Sage({ expression = 'idle', size = 'md' }: SageProps) {
  const px = SAGE_SIZES[size];
  return (
    <View
      accessibilityLabel="Sage the wizard"
      style={[styles.badge, { width: px, height: px, borderRadius: px / 2, borderWidth: Math.max(2, px * 0.05) }]}
    >
      <Text style={{ fontSize: Math.round(px * 0.56), lineHeight: Math.round(px * 0.72) }} allowFontScaling={false}>
        {FACE[expression]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: sageColors.beardShade, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
