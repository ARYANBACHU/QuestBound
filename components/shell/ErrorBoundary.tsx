// Owner: AB. Never crash in front of a judge (B1). Three nets:
//   1. <AppErrorBoundary> wraps the whole root stack (render errors anywhere, incl. providers).
//   2. `RouteErrorBoundary` is exported as `ErrorBoundary` from route files (Expo Router) — a broken screen keeps
//      the rest of the app alive and "tap to recover" just re-renders that screen.
//   3. installCrashNet(): fatal JS errors outside render (event handlers, timers) show the same recovery screen
//      instead of killing the app. Non-fatal errors go to the default handler as before.
// Recovery = clear the error, remount, and send the gate ('/') to pick the right screen again.
import { router, type ErrorBoundaryProps } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ink, panel, space, ui } from '@/shared/theme';
import { Sage } from '@/components/wizard/Sage';
import { Button } from './Button';
import { T } from './T';

// ---------- the friendly screen ----------
export function AwryScreen({ error, onRecover }: { error?: Error | null; onRecover: () => void }) {
  const [details, setDetails] = useState(false);
  useEffect(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); }, []);
  return (
    <SafeAreaView style={styles.root}>
      <Pressable style={styles.center} onPress={onRecover} accessibilityRole="button" accessibilityLabel="Something went awry. Tap to recover">
        <Sage expression="surprised" size={140} silent />
        <View style={styles.card}>
          <T variant="title" center>Something went awry</T>
          <T variant="story" center>A page slipped out of the book. Your fellowship’s progress is safe.</T>
        </View>
        <Button label="Tap to recover" tone="gold" sfx="open" onPress={onRecover} style={styles.button} />
        {error ? (
          <Pressable onPress={() => setDetails((d) => !d)} hitSlop={8} accessibilityRole="button">
            <T variant="small" center color={ink.muted}>{details ? error.message.slice(0, 240) : 'What happened?'}</T>
          </Pressable>
        ) : null}
      </Pressable>
    </SafeAreaView>
  );
}

function goHome() {
  setTimeout(() => { try { router.replace('/'); } catch { /* router not ready — the remount already reset it */ } }, 0);
}

// ---------- 1. root boundary ----------
type State = { error: Error | null; key: number };

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, key: 0 };
  private unsub: (() => void) | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[Questbound] caught by AppErrorBoundary:', error);
  }

  componentDidMount() {
    this.unsub = onFatal((error) => this.setState({ error }));
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  recover = () => {
    this.setState((s) => ({ error: null, key: s.key + 1 }));
    goHome();
  };

  render() {
    if (this.state.error) return <AwryScreen error={this.state.error} onRecover={this.recover} />;
    return <View key={this.state.key} style={styles.fill}>{this.props.children}</View>;
  }
}

// ---------- 2. per-route boundary (export { RouteErrorBoundary as ErrorBoundary } from a route file) ----------
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { console.error('[Questbound] screen error:', error); }, [error]);
  return <AwryScreen error={error} onRecover={() => { retry().catch(() => goHome()); }} />;
}

// ---------- 3. crash net for errors outside render ----------
const fatalListeners = new Set<(e: Error) => void>();
function onFatal(fn: (e: Error) => void) {
  fatalListeners.add(fn);
  return () => { fatalListeners.delete(fn); };
}

let installed = false;
export function installCrashNet() {
  if (installed) return;
  installed = true;
  const EU = (globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } }).ErrorUtils;
  if (!EU?.setGlobalHandler) return;
  const previous = EU.getGlobalHandler();
  EU.setGlobalHandler((e, isFatal) => {
    if (isFatal && fatalListeners.size) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error('[Questbound] fatal error caught by the crash net:', err);
      fatalListeners.forEach((f) => f(err));
      return; // shown as "Something went awry" instead of killing the app
    }
    previous(e, isFatal);
  });
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, backgroundColor: ink.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg },
  card: {
    backgroundColor: panel.parchment, borderWidth: panel.borderWidth, borderColor: panel.border, borderRadius: ui.cardRadius,
    padding: space.lg, gap: space.sm, maxWidth: 360,
  },
  button: { alignSelf: 'stretch', maxWidth: 360, width: '100%' },
});
