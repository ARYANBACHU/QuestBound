// Owner: AB. Muse's round lavender avatar with a soft gold ring.
import { StyleSheet, View } from 'react-native';
import { ink } from '@/shared/theme';
import { T } from '@/components/shell/T';

export function MuseAvatar({ size = 44 }: { size?: number }) {
  return (
    <View style={[styles.ring, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}>
      <View style={[styles.inner, { width: size, height: size, borderRadius: size / 2 }]}>
        <T style={{ fontSize: size * 0.55, lineHeight: size * 0.7 }}>🧙</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderWidth: 3, borderColor: ink.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.page },
  inner: { backgroundColor: ink.lavenderMist, borderWidth: 2, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center' },
});
