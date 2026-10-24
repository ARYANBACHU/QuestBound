// Owner: MP. Invite friends: QR (deep link questbound://join/CODE) + huge code + copy/share. Exported for AB.
//   <InviteSheet visible onClose={() => …} />            // modal sheet, uses the active fellowship
//   <InviteCard fellowship={f} />                        // same content inline (e.g. onboarding step)
import { useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { haptic } from './haptics';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, ink, radius, space, type } from '@/shared/theme';
import type { Fellowship } from '@/shared/types';
import { useFellowship } from '@/lib/fellowship';
import { withAlpha } from './color';

export function inviteLink(code: string): string {
  return `questbound://join/${code}`;
}

export interface InviteCardProps {
  /** Defaults to the active fellowship. */
  fellowship?: Fellowship | null;
  /** QR size in px (default 200). */
  qrSize?: number;
  style?: StyleProp<ViewStyle>;
}

export function InviteCard({ fellowship: given, qrSize = 200, style }: InviteCardProps) {
  const { fellowship: active } = useFellowship();
  const f = given ?? active;
  const [copied, setCopied] = useState(false);

  if (!f) {
    return (
      <View style={[styles.card, style]}>
        <Text style={styles.muse}>Found or join a fellowship first, and Muse will hand you its invite.</Text>
      </View>
    );
  }
  const code = f.invite_code;

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    haptic.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const share = async () => {
    try {
      await Share.share({ message: `Join our fellowship on Questbound: code ${code}\n${inviteLink(code)}` });
    } catch {
      // user dismissed
    }
  };

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.name} numberOfLines={2}>
        {f.name}
      </Text>
      <Text style={styles.muse}>Show this to a friend. One scan and they're in.</Text>
      <View style={styles.qrFrame}>
        <QRCode value={inviteLink(code)} size={qrSize} color={ink.ink} backgroundColor={ink.page} quietZone={8} />
      </View>
      <Text style={styles.label}>or type the code</Text>
      <Text style={styles.code} selectable accessibilityLabel={`Invite code ${code.split('').join(' ')}`}>
        {code}
      </Text>
      <View style={styles.buttons}>
        <Pressable onPress={copy} style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}>
          <Text style={styles.btnGhostText}>{copied ? 'Copied!' : 'Copy code'}</Text>
        </Pressable>
        <Pressable onPress={share} style={({ pressed }) => [styles.btn, styles.btnInk, pressed && styles.pressed]}>
          <Text style={styles.btnInkText}>Share invite</Text>
        </Pressable>
      </View>
    </View>
  );
}

export interface InviteSheetProps {
  visible: boolean;
  onClose: () => void;
  fellowship?: Fellowship | null;
  /** Heading above the card (default "Summon your friends"). */
  title?: string;
}

export default function InviteSheet({ visible, onClose, fellowship, title = 'Summon your friends' }: InviteSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close invite" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>{title}</Text>
        <InviteCard fellowship={fellowship} />
        <Pressable onPress={onClose} style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: withAlpha(ink.ink, 0.45) },
  sheet: {
    backgroundColor: ink.lavenderMist,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: ink.ink,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: ink.muted, marginBottom: space.md },
  title: { fontFamily: fonts.display, fontSize: type.heading, color: ink.ink, textAlign: 'center', marginBottom: space.md },
  card: {
    backgroundColor: ink.page,
    borderWidth: 3,
    borderColor: ink.ink,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: 'center',
  },
  name: { fontFamily: fonts.display, fontSize: type.heading, color: ink.ink, textAlign: 'center' },
  muse: { fontFamily: fonts.displayItalic, fontSize: type.body, color: ink.inkSoft, textAlign: 'center', marginTop: space.xs },
  qrFrame: { marginTop: space.lg, padding: space.sm, borderWidth: 3, borderColor: ink.ink, borderRadius: radius.md, backgroundColor: ink.page },
  label: { fontFamily: fonts.body, fontSize: type.small, color: ink.muted, marginTop: space.lg, textTransform: 'uppercase', letterSpacing: 1.5 },
  code: { fontFamily: fonts.display, fontSize: 44, color: ink.ink, letterSpacing: 8, marginTop: space.xs, paddingLeft: 8 },
  buttons: { flexDirection: 'row', gap: space.md, marginTop: space.lg, alignSelf: 'stretch' },
  btn: { flex: 1, borderRadius: radius.pill, borderWidth: 3, borderColor: ink.ink, paddingVertical: space.md, alignItems: 'center' },
  btnGhost: { backgroundColor: ink.page },
  btnGhostText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.ink },
  btnInk: { backgroundColor: ink.ink },
  btnInkText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.page },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  done: { alignSelf: 'center', marginTop: space.md, paddingVertical: space.sm, paddingHorizontal: space.xl },
  doneText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.inkSoft },
});
