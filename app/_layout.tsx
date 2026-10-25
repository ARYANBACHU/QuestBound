// Owner: AB. Root stack: fonts + splash, providers (gesture root, safe area), sound (sfx preload + bards), routes,
// and the crash nets (AppErrorBoundary + installCrashNet → "Something went awry — tap to recover").
import { Fraunces_400Regular_Italic, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary, installCrashNet } from '@/components/shell/ErrorBoundary';
import { MusicController } from '@/components/shell/music';
import { preloadSfx } from '@/components/shell/sfx';
import { ink } from '@/shared/theme';
import { installWebFrame } from '@/lib/webFrame';

installWebFrame(); // web: phone-width column on desktop (no-op on iOS/Android)
SplashScreen.preventAutoHideAsync().catch(() => {});
preloadSfx();
installCrashNet();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Fraunces_400Regular_Italic, Fraunces_700Bold, Nunito_400Regular, Nunito_700Bold });
  const ready = loaded || !!error; // never get stuck on the splash if a font fails — system font is fine

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <MusicController />
        <AppErrorBoundary>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: ink.paper } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="mission/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="join/[code]" />
        </Stack>
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: ink.paper } });
