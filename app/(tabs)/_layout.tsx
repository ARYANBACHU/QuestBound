// Owner: AB. Five tabs with the custom coloring-book tab bar, plus Sage (FAB, sheet, coach marks, demo tools).
import { Tabs, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProclamationToast from '@/components/friends/ProclamationToast';
import { DemoTools } from '@/components/shell/DemoTools';
import { FloatingMusicToggle } from '@/components/shell/music';
import { NewBookProvider } from '@/components/shell/NewBook';
import { TAB_BAR_HEIGHT, TabBar } from '@/components/shell/TabBar';
import { CoachMark } from '@/components/wizard/CoachMark';
import { screenFromPath } from '@/components/wizard/screens';
import { FAB_SIZE, WizardFab } from '@/components/wizard/WizardFab';
import { WizardProvider } from '@/components/wizard/WizardProvider';
import { WizardSheet } from '@/components/wizard/WizardSheet';
import { ink, space } from '@/shared/theme';

// A broken screen shows Sage's "Something went awry — tap to recover" instead of crashing (B1).
export { RouteErrorBoundary as ErrorBoundary } from '@/components/shell/ErrorBoundary';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const screen = screenFromPath(usePathname());
  // Friends has a chat composer pinned above the tab bar — float Sage above it so Send stays reachable.
  const lift = screen === 'friends' ? FRIENDS_COMPOSER_HEIGHT : 0;
  const fabBottom = TAB_BAR_HEIGHT + Math.max(insets.bottom, space.sm) + space.md + lift;

  return (
    <WizardProvider>
      <View style={styles.root}>
        <NewBookProvider>
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
        {/* MP: friends' progress banner on every tab (hides itself on Friends); keeps chat Presence alive app-wide. */}
        <ProclamationToast />
        {/* U6: music toggle at the top — fallback for tabs whose header doesn't render <HeaderMusicToggle /> yet */}
        <FloatingMusicToggle visible={FLOATING_MUSIC.has(screen)} />
        <CoachMark screen={screen} bottom={fabBottom + FAB_SIZE + space.sm} />
        <WizardFab bottom={fabBottom} />
        <WizardSheet />
        <DemoTools />
        </NewBookProvider>
      </View>
    </WizardProvider>
  );
}

const FRIENDS_COMPOSER_HEIGHT = 92;
/** Tabs with free space top-right (Friends has Invite there — MP adds <HeaderMusicToggle /> beside it). */
const FLOATING_MUSIC = new Set(['coloring', 'storybook']);

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: ink.paper } });
