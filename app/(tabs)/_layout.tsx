// Owner: AB. Five tabs. AB replaces the default tab bar with the custom parchment bar + Muse Wizard FAB.
import { Tabs } from 'expo-router';
import { ink } from '@/shared/theme';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: ink.ink, tabBarInactiveTintColor: ink.muted }}>
      <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
      <Tabs.Screen name="missions" options={{ title: 'Missions' }} />
      <Tabs.Screen name="coloring" options={{ title: 'Page' }} />
      <Tabs.Screen name="storybook" options={{ title: 'Storybook' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
