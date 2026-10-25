// Owner: AB. Missions board. Focal point: the chapter's missions. Header = book title + chapter selector (I · II · III…)
// + one progress line; the leaderboard is one compact strip; secondary actions (New storyline, Ask Sage) live in "…".
// Any unlocked/completed chapter can be browsed read-only; defaults to the active chapter.
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionMenu } from '@/components/shell/ActionMenu';
import { CoachTarget } from '@/components/wizard/coachTargets';
import { HeaderMusicToggle } from '@/components/shell/music';
import { Button } from '@/components/shell/Button';
import { MissionCard } from '@/components/shell/MissionCard';
import {
  GROUP_TITLES, completerColor, missionGroup, orderedPageMissions, pointsByMember, roman, type MissionGroup,
} from '@/components/shell/missionUtils';
import { useNewBook } from '@/components/shell/NewBook';
import { ParchmentLoading } from '@/components/shell/ParchmentLoading';
import { T } from '@/components/shell/T';
import { TAB_CONTENT_BOTTOM_PAD } from '@/components/shell/TabBar';
import { Crest } from '@/components/shell/teammates';
import { SageBubble } from '@/components/wizard/SageBubble';
import { useWizard } from '@/components/wizard/WizardProvider';
import { useFellowship } from '@/lib/fellowship';
import { useMissions, useStoryline } from '@/lib/game';
import { useSession } from '@/lib/session';
import type { Mission, Page } from '@/shared/types';
import { SCREEN_GRADIENTS, accent, ink, moodFor, panel, radius, shadow, space } from '@/shared/theme';
import { playSfx } from '@/components/shell/sfx';

type Filter = 'all' | 'mine' | 'open' | 'done';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'mine', label: 'Mine' }, { id: 'open', label: 'Open' }, { id: 'done', label: 'Done' },
];

