// Owner: AB. Root stack. AB adds: font loading (Fraunces + Nunito), splash, onboarding gate.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="mission/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="join/[code]" />
      </Stack>
    </>
  );
}
