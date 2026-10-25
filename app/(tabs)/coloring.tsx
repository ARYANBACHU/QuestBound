// Owner: AD. The coloring page tab: the current chapter, its missions as regions, page turns between chapters.
'use no memo'; // mock store mutates rows in place; opt out of React Compiler auto-memo so updates always render
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFellowship } from '@/lib/fellowship';
import { useMissions, useStoryline } from '@/lib/game';
import { generateStoryline, submitProof } from '@/lib/api';
import { USE_MOCKS } from '@/lib/env';
import { SCREEN_GRADIENTS, ink, moodFor, radius, shadow, space } from '@/shared/theme';
import type { Mission, Page } from '@/shared/types';
import { ColoringPage, FILL_MS } from '@/components/coloring/ColoringPage';
import { ChapterHeader } from '@/components/coloring/ChapterHeader';
import { MissionSheet } from '@/components/coloring/MissionSheet';
import { BlankBook, ChapterRibbon, SageWriting, PageTurnOverlay, TheEndBanner } from '@/components/coloring/PageStates';
import { pageMissions, roman } from '@/components/coloring/pageUtils';
import { InkButton, Txt } from '@/components/coloring/ui';
import { Sage, SageSays } from '@/components/coloring/sage';
import { Celebration } from '@/components/coloring/Celebration';

const HOLD_MS = FILL_MS + 700; // let the last region's fill + sparkle play before the page turns

export default function ColoringScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const pageW = Math.min(screenW - 2 * space.lg, 560);

  const { fellowship, members } = useFellowship();
  const { storyline, pages, activePage, loading } = useStoryline(fellowship?.id ?? null);
  const { missions } = useMissions(storyline?.id ?? null);

  const [viewId, setViewId] = useState<string | null>(null); // null = follow the active page
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [summoning, setSummoning] = useState(false);
  const [summonError, setSummonError] = useState<string | null>(null);

  // ---- page turn state machine: hold (last fill plays) → turning (flip) → ribbon ----
  const [hold, setHold] = useState<Page | null>(null);
  const [turning, setTurning] = useState<{ page: Page; missions: Mission[] } | null>(null);
  const [ribbon, setRibbon] = useState<string | null>(null);
  const prevActive = useRef<Page | null>(null);
  const missionsRef = useRef(missions);
  missionsRef.current = missions;

  useEffect(() => {
    const prev = prevActive.current;
    prevActive.current = activePage;
    if (!prev || !activePage || prev.id === activePage.id) return;
    const prevNow = pages.find((p) => p.id === prev.id);
    if (prevNow?.status !== 'complete') return;
    setViewId(null);
    setHold(prevNow);
    const t = setTimeout(() => {
      setHold(null);
      setTurning({ page: prevNow, missions: pageMissions(missionsRef.current, prevNow) });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, HOLD_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage?.id]);

  const [party, setParty] = useState<{ kind: 'page' | 'book'; at: number } | null>(null);
  const onTurnDone = useCallback(() => {
    setTurning(null);
    const next = prevActive.current;
    if (next) setRibbon(`Chapter ${roman(next.chapter_number)} · ${next.title}`);
    setParty({ kind: 'page', at: Date.now() });
  }, []);
  useEffect(() => {
    if (!ribbon) return;
    const t = setTimeout(() => setRibbon(null), 2000);
    return () => clearTimeout(t);
  }, [ribbon]);

  const shown: Page | null = hold ?? (viewId ? pages.find((p) => p.id === viewId) ?? activePage : activePage);
  const shownMissions = pageMissions(missions, shown);
  const sheetMission = missions.find((m) => m.id === sheetId) ?? null;
  const bookDone = !!storyline && (storyline.status === 'complete' || (pages.length > 0 && pages.every((p) => p.status === 'complete')));

  // the book just finished while we watched → confetti for the whole fellowship (after the last fill plays)
  const wasDone = useRef<boolean | null>(null);
  useEffect(() => {
    const before = wasDone.current;
    wasDone.current = bookDone;
    if (before === false && bookDone) {
      const t = setTimeout(() => setParty({ kind: 'book', at: Date.now() }), HOLD_MS);
      return () => clearTimeout(t);
    }
  }, [bookDone]);

  const summon = async (mode: 'first' | 'sequel') => {
    if (!fellowship) return;
    setSummoning(true);
    setSummonError(null);
    try {
      await generateStoryline({ fellowship_id: fellowship.id, mode });
      setViewId(null);
    } catch (e) {
      setSummonError(e instanceof Error ? 'Sage dropped the quill.' : 'Something went wrong.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } finally {
      setSummoning(false);
    }
  };

  // dev helper (mock mode): complete a random open mission on the active page
  const devColor = async () => {
    const open = pageMissions(missions, activePage).filter((m) => m.status === 'open' || m.status === 'pending');
    const m = open[Math.floor(Math.random() * open.length)];
    if (!m) return;
    await submitProof({ mission_id: m.id, participant_ids: members.slice(0, Math.max(1, m.required_members)).map((x) => x.user_id), proof_text: 'dev' });
  };

  // ---------------- states ----------------
  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={styles.fill}>
        <Sage expression="thinking" size="md" />
        <ActivityIndicator color={ink.ink} />
        <Txt v="story" center>Opening your book…</Txt>
      </View>
    );
  } else if (!fellowship) {
    body = (
      <View style={styles.fill}>
        <SageSays expression="sleepy" size="md" title="No fellowship, no tale." line="I write for a band of friends. Gather yours first." />
        <InkButton label="Find your fellowship" onPress={() => router.push('/(tabs)/friends')} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  } else if (summoning || storyline?.status === 'generating') {
    body = <SageWriting width={pageW} />;
  } else if (!storyline || !shown) {
    body = <BlankBook width={pageW} onSummon={() => summon('first')} loading={summoning} error={summonError} />;
  } else {
    const isLocked = shown.status === 'locked';
    body = (
      <>
        <ChapterHeader bookTitle={storyline.title} page={shown} missions={shownMissions} members={members} />
        <View style={styles.pageWrap}>
          <View style={[styles.paperShadow, { width: pageW }]}>
            <ColoringPage
              key={shown.id}
              templateId={shown.template_id}
              missions={shownMissions}
              members={members}
              locked={isLocked}
              interactive={!isLocked}
              width={pageW}
              highlightRegionId={sheetMission?.region_id ?? null}
              onRegionPress={(missionId) => setSheetId(missionId)}
            />
            {isLocked && (
              <View style={[StyleSheet.absoluteFill, styles.lockedNote]} pointerEvents="none">
                <View style={styles.lockedPill}>
                  <Txt v="bodyBold" center>Unlocks when Chapter {roman(shown.chapter_number - 1)} is colored</Txt>
                </View>
              </View>
            )}
            {turning && (
              <PageTurnOverlay onDone={onTurnDone}>
                <ColoringPage templateId={turning.page.template_id} missions={turning.missions} members={members} interactive={false} animate={false} width={pageW} />
              </PageTurnOverlay>
            )}
          </View>
          {ribbon && <ChapterRibbon text={ribbon} />}
        </View>

        <ChapterNav pages={pages} shownId={shown.id} activeId={activePage?.id ?? null} onPick={(id) => setViewId(id === activePage?.id ? null : id)} />

        {bookDone && !hold && !turning && (
          <TheEndBanner onOpenStorybook={() => router.push('/(tabs)/storybook')} onSequel={() => summon('sequel')} loading={summoning} />
        )}
        {summonError && bookDone ? <Txt v="small" color={ink.danger} center>{summonError} Try again in a moment.</Txt> : null}

        {USE_MOCKS && __DEV__ && shown.id === activePage?.id && !bookDone && (
          <Pressable onPress={devColor} style={styles.dev} accessibilityRole="button">
            <Txt v="small" color={ink.muted}>Dev: color a random region</Txt>
          </Pressable>
        )}
      </>
    );
  }

  const mood = moodFor(shown?.template_id);
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LinearGradient colors={SCREEN_GRADIENTS[mood.id]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl * 2, flexGrow: 1 }}>{body}</ScrollView>
      {party && <Celebration key={party.at} kind={party.kind} onDone={() => setParty(null)} />}
      <MissionSheet mission={sheetMission} page={pages.find((p) => p.id === sheetMission?.page_id) ?? null} members={members} onClose={() => setSheetId(null)} />
    </View>
  );
}