export default function MissionsScreen() {
  const { userId } = useSession();
  const fs = useFellowship();
  const wizard = useWizard();
  const { storyline, pages, activePage, loading: storyLoading } = useStoryline(fs.fellowship?.id ?? null);
  const { missions, loading: missionsLoading } = useMissions(storyline?.id ?? null);
  const [filter, setFilter] = useState<Filter>('all');
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { openNewBook } = useNewBook();

  // Follow the active chapter unless the player picked another one (reset when the active page changes).
  useEffect(() => { setChapterId(null); }, [activePage?.id]);
  const viewed: Page | null = pages.find((p) => p.id === chapterId) ?? activePage;
  const readOnly = !!viewed && viewed.id !== activePage?.id;
  const mood = moodFor(viewed?.template_id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fs.refresh(); } catch {} finally { setRefreshing(false); }
  }, [fs]);

  const pageMissions = useMemo(() => (viewed ? orderedPageMissions(viewed, missions) : []), [viewed, missions]);
  const filtered = useMemo(() => pageMissions.filter((m) => matches(m, filter, userId)), [pageMissions, filter, userId]);
  const grouped = useMemo(() => {
    const g: Record<MissionGroup, Mission[]> = { whole: [], pairs: [], solo: [] };
    filtered.forEach((m) => g[missionGroup(m)].push(m));
    return g;
  }, [filtered]);
  const firstCardId = (['whole', 'pairs', 'solo'] as MissionGroup[]).map((g) => grouped[g][0]).find(Boolean)?.id;
  const leaders = useMemo(() => pointsByMember(missions, fs.members), [missions, fs.members]);

  const menu = [
    { label: 'Ask Sage what to do next', icon: '🧙', onPress: () => wizard.open('What should we do next?') },
    { label: 'New storyline…', icon: '📖', onPress: () => openNewBook() },
  ];

  if ((storyLoading || missionsLoading || fs.loading) && !storyline) return <ParchmentLoading line="Unrolling the quest board…" />;

  if (!storyline || !viewed || storyline.status === 'generating') {
    const writing = storyline?.status === 'generating';
    return (
      <LinearGradient colors={SCREEN_GRADIENTS.castle} style={styles.fill}>
        <SafeAreaView style={styles.fill} edges={['top']}>
          <View style={styles.empty}>
            <SageBubble
              layout="stack"
              sageSize={140}
              expression={writing ? 'thinking' : 'idle'}
              text={writing ? 'Hush — I’m still writing your book. The missions appear the moment the ink dries.'
                : 'No missions yet. Summon a story and I’ll write you some.'}
            />
            {!writing ? <Button label="Summon our story" tone="gold" onPress={() => openNewBook()} /> : null}
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const coloredCount = pageMissions.filter((m) => m.status === 'complete').length;
  const total = pageMissions.length;

  return (
    <LinearGradient colors={SCREEN_GRADIENTS[mood.id]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ink.ink} />}
        >
          {/* Header: book + chapter selector */}
          <View style={styles.headRow}>
            <View style={styles.fill}>
              <T variant="small" color={ink.inkSoft} numberOfLines={1}>{fs.fellowship?.name} · Book {roman(storyline.book_number)}</T>
              <T variant="title" numberOfLines={2}>{storyline.title}</T>
            </View>
            <HeaderMusicToggle />
            <ActionMenu items={menu} />
          </View>

          <CoachTarget id="missions.chapters" style={styles.bleed}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chapters}>
            {pages.map((p) => {
              const on = p.id === viewed.id;
              const locked = p.status === 'locked';
              const m = moodFor(p.template_id);
              return (
                <Pressable
                  key={p.id}
                  disabled={locked}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); playSfx('tap'); setChapterId(p.id === activePage?.id ? null : p.id); }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on, disabled: locked }}
                  accessibilityLabel={`Chapter ${p.chapter_number}${locked ? ', sealed' : p.status === 'complete' ? ', complete' : ''}`}
                  style={[styles.chapter, on && { backgroundColor: m.deep, borderColor: m.deep }, locked && styles.chapterLocked]}
                >
                  <T variant="bodyBold" color={on ? m.onDeep : locked ? ink.muted : ink.ink}>
                    {locked ? '🔒' : p.status === 'complete' ? '✓ ' : ''}{roman(p.chapter_number)}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
          </CoachTarget>

          <T variant="story" color={ink.ink}>Chapter {roman(viewed.chapter_number)}: {viewed.title}</T>
          <View style={styles.progressRow} accessibilityLabel={`${coloredCount} of ${total} regions colored`}>
            {pageMissions.map((m) => {
              const c = completerColor(m, fs.members);
              return <View key={m.id} style={[styles.seg, c ? { backgroundColor: c } : m.status === 'pending' ? styles.segPending : null]} />;
            })}
          </View>
          <T variant="small">
            {readOnly
              ? `A finished chapter — ${coloredCount} of ${total} regions colored. Read-only.`
              : coloredCount === total && total ? 'Every region is colored — turn the page!' : `${coloredCount} of ${total} regions colored`}
          </T>

          {/* Leaderboard: one compact strip */}
          {leaders.length > 1 ? (
            <CoachTarget id="missions.leaders" style={styles.bleed}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leaders}>
              {leaders.map(({ member, points }, i) => member.profile ? (
                <View key={member.user_id} style={[styles.leader, member.user_id === userId && { backgroundColor: mood.tintStrong }]}>
                  <Crest crest={member.profile.crest} color={member.profile.color} size={24} />
                  <T variant="smallBold" numberOfLines={1}>
                    {i === 0 && points > 0 ? '👑 ' : ''}{member.user_id === userId ? 'You' : member.profile.display_name} · {points}
                  </T>
                </View>
              ) : null)}
            </ScrollView>
            </CoachTarget>
          ) : null}

          {/* Filters (active chapter only) */}
          {!readOnly ? (
            <View style={styles.filters}>
              {FILTERS.map((f) => {
                const on = filter === f.id;
                return (
                  <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[styles.filter, on && styles.filterOn]}
                    accessibilityRole="tab" accessibilityState={{ selected: on }}>
                    <T variant="smallBold" color={on ? accent.onPrimary : ink.ink}>{f.label}</T>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Sections */}
          {filtered.length === 0 ? (
            <View style={styles.none}>
              <SageBubble
                sageSize={64}
                expression="thinking"
                text={filter === 'done' ? 'Nothing colored yet. The first stroke is the bravest.'
                  : filter === 'mine' ? 'Nothing is yours alone right now — the pairs and gatherings need you!'
                  : filter === 'open' ? 'Every mission here is done or waiting. Splendid work.'
                  : 'I haven’t inked these missions yet.'}
              />
            </View>
          ) : (
            (['whole', 'pairs', 'solo'] as MissionGroup[]).map((g) => grouped[g].length ? (
              <View key={g} style={styles.section}>
                <View style={styles.sectionHead}>
                  <T variant="heading">{GROUP_TITLES[g].title}</T>
                  <T variant="small">{GROUP_TITLES[g].sub}</T>
                </View>
                <View style={{ gap: space.md }}>
                  {grouped[g].map((m) => m.id === firstCardId ? (
                    <CoachTarget key={m.id} id="missions.firstCard">
                      <MissionCard mission={m} members={fs.members} page={viewed} mood={mood} />
                    </CoachTarget>
                  ) : <MissionCard key={m.id} mission={m} members={fs.members} page={viewed} mood={mood} />)}
                </View>
              </View>
            ) : null)
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function matches(m: Mission, f: Filter, me: string | null): boolean {
  switch (f) {
    case 'all': return true;
    case 'mine': return m.assignee_ids.length === 0 || (!!me && m.assignee_ids.includes(me));
    case 'open': return m.status === 'open' || m.status === 'pending';
    case 'done': return m.status === 'complete';
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: space.lg, paddingBottom: TAB_CONTENT_BOTTOM_PAD, gap: space.xs },
  empty: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.xl },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  bleed: { marginHorizontal: -space.lg, flexGrow: 0 },
  chapters: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
  chapter: {
    minWidth: 48, height: 40, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 2, borderColor: ink.ink,
    backgroundColor: ink.page, alignItems: 'center', justifyContent: 'center',
  },
  chapterLocked: { borderColor: ink.muted, borderStyle: 'dashed', backgroundColor: 'transparent' },
  progressRow: { flexDirection: 'row', gap: 4, marginTop: space.sm, marginBottom: space.xs },
  seg: { flex: 1, height: 14, borderRadius: 5, borderWidth: 2, borderColor: ink.ink, backgroundColor: ink.page },
  segPending: { backgroundColor: accent.goldSoft },
  leaders: { gap: space.sm, paddingTop: space.md, paddingHorizontal: space.lg },
  leader: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs, borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill,
    paddingVertical: 3, paddingLeft: 4, paddingRight: space.md, backgroundColor: panel.parchment,
  },
  filters: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  filter: {
    borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill, paddingVertical: space.xs + 2, paddingHorizontal: space.md,
    backgroundColor: ink.page,
  },
  filterOn: { backgroundColor: accent.primary, ...shadow.sm },
  section: { marginTop: space.xl, gap: space.md },
  sectionHead: { gap: 0 },
  none: { paddingVertical: space.xl },
});
