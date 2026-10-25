// Owner: MP. Deep-link landing for questbound://join/<CODE>: sign in, join, then onboarding or the Friends tab.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { haptic } from '@/components/friends/haptics';
import { fonts, ink, radius, space, type } from '@/shared/theme';
import { sessionStore } from '@/lib/session';
import { normalizeInviteCode, useFellowship } from '@/lib/fellowship';
import { supabase } from '@/lib/supabase';
import { USE_MOCKS } from '@/lib/env';
import { mock } from '@/lib/mockStore';

type Phase = 'joining' | 'error';

/** Peek at the fellowship name so the loading state can say "Joining the Lantern Fellowship…". */
async function peekName(code: string): Promise<string | null> {
  if (USE_MOCKS) return mock.fellowship.invite_code === code ? mock.fellowship.name : null;
  const { data } = await supabase.from('fellowships').select('name').eq('invite_code', code).maybeSingle();
  return (data?.name as string | undefined) ?? null;
}

export default function JoinScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const { joinByCode } = useFellowship();
  const [code, setCode] = useState(() => normalizeInviteCode(String(params.code ?? '')));
  const [phase, setPhase] = useState<Phase>('joining');
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef<string | null>(null);

  const run = useCallback(
    async (c: string) => {
      setPhase('joining');
      setError(null);
      try {
        await sessionStore.ensureSignedIn();
        peekName(c).then(setName).catch(() => {});
        await joinByCode(c);
        haptic.success();
        // The profile may still be loading right after a fresh anonymous sign-in.
        if (!sessionStore.get().profile) await sessionStore.refresh();
        const onboarded = sessionStore.get().profile?.onboarded ?? false;
        router.replace(onboarded ? '/(tabs)/friends' : '/onboarding');
      } catch (e) {
        haptic.warning();
        setError(e instanceof Error ? e.message : 'Sage could not open the gate. Try again.');
        setPhase('error');
      }
    },
    [joinByCode],
  );

  useEffect(() => {
    if (!code || started.current === code) return;
    started.current = code;
    void run(code);
  }, [code, run]);

  if (phase === 'joining') {
    return (
      <View style={[styles.screen, styles.center]}>
        <View style={styles.scroll}>
          <Text style={styles.emoji}>📜</Text>
          <Text style={styles.title}>{name ? `Joining ${name}…` : 'Joining the fellowship…'}</Text>
          <Text style={styles.body}>Sage is writing your name into the book.</Text>
          <ActivityIndicator color={ink.ink} style={{ marginTop: space.lg }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, styles.center]}>
      <View style={styles.scroll}>
        <Text style={styles.emoji}>🔮</Text>
        <Text style={styles.title}>The gate stayed shut</Text>
        <Text style={styles.body}>{error}</Text>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(normalizeInviteCode(t).slice(0, 6))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          placeholder="ABC123"
          placeholderTextColor={ink.muted}
          style={styles.input}
          onSubmitEditing={() => code.length >= 4 && run(code)}
        />
        <Pressable
          disabled={code.length < 4}
          onPress={() => run(code)}
          style={({ pressed }) => [styles.btn, code.length < 4 && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/')} style={styles.link}>
          <Text style={styles.linkText}>Back to the start</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ink.paper, padding: space.xl },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: ink.page,
    borderWidth: 3,
    borderColor: ink.ink,
    borderRadius: radius.lg,
    padding: space.xl,
  },
  emoji: { fontSize: 52, marginBottom: space.sm },
  title: { fontFamily: fonts.display, fontSize: type.title, color: ink.ink, textAlign: 'center' },
  body: { fontFamily: fonts.displayItalic, fontSize: type.body, color: ink.inkSoft, textAlign: 'center', marginTop: space.sm, lineHeight: 22 },
  input: {
    marginTop: space.lg,
    alignSelf: 'stretch',
    borderWidth: 3,
    borderColor: ink.ink,
    borderRadius: radius.md,
    paddingVertical: space.md,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: 6,
    color: ink.ink,
    backgroundColor: ink.paper,
  },
  btn: { marginTop: space.md, alignSelf: 'stretch', borderRadius: radius.pill, backgroundColor: ink.ink, paddingVertical: space.md, alignItems: 'center' },
  btnText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.page },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  link: { marginTop: space.md, padding: space.sm },
  linkText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.inkSoft },
});
