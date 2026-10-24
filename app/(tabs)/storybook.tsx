// Owner: AD. Placeholder — replace entirely. See handoffs/AD.md
import { Text, View } from 'react-native';
import { ink } from '@/shared/theme';

export default function Screen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.paper }}>
      <Text style={{ color: ink.ink, fontSize: 20 }}>Storybook</Text>
      <Text style={{ color: ink.muted, marginTop: 8 }}>Owner: AD</Text>
    </View>
  );
}
