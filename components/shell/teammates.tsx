// Owner: AB. ONE place for teammates' components. Until MP (components/friends) and AD (components/coloring)
// land on main, these are tiny local fallbacks with the same props. Swap to re-exports after the merge:
//   export { Crest } from '@/components/friends/Crest'; etc.
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { useRef } from 'react';
import { Modal, Pressable, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { Fellowship, FellowshipMember, MissionType } from '@/shared/types';
import { CRAYONS, CRESTS, fonts, ink, radius, space, type CrayonColor, type CrestId } from '@/shared/theme';
import { Button } from './Button';
import { T } from './T';

// ---------- MP: Crest ----------
export function Crest({ crest, color, size = 40, ring = true }: { crest: CrestId; color: CrayonColor; size?: number; ring?: boolean; online?: boolean }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: ink.page, alignItems: 'center', justifyContent: 'center',
      borderWidth: ring ? Math.max(2, size / 12) : 1.5, borderColor: ring ? CRAYONS[color] : ink.ink,
    }}>
      <T style={{ fontSize: size * 0.52, lineHeight: size * 0.68 }}>{CRESTS[crest]?.emoji ?? '❔'}</T>
    </View>
  );
}

// ---------- MP: CrestRow ----------
export function CrestRow({ userIds, members, size = 24, max = 5 }: { userIds: string[]; members: FellowshipMember[]; size?: number; max?: number }) {
  const shown = userIds.slice(0, max);
  const extra = userIds.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((id, i) => {
        const p = members.find((m) => m.user_id === id)?.profile;
        return (
          <View key={id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
            {p ? <Crest crest={p.crest} color={p.color} size={size} /> : null}
          </View>
        );
      })}
      {extra > 0 ? <T variant="smallBold" style={{ marginLeft: 4 }}>+{extra}</T> : null}
    </View>
  );
}

// ---------- MP: InviteCard (inline) + InviteSheet (modal) ----------
// MP's API: <InviteCard fellowship? qrSize? style? /> and <InviteSheet visible onClose fellowship? title? />
export function InviteCard({ fellowship, qrSize = 170 }: { fellowship?: Fellowship | null; qrSize?: number; style?: unknown }) {
  if (!fellowship) return null;
  const code = fellowship.invite_code;
  return (
    <View style={inv.card}>
      <View style={inv.qr}>
        <QRCode value={`questbound://join/${code}`} size={qrSize} color={ink.ink} backgroundColor={ink.page} />
      </View>
      <T style={inv.code}>{code}</T>
      <View style={inv.row}>
        <Button small variant="secondary" label="Copy code" onPress={() => Clipboard.setStringAsync(code)} />
        <Button small variant="secondary" label="Share invite"
          onPress={() => Share.share({ message: `Join our fellowship on Questbound: code ${code}` })} />
      </View>
    </View>
  );
}

export function InviteSheet({ visible, onClose, fellowship, title = 'Summon your friends' }: {
  visible: boolean; onClose: () => void; fellowship?: Fellowship | null; title?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={inv.backdrop} onPress={onClose} />
      <View style={inv.sheet}>
        <T variant="title" center>{title}</T>
        <T variant="small" center style={{ marginBottom: space.md }}>They scan this, or type the code during onboarding.</T>
        <InviteCard fellowship={fellowship} />
        <Button label="Done" variant="ghost" onPress={onClose} style={{ marginTop: space.md }} />
      </View>
    </Modal>
  );
}
const inv = StyleSheet.create({
  card: { alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 2, borderColor: ink.ink, backgroundColor: ink.page },
  qr: { padding: space.sm, backgroundColor: ink.page },
  code: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42, letterSpacing: 6, color: ink.ink },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(33,26,59,0.4)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: ink.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 2, borderBottomWidth: 0, borderColor: ink.ink, padding: space.xl, paddingBottom: space.xxl,
  },
});

// ---------- MP: QrScanner (full-screen) ----------
// MP's API: <QrScanner onCode onCancel? onTypeCode? hint? />. Fires onCode once per mount (re-key to retry).
export function parseInviteCode(raw: string): string | null {
  const m = raw.trim().match(/join\/([A-Za-z0-9]{6})/) ?? raw.trim().match(/^([A-Za-z0-9]{6})$/);
  return m ? m[1].toUpperCase() : null;
}

export function QrScanner({ onCode, onCancel, onTypeCode, hint }: {
  onCode: (code: string) => void; onCancel?: () => void; onTypeCode?: () => void; hint?: string;
}) {
  const [perm, request] = useCameraPermissions();
  const fired = useRef(false);
  return (
    <View style={qr.full}>
      {perm?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            const code = parseInviteCode(data);
            if (code && !fired.current) { fired.current = true; onCode(code); }
          }}
        />
      ) : perm ? (
        <View style={qr.center}>
          <T variant="body" center color={ink.page}>Muse needs the camera to read the invite.</T>
          <Button label="Allow camera" variant="secondary" onPress={request} style={{ marginTop: space.md }} />
        </View>
      ) : null}
      {perm?.granted ? <View style={qr.frame} pointerEvents="none" /> : null}
      <View style={qr.bottom}>
        <T variant="bodyBold" center color={ink.page}>{hint ?? 'Point at your friend’s invite QR'}</T>
        <View style={qr.row}>
          {onTypeCode ? <Button small variant="secondary" label="Type the code" onPress={onTypeCode} /> : null}
          {onCancel ? <Button small variant="secondary" label="Cancel" onPress={onCancel} /> : null}
        </View>
      </View>
    </View>
  );
}
const qr = StyleSheet.create({
  full: { flex: 1, backgroundColor: ink.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  frame: { position: 'absolute', top: '28%', left: '15%', right: '15%', aspectRatio: 1, borderWidth: 4, borderColor: ink.gold, borderRadius: radius.lg },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.xl, paddingBottom: space.xxl * 1.5, gap: space.md },
  row: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
});

// ---------- AD: MissionTypeIcon ----------
const TYPE_EMOJI: Record<MissionType, string> = { gathering: '👥', duet: '🤝', relic: '🏺', bard: '🪶', trial: '❓', gift: '🎁' };
export const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  gathering: 'Gathering', duet: 'Duet', relic: 'Relic', bard: 'Bard', trial: 'Trial', gift: 'Gift',
};
export function MissionTypeIcon({ type, size = 24 }: { type: MissionType; size?: number; color?: string }) {
  return <T style={{ fontSize: size * 0.8, lineHeight: size }}>{TYPE_EMOJI[type]}</T>;
}
