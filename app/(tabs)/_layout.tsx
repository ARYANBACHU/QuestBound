// Owner: AB. Five tabs with the custom coloring-book tab bar, plus Muse (FAB, sheet, coach marks, demo tools).
import { Tabs, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DemoTools } from '@/components/shell/DemoTools';
import { TAB_BAR_HEIGHT, TabBar } from '@/components/shell/TabBar';
import { CoachMark } from '@/components/wizard/CoachMark';
import { screenFromPath } from '@/components/wizard/screens';
import { WizardFab } from '@/components/wizard/WizardFab';
import { WizardProvider } from '@/components/wizard/WizardProvider';
import { WizardSheet } from '@/components/wizard/WizardSheet';
import { ink, space } from '@/shared/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const screen = screenFromPath(usePathname());
  const fabBottom = TAB_BAR_HEIGHT + Math.max(insets.bottom, space.sm) + space.md;

  return (
    <WizardProvider>
      <View style={styles.root}>
        <Tabs
          tabBar={(props) => <TabBar {...props} />}
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: ink.paper } }}
        >
          <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
          <Tabs.Screen name="missions" options={{ title: 'Missions' }} />
          <Tabs.Screen name="coloring" options={{ title: 'Page' }} />
          <Tabs.Screen name="storybook" options={{ title: 'Storybook' }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        </Tabs>
        <CoachMark screen={screen} bottom={fabBottom} />
        <WizardFab bottom={fabBottom} />
        <WizardSheet />
        <DemoTools />
      </View>
    </WizardProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: ink.paper } });
