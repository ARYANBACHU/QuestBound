// Owner: AD. Local stand-in for AB's components/wizard/Sage.tsx (same props). When AB's Sage lands on main,
// replace the body of this file with: export { Sage } from '@/components/wizard/Sage';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { SAGE_CREDIT, SAGE_SIZES, accent, ink, panel, sageColors, space, ui, type SageExpression, type SageSize } from '@/shared/theme';
import { Txt } from './ui';

export interface SageProps {
  expression?: SageExpression;
  size?: SageSize;
}

/** A round, friendly wizard: starry hat, cloud beard, rosy cheeks. Static (AB's version adds the idle animation). */
export function Sage({ expression = 'idle', size = 'md' }: SageProps) {
  const px = SAGE_SIZES[size];
  const o = sageColors.outline;
  const sw = 3.2;
  const eyes = (() => {
    switch (expression) {
      case 'happy':
      case 'proud':
        return <Path d="M38 55 q5 -6 10 0 M58 55 q5 -6 10 0" stroke={o} strokeWidth={sw} fill="none" strokeLinecap="round" />;
      case 'sleepy':
        return <Path d="M38 56 h10 M58 56 h10" stroke={o} strokeWidth={sw} strokeLinecap="round" />;
      case 'surprised':
        return <G><Circle cx={43} cy={54} r={4.2} fill={o} /><Circle cx={63} cy={54} r={4.2} fill={o} /></G>;
      case 'thinking':
        return <G><Circle cx={45} cy={51} r={3.4} fill={o} /><Circle cx={65} cy={51} r={3.4} fill={o} /></G>;
      default:
        return <G><Circle cx={43} cy={55} r={3.4} fill={o} /><Circle cx={63} cy={55} r={3.4} fill={o} /></G>;
    }
  })();
  const mouth =
    expression === 'surprised' ? <Circle cx={53} cy={71} r={4} fill={o} />
    : expression === 'thinking' ? <Path d="M48 71 h9" stroke={o} strokeWidth={sw} strokeLinecap="round" />
    : <Path d="M46 68 q7 7 14 0" stroke={o} strokeWidth={sw} fill="none" strokeLinecap="round" />;
  return (
    <Svg width={px} height={px} viewBox="0 0 106 106" accessibilityLabel={`Sage, ${expression}`}>
      {/* staff */}
      <Path d="M90 40 V100" stroke={sageColors.staff} strokeWidth={5} strokeLinecap="round" />
      <Circle cx={90} cy={34} r={8} fill={sageColors.staffGlow} stroke={o} strokeWidth={sw} />
      {/* robe */}
      <Path d="M22 104 Q24 78 53 74 Q82 78 84 104 Z" fill={sageColors.robe} stroke={o} strokeWidth={sw} strokeLinejoin="round" />
      {/* face */}
      <Circle cx={53} cy={58} r={22} fill={sageColors.skin} stroke={o} strokeWidth={sw} />
      <Circle cx={37} cy={63} r={4} fill={sageColors.cheek} opacity={0.7} />
      <Circle cx={69} cy={63} r={4} fill={sageColors.cheek} opacity={0.7} />
      {/* beard */}
      <Path
        d="M33 64 Q30 92 53 98 Q76 92 73 64 Q66 76 53 76 Q40 76 33 64 Z"
        fill={sageColors.beard} stroke={o} strokeWidth={sw} strokeLinejoin="round"
      />
      {eyes}
      {mouth}
      {/* hat */}
      <Path d="M24 44 Q53 34 82 44 Q76 50 53 49 Q30 50 24 44 Z" fill={sageColors.hat} stroke={o} strokeWidth={sw} strokeLinejoin="round" />
      <Path d="M34 42 L56 4 Q60 2 62 8 L72 41 Q53 36 34 42 Z" fill={sageColors.hat} stroke={o} strokeWidth={sw} strokeLinejoin="round" />
      <Path d="M54 22 l2.5 5 5.5 .8 -4 3.8 1 5.4 -5 -2.6 -5 2.6 1 -5.4 -4 -3.8 5.5 -.8 Z" fill={sageColors.hatStar} />
      <Path d="M34 42 Q53 36 72 41" stroke={sageColors.trim} strokeWidth={3} fill="none" />
    </Svg>
  );
}

/** Sage + a speech bubble with the name and the Muse credit. Used for empty / waiting / celebration states. */
export function SageSays({ expression = 'idle', size = 'md', title, line, children }: SageProps & { title?: string; line?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Sage expression={expression} size={size} />
      <View style={styles.bubble}>
        <View style={styles.nameRow}>
          <Txt v="smallBold" color={accent.primary}>Sage</Txt>
          <Txt v="small" color={ink.muted}>{SAGE_CREDIT}</Txt>
        </View>
        {title ? <Txt v="heading">{title}</Txt> : null}
        {line ? <Txt v="story" color={ink.inkSoft}>{line}</Txt> : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  bubble: {
    flex: 1, gap: space.xs, padding: space.md, backgroundColor: panel.parchment, borderWidth: ui.borderWidth, borderColor: ink.ink,
    borderRadius: ui.cardRadius, borderBottomLeftRadius: space.xs, overflow: 'hidden',
  },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' },
});
