// Owner: AB. The "…" menu: secondary actions live here so each screen keeps one clear primary action.
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ink, panel, scrim, shadow, space, ui } from '@/shared/theme';
import { T } from './T';

export interface MenuItem {
  label: string;
  icon?: string;
  onPress: () => void;
  danger?: boolean;
}

export function ActionMenu({ items, style, label = 'More actions', top = 52 }: {
  items: MenuItem[]; style?: StyleProp<ViewStyle>; label?: string; top?: number;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  if (!items.length) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={10}
        onPress={() => { Haptics.selectionAsync().catch(() => {}); setOpen(true); }}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed, style]}
      >
        <T variant="heading" style={styles.dots}>•••</T>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close menu" />
        <View style={[styles.menuShadow, { top: insets.top + top }]}>
        <View style={styles.menu}>
          {items.map((it, i) => (
            <Pressable
              key={it.label}
              accessibilityRole="menuitem"
              onPress={() => { setOpen(false); Haptics.selectionAsync().catch(() => {}); setTimeout(it.onPress, 120); }}
              style={({ pressed }) => [styles.item, i > 0 && styles.divider, pressed && styles.itemPressed]}
            >
              {it.icon ? <T style={styles.icon}>{it.icon}</T> : null}
              <T variant="bodyBold" color={it.danger ? ink.danger : ink.ink}>{it.label}</T>
            </Pressable>
          ))}
        </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.page,
    borderWidth: 2, borderColor: ink.ink,
  },
  pressed: { transform: [{ scale: 0.94 }] },
  dots: { fontSize: 14, lineHeight: 18, letterSpacing: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: scrim.soft },
  menuShadow: { position: 'absolute', right: space.lg, minWidth: 240, maxWidth: 320, borderRadius: ui.cardRadius, ...shadow.lg },
  menu: {
    backgroundColor: panel.parchment, borderRadius: ui.cardRadius, borderWidth: panel.borderWidth, borderColor: panel.border,
    overflow: 'hidden',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg, minHeight: 52 },
  divider: { borderTopWidth: 1.5, borderTopColor: panel.parchmentEdge },
  itemPressed: { backgroundColor: panel.parchmentEdge },
  icon: { fontSize: 18, lineHeight: 24 },
});
