// Owner: AB. Entry gate: sign in -> onboarding (profile) -> onboarding (fellowship) -> summon -> tabs.
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/shell/Button';
import { ParchmentLoading } from '@/components/shell/ParchmentLoading';
import { T } from '@/components/shell/T';
import { useFellowship } from '@/lib/fellowship';
import { useStoryline } from '@/lib/game';
import { useSession } from '@/lib/session';
import { ink, space } from '@/shared/theme';

export default function Index() {
  const router = useRouter();
  const session = useSession();
  const fellowship = useFellowship();
  const story = useStoryline(fellowship.fellowship?.id ?? null);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const routed = useRef(false);

  useEffect(() => {
    let alive = true;
    setError(null);
    (async () => {
      try {
        await session.ensureSignedIn();
        await Promise.all([session.refresh(), fellowship.refresh()]);
        if (alive) setSignedIn(true);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    if (!signedIn || routed.current || session.loading || fellowship.loading) return;
    if (!session.profile?.onboarded) {
      routed.current = true;
      router.replace('/onboarding');
    } else if (!fellowship.fellowship) {
      routed.current = true;
      router.replace({ pathname: '/onboarding', params: { step: 'fellowship' } });
    } else if (story.loading) {
      return;
    } else if (!story.storyline) {
      routed.current = true;
      router.replace({ pathname: '/onboarding', params: { step: 'summon' } });
    } else {
      routed.current = true;
      router.replace('/(tabs)/coloring');
    }
  }, [signedIn, session.loading, session.profile, fellowship.loading, fellowship.fellowship, story.loading, story.storyline, router]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: ink.paper, justifyContent: 'center', padding: space.xl, gap: space.lg }}>
        <T variant="title" center>The gate is stuck</T>
        <T variant="body" center color={ink.inkSoft}>
          Muse couldn't reach the kingdom. Check your connection and try again.
        </T>
        <T variant="small" center color={ink.muted}>{error}</T>
        <Button label="Try again" onPress={() => setAttempt((n) => n + 1)} />
      </View>
    );
  }
  return <ParchmentLoading line="Opening the book…" />;
}
