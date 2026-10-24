// Owner: AB. ONE place for teammates' components. Until MP (components/friends) and AD (components/coloring)
// land on main, these are tiny local fallbacks with the same props. Swap to re-exports after the merge:
//   export { Crest } from '@/components/friends/Crest'; etc.
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { useRef } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { FellowshipMember, MissionType } from '@/shared/types';
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

// ---------- MP: InviteSheet (inline card) ----------
export function InviteSheet({ code, name }: { code: string; name?: string }) {
  return (
    <View style={inv.card}>
      <View style={inv.qr}>
        <QRCode value={`questbound://join/${code}`} size={150} color={ink.ink} backgroundColor={ink.page} />
      </View>
      <T style={inv.code}>{code}</T>
      <View style={inv.row}>
        <Button small variant="secondary" label="Copy code" onPress={() => Clipboard.setStringAsync(code)} />
        <Button small variant="secondary" label="Share invite"
          onPress={() => Share.share({ message: `Join ${name ?? 'our fellowship'} on Questbound: code ${code}` })} />
      </View>
    </View>
  );
}
const inv = StyleSheet.create({
  card: { alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 2, borderColor: ink.ink, backgroundColor: ink.page },
  qr: { padding: space.sm, backgroundColor: ink.page },
  code: { fontFamily: fonts.display, fontSize: 34, letterSpacing: 6, color: ink.ink },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', justifyContent: 'center' },
});

// ---------- MP: QrScanner ----------
export function parseInviteCode(raw: string): string | null {
  const m = raw.trim().match(/join\/([A-Za-z0-9]{6})/) ?? raw.trim().match(/^([A-Za-z0-9]{6})$/);
  return m ? m[1].toUpperCase() : null;
}

export function QrScanner({ onCode, onCancel }: { onCode: (code: string) => void; onCancel?: () => void }) {
  const [perm, request] = useCameraPermissions();
  const fired = useRef(false);
  if (!perm) return <View style={qr.box} />;
  if (!perm.granted) {
    return (
      <View style={[qr.box, qr.center]}>
        <T variant="body" center color={ink.page}>Muse needs the camera to read the invite.</T>
        <Button label="Allow camera" onPress={request} style={{ marginTop: space.md }} />
        {onCancel ? <Button label="Type the code instead" variant="ghost" onPress={onCancel} /> : null}
      </View>
    );
  }
  return (
    <View style={qr.box}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          const code = parseInviteCode(data);
          if (code && !fired.current) { fired.current = true; onCode(code); }
        }}
      />
      <View style={qr.frame} pointerEvents="none" />
    </View>
  );
}
const qr = StyleSheet.create({
  box: { height: 280, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: ink.ink, borderWidth: 2.5, borderColor: ink.ink },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.lg },
  frame: { position: 'absolute', top: 50, left: 50, right: 50, bottom: 50, borderWidth: 3, borderColor: ink.gold, borderRadius: radius.md },
});

// ---------- AD: MissionTypeIcon ----------
const TYPE_EMOJI: Record<MissionType, string> = { gathering: '👥', duet: '🤝', relic: '🏺', bard: '🪶', trial: '❓', gift: '🎁' };
export const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  gathering: 'Gathering', duet: 'Duet', relic: 'Relic', bard: 'Bard', trial: 'Trial', gift: 'Gift',
};
export function MissionTypeIcon({ type, size = 24 }: { type: MissionType; size?: number; color?: string }) {
  return <T style={{ fontSize: size * 0.8, lineHeight: size }}>{TYPE_EMOJI[type]}</T>;
}
