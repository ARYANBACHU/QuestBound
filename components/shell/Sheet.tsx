// Owner: AB. Bottom sheet frame for AB pop-ups: one radius on the container AND every edge-touching child
// (overflow hidden) — no jagged corners. Parchment panel, ink border, grabber.
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ink, panel, scrim, space, ui } from '@/shared/theme';
import { KeyboardSafe } from './KeyboardSafe';

export const SHEET_RADIUS = ui.cardRadius + 6;

export function Sheet({ visible, onClose, children, style, dismissable = true }: {
  visible: boolean; onClose: () => void; children: React.ReactNode; style?: StyleProp<ViewStyle>; dismissable?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismissable ? onClose : () => {}}>
      <Pressable style={styles.backdrop} onPress={dismissable ? onClose : undefined} accessibilityLabel="Close" />
      <KeyboardSafe style={styles.wrap} pointerEvents="box-none" dismissOnTap={false}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) }, style]}>
          <View style={styles.grabber} />
          {children}
        </View>
      </KeyboardSafe>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: scrim.base },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '90%', backgroundColor: panel.parchment, borderTopLeftRadius: SHEET_RADIUS, borderTopRightRadius: SHEET_RADIUS,
    borderWidth: panel.borderWidth, borderBottomWidth: 0, borderColor: panel.border, overflow: 'hidden',
    paddingHorizontal: space.xl, paddingTop: space.sm,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: ink.muted, marginBottom: space.md },
});
