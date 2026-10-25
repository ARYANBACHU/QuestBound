// Owner: AD. Round 2: `Sage` is AB's real mascot (components/wizard/Sage.tsx); `SageSays` is AD's bubble around it.
import { Sage, type SageProps } from '@/components/wizard/Sage';
import { StyleSheet, View } from 'react-native';
import { SAGE_CREDIT, accent, ink, panel, space, ui } from '@/shared/theme';
import { Txt } from './ui';

export { Sage };
export type { SageProps };

/** Sage + a speech bubble with the name and the Muse credit. Used for empty / waiting / celebration states. */
export function SageSays({ expression = 'idle', size = 'md', title, line, children }: Pick<SageProps, 'expression' | 'size'> & { title?: string; line?: string; children?: React.ReactNode }) {
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