function ChapterNav({ pages, shownId, activeId, onPick }: { pages: Page[]; shownId: string; activeId: string | null; onPick: (id: string) => void }) {
  const idx = pages.findIndex((p) => p.id === shownId);
  if (pages.length < 2) return null;
  const go = (d: number) => {
    const p = pages[idx + d];
    if (p) onPick(p.id);
  };
  return (
    <View style={styles.nav}>
      <Pressable onPress={() => go(-1)} disabled={idx <= 0} hitSlop={12} accessibilityLabel="Previous chapter" style={[styles.arrow, idx <= 0 && { opacity: 0.3 }]}>
        <Txt v="heading">‹</Txt>
      </Pressable>
      {pages.map((p) => {
        const shown = p.id === shownId;
        return (
          <Pressable key={p.id} onPress={() => onPick(p.id)} hitSlop={8} accessibilityLabel={`Chapter ${p.chapter_number}: ${p.title}, ${p.status}`}>
            <View
              style={[
                styles.dot,
                p.status === 'complete' && { backgroundColor: ink.ink },
                p.id === activeId && p.status !== 'complete' && { borderColor: ink.gold, backgroundColor: ink.page },
                p.status === 'locked' && { borderColor: ink.muted, borderStyle: 'dashed' },
                shown && styles.dotShown,
              ]}
            >
              <Txt v="smallBold" color={p.status === 'complete' ? ink.page : p.status === 'locked' ? ink.muted : ink.ink}>{roman(p.chapter_number)}</Txt>
            </View>
          </Pressable>
        );
      })}
      <Pressable onPress={() => go(1)} disabled={idx >= pages.length - 1} hitSlop={12} accessibilityLabel="Next chapter" style={[styles.arrow, idx >= pages.length - 1 && { opacity: 0.3 }]}>
        <Txt v="heading">›</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ink.paper },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl, minHeight: 400 },
  pageWrap: { alignItems: 'center' },
  paperShadow: { borderRadius: radius.sm, overflow: 'visible', backgroundColor: ink.page, ...shadow.md },
  lockedNote: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
  lockedPill: { backgroundColor: ink.page, borderWidth: 2.5, borderColor: ink.ink, borderRadius: radius.md, padding: space.md },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, marginTop: space.lg },
  arrow: { paddingHorizontal: space.sm },
  dot: {
    minWidth: 34, height: 34, borderRadius: 17, borderWidth: 2.5, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  dotShown: { transform: [{ scale: 1.15 }] },
  dev: { alignSelf: 'center', marginTop: space.lg, padding: space.sm },
});
