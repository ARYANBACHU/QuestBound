// Owner: MP. Invite friends: QR (https://<public app>/join/CODE; the app also opens questbound://join/CODE) + huge code + copy/share. Exported for AB.
//   <InviteSheet visible onClose={() => …} />            // modal sheet, uses the active fellowship
//   <InviteCard fellowship={f} />                        // same content inline (e.g. onboarding step)
import { useState } from 'react';
import { Modal, Platform, Pressable, Share, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { haptic } from './haptics';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, ink, panel, radius, realm, scrim, shadow, space, type, ui } from '@/shared/theme';
import type { Fellowship } from '@/shared/types';
import { useFellowship } from '@/lib/fellowship';
import { PUBLIC_APP_URL } from '@/lib/env';
import GameButton from './GameButton';
import { Sage } from './sage';

/** https link that works for everyone: opens the web app in any browser (scans with any phone camera). */
export function inviteLink(code: string): string {
  const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : PUBLIC_APP_URL;
  return `${origin}/join/${code}`;
}

/** Native-app deep link, kept for anyone who wants to open the installed app directly. */
export function appInviteLink(code: string): string {
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
  const [linkCopied, setLinkCopied] = useState(false);

  if (!f) {
    return (
      <View style={[styles.card, style]}>
        <Sage expression="idle" size="sm" />
        <Text style={styles.muse}>Found or join a fellowship first, and Sage will hand you its invite.</Text>
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
    const link = inviteLink(code);
    const message = `Join our fellowship on Questbound: code ${code}\n${link}`;
    if (Platform.OS === 'web') {
      // Phones have the share sheet; desktop browsers don't, so copy the link instead.
      const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null;
      if (nav?.share) {
        try {
          await nav.share({ title: 'Questbound', text: `Join our fellowship on Questbound: code ${code}`, url: link });
          return;
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return; // user closed the sheet
        }
      }
      await Clipboard.setStringAsync(link);
      haptic.success();
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
      return;
    }
    try {
      await Share.share({ message });
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
        <GameButton label={copied ? 'Copied!' : 'Copy code'} tone="ghost" onPress={copy} style={styles.btn} />
        <GameButton label={linkCopied ? 'Link copied!' : 'Share invite'} tone="primary" onPress={share} style={styles.btn} />
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
  backdrop: { flex: 1, backgroundColor: scrim.strong },
  sheet: {
    backgroundColor: realm.royalMist,
    borderTopLeftRadius: ui.cardRadius,
    borderTopRightRadius: ui.cardRadius,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: ink.ink,
    overflow: 'hidden',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: ink.muted, marginBottom: space.md },
  title: { fontFamily: fonts.display, fontSize: type.heading, color: ink.ink, textAlign: 'center', marginBottom: space.md },
  card: {
    backgroundColor: panel.parchment,
    borderWidth: ui.borderWidth,
    borderColor: ink.ink,
    borderRadius: ui.cardRadius,
    ...shadow.md,
    padding: space.lg,
    alignItems: 'center',
  },
  name: { fontFamily: fonts.display, fontSize: type.heading, color: ink.ink, textAlign: 'center' },
  muse: { fontFamily: fonts.displayItalic, fontSize: type.body, color: ink.inkSoft, textAlign: 'center', marginTop: space.xs },
  qrFrame: { marginTop: space.lg, padding: space.sm, borderWidth: ui.borderWidth, borderColor: ink.ink, borderRadius: radius.md, overflow: 'hidden', backgroundColor: ink.page },
  label: { fontFamily: fonts.body, fontSize: type.small, color: ink.muted, marginTop: space.lg, textTransform: 'uppercase', letterSpacing: 1.5 },
  code: { fontFamily: fonts.display, fontSize: 44, color: ink.ink, letterSpacing: 8, marginTop: space.xs, paddingLeft: 8 },
  buttons: { flexDirection: 'row', gap: space.md, marginTop: space.lg, alignSelf: 'stretch' },
  btn: { flex: 1 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  done: { alignSelf: 'center', marginTop: space.md, paddingVertical: space.sm, paddingHorizontal: space.xl },
  doneText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.inkSoft },
});
