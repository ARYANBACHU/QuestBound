// Owner: MP. Placeholder — replace entirely. See handoffs/MP.md
import { Text, View } from 'react-native';
import { ink } from '@/shared/theme';

export default function Screen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.paper }}>
      <Text style={{ color: ink.ink, fontSize: 20 }}>Friends</Text>
      <Text style={{ color: ink.muted, marginTop: 8 }}>Owner: MP</Text>
    </View>
  );
}
