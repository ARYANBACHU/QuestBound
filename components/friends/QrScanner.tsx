// Owner: MP. Full-screen QR scanner for fellowship invites. Exported for AB's onboarding.
//   <QrScanner onCode={(code) => joinByCode(code)} onCancel={() => …} onTypeCode={() => …} />
// Accepts `questbound://join/ABC123` links or a raw 6-char code. Fires onCode once per mount
// (call `reset` via the `key` prop to scan again, e.g. after a failed join).
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { haptic } from './haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, ink, radius, space, type } from '@/shared/theme';

export interface QrScannerProps {
  onCode: (code: string) => void;
  /** Shows a close (✕) button when provided. */
  onCancel?: () => void;
  /** Shows "Type the code instead" (always shown when camera permission is denied). */
  onTypeCode?: () => void;
  /** Message under the viewfinder, e.g. an error from a failed join. */
  hint?: string | null;
}

/** Pull an invite code out of anything a QR might contain. Returns null if it isn't ours. */
export function parseInviteCode(data: string): string | null {
  const s = data.trim();
  const link = s.match(/join\/([A-Za-z0-9]{4,12})\b/);
  if (link) return link[1].toUpperCase();
  if (/^[A-Za-z0-9]{6}$/.test(s)) return s.toUpperCase();
  return null;
}

export default function QrScanner({ onCode, onCancel, onTypeCode, hint }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const done = useRef(false);
  const [wrong, setWrong] = useState(false);

  const onScan = ({ data }: BarcodeScanningResult) => {
    if (done.current) return;
    const code = parseInviteCode(data);
    if (!code) {
      setWrong(true);
      return;
    }
    done.current = true;
    haptic.success();
    onCode(code);
  };

  if (!permission) {
    return (
      <View style={[styles.fill, styles.center, styles.paper]}>
        <ActivityIndicator color={ink.ink} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.center, styles.paper, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.bigEmoji}>🔮</Text>
        <Text style={styles.title}>Muse needs your eyes</Text>
        <Text style={styles.body}>
          Allow the camera to scan a friend's invite. Or just type the six letters they show you.
        </Text>
        {permission.canAskAgain ? (
          <Pressable onPress={requestPermission} style={({ pressed }) => [styles.btn, styles.btnInk, pressed && styles.pressed]}>
            <Text style={styles.btnInkText}>Allow camera</Text>
          </Pressable>
        ) : (
          <Text style={styles.small}>Camera is off for Questbound. Turn it on in Settings, or type the code.</Text>
        )}
        {onTypeCode ? (
          <Pressable onPress={onTypeCode} style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}>
            <Text style={styles.btnGhostText}>Type the code instead</Text>
          </Pressable>
        ) : null}
        {onCancel ? (
          <Pressable onPress={onCancel} style={styles.link}>
            <Text style={styles.linkText}>Back</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
      <View style={[styles.overlay, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg }]} pointerEvents="box-none">
        <View style={styles.topRow}>
          {onCancel ? (
            <Pressable onPress={onCancel} hitSlop={12} style={styles.close} accessibilityLabel="Close scanner">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.center}>
          <Text style={styles.overlayTitle}>Scan a fellowship invite</Text>
          <View style={styles.frame} />
          <Text style={styles.overlayHint}>
            {hint ?? (wrong ? "That's not a Questbound invite. Try your friend's QR." : 'Point at the QR on your friend’s phone.')}
          </Text>
        </View>
        {onTypeCode ? (
          <Pressable onPress={onTypeCode} style={({ pressed }) => [styles.btn, styles.btnGhost, styles.typeBtn, pressed && styles.pressed]}>
            <Text style={styles.btnGhostText}>Type the code instead</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: ink.ink },
  paper: { backgroundColor: ink.paper, paddingHorizontal: space.xl },
  center: { alignItems: 'center', justifyContent: 'center' },
  bigEmoji: { fontSize: 56, marginBottom: space.md },
  title: { fontFamily: fonts.display, fontSize: type.title, color: ink.ink, textAlign: 'center' },
  body: { fontFamily: fonts.body, fontSize: type.body, color: ink.inkSoft, textAlign: 'center', marginTop: space.sm, marginBottom: space.lg },
  small: { fontFamily: fonts.body, fontSize: type.small, color: ink.muted, textAlign: 'center', marginBottom: space.md },
  btn: { borderRadius: radius.pill, borderWidth: 3, borderColor: ink.ink, paddingVertical: space.md, paddingHorizontal: space.xl, alignItems: 'center', marginTop: space.sm, alignSelf: 'stretch' },
  btnInk: { backgroundColor: ink.ink },
  btnInkText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.page },
  btnGhost: { backgroundColor: ink.page },
  btnGhostText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.ink },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  link: { marginTop: space.md, padding: space.sm },
  linkText: { fontFamily: fonts.bodyBold, color: ink.inkSoft, fontSize: type.body },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', paddingHorizontal: space.xl },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: 40 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: ink.page, borderWidth: 3, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fonts.bodyBold, fontSize: 18, color: ink.ink },
  overlayTitle: { fontFamily: fonts.display, fontSize: type.heading, color: ink.page, marginBottom: space.lg, textAlign: 'center' },
  frame: { width: 250, height: 250, borderRadius: radius.lg, borderWidth: 5, borderColor: ink.gold },
  overlayHint: { fontFamily: fonts.body, fontSize: type.body, color: ink.page, marginTop: space.lg, textAlign: 'center' },
  typeBtn: { alignSelf: 'stretch' },
});
