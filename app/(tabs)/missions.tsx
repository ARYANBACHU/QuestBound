// Owner: AB. Missions dashboard: book + chapter header, page progress, leaderboard, filters, grouped mission cards.
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/shell/Button';
import { MissionCard } from '@/components/shell/MissionCard';
import {
  GROUP_TITLES, completerColor, missionGroup, orderedPageMissions, pointsByMember, type MissionGroup,
} from '@/components/shell/missionUtils';
import { ParchmentLoading } from '@/components/shell/ParchmentLoading';
import { T } from '@/components/shell/T';
import { TAB_CONTENT_BOTTOM_PAD } from '@/components/shell/TabBar';
import { Crest } from '@/components/shell/teammates';
import { SageBubble } from '@/components/wizard/SageBubble';
import { useFellowship } from '@/lib/fellowship';
import { useMissions, useStoryline } from '@/lib/game';
import { useSession } from '@/lib/session';
import type { Mission } from '@/shared/types';
import { ink, radius, space } from '@/shared/theme';

type Filter = 'all' | 'mine' | 'open' | 'friends' | 'done';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'mine', label: 'Mine' }, { id: 'open', label: 'Open' },
  { id: 'friends', label: 'Needs friends' }, { id: 'done', label: 'Done' },
];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

export default function MissionsScreen() {
  const router = useRouter();
  const { userId } = useSession();
  const fs = useFellowship();
  const { storyline, pages, activePage, loading: storyLoading } = useStoryline(fs.fellowship?.id ?? null);
  const { missions, loading: missionsLoading } = useMissions(storyline?.id ?? null);
  const [filter, setFilter] = useState<Filter>('all');
  const [showLocked, setShowLocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fs.refresh(); } catch {} finally { setRefreshing(false); }
  }, [fs]);

  const pageMissions = useMemo(() => (activePage ? orderedPageMissions(activePage, missions) : []), [activePage, missions]);

  const filtered = useMemo(() => pageMissions.filter((m) => matches(m, filter, userId)), [pageMissions, filter, userId]);
  const grouped = useMemo(() => {
    const g: Record<MissionGroup, Mission[]> = { whole: [], pairs: [], solo: [] };
    filtered.forEach((m) => g[missionGroup(m)].push(m));
    return g;
  }, [filtered]);

  const upcoming = useMemo(
    () => pages.filter((p) => activePage && p.chapter_number > activePage.chapter_number),
    [pages, activePage],
  );
  const leaders = useMemo(() => pointsByMember(missions, fs.members), [missions, fs.members]);

  if ((storyLoading || missionsLoading || fs.loading) && !storyline) return <ParchmentLoading line="Unrolling the quest board…" />;

  if (!storyline || !activePage) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.empty}>
          <SageBubble text="No missions yet — summon a story and I'll write you some." />
          <Button label="Summon our story" onPress={() => router.push({ pathname: '/onboarding', params: { step: 'summon' } })} />
        </View>
      </SafeAreaView>
    );
  }

  const coloredCount = pageMissions.filter((m) => m.status === 'complete').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ink.ink} />}
      >
        {/* Header */}
        <T variant="small" color={ink.muted}>Book {storyline.book_number} · {fs.fellowship?.name}</T>
        <T variant="title">{storyline.title}</T>
        <T variant="story">Chapter {ROMAN[activePage.chapter_number] ?? activePage.chapter_number}: {activePage.title}</T>

        {/* Page progress: one segment per region, colored by whoever completed it */}
        <View style={styles.progressRow}>
          {pageMissions.map((m) => {
            const c = completerColor(m, fs.members);
            return (
              <View key={m.id} style={[styles.seg, c ? { backgroundColor: c } : m.status === 'pending' ? styles.segPending : null]} />
            );
          })}
        </View>
        <T variant="small">
          {coloredCount === pageMissions.length && pageMissions.length
            ? 'Every region is colored — turn the page!'
            : `${coloredCount} of ${pageMissions.length} regions colored`}
        </T>

        {/* Leaderboard strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.leaders}>
          {leaders.map(({ member, points }, i) => member.profile ? (
            <View key={member.user_id} style={[styles.leader, member.user_id === userId && styles.leaderMe]}>
              <T variant="smallBold" color={ink.muted}>{i === 0 && points > 0 ? '👑' : `${i + 1}`}</T>
              <Crest crest={member.profile.crest} color={member.profile.color} size={28} />
              <View>
                <T variant="smallBold" numberOfLines={1}>{member.user_id === userId ? 'You' : member.profile.display_name}</T>
                <T variant="small">{points} pts</T>
              </View>
            </View>
          ) : null)}
        </ScrollView>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[styles.filter, on && styles.filterOn]}
                accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <T variant="smallBold" color={on ? ink.page : ink.ink}>{f.label}</T>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sections */}
        {filtered.length === 0 ? (
          <View style={styles.none}>
            <T variant="story" center>
              {filter === 'done' ? 'Nothing colored yet. The first stroke is the bravest.'
                : filter === 'mine' ? 'Nothing is yours alone right now — look under Pairs and Whole fellowship.'
                : 'No missions match. Try another filter.'}
            </T>
          </View>
        ) : (
          (['whole', 'pairs', 'solo'] as MissionGroup[]).map((g) => grouped[g].length ? (
            <View key={g} style={styles.section}>
              <T variant="heading">{GROUP_TITLES[g].title}</T>
              <T variant="small" style={{ marginBottom: space.sm }}>{GROUP_TITLES[g].sub}</T>
              <View style={{ gap: space.md }}>
                {grouped[g].map((m) => <MissionCard key={m.id} mission={m} members={fs.members} page={activePage} />)}
              </View>
            </View>
          ) : null)
        )}

        {/* Locked chapters */}
        {upcoming.length ? (
          <View style={styles.section}>
            <Pressable onPress={() => setShowLocked((s) => !s)} style={styles.lockedHeader} accessibilityRole="button">
              <T variant="heading" color={ink.inkSoft}>🔒 Coming in Chapter {ROMAN[upcoming[0].chapter_number] ?? upcoming[0].chapter_number}</T>
              <T variant="heading" color={ink.inkSoft}>{showLocked ? '▾' : '▸'}</T>
            </Pressable>
            {showLocked ? upcoming.map((p) => {
              const ms = orderedPageMissions(p, missions);
              return (
                <View key={p.id} style={{ gap: space.sm, marginTop: space.md }}>
                  <T variant="bodyBold" color={ink.muted}>Chapter {ROMAN[p.chapter_number] ?? p.chapter_number}: {p.title}</T>
                  {ms.length ? ms.map((m) => <MissionCard key={m.id} mission={m} members={fs.members} page={p} locked />)
                    : <T variant="story" color={ink.muted}>Muse hasn't inked these missions yet.</T>}
                </View>
              );
            }) : (
              <T variant="small">Color every region on this page to break the seal.</T>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function matches(m: Mission, f: Filter, me: string | null): boolean {
  switch (f) {
    case 'all': return true;
    case 'mine': return m.assignee_ids.length === 0 || (!!me && m.assignee_ids.includes(me));
    case 'open': return m.status === 'open' || m.status === 'pending';
    case 'friends': return m.required_members >= 2;
    case 'done': return m.status === 'complete';
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ink.paper },
  content: { padding: space.lg, paddingBottom: TAB_CONTENT_BOTTOM_PAD, gap: space.xs },
  empty: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.xl },
  progressRow: { flexDirection: 'row', gap: 4, marginTop: space.md, marginBottom: space.xs },
  seg: { flex: 1, height: 14, borderRadius: 4, borderWidth: 2, borderColor: ink.ink, backgroundColor: ink.page },
  segPending: { backgroundColor: ink.lavenderMist },
  bleed: { marginHorizontal: -space.lg },
  leaders: { gap: space.sm, paddingVertical: space.md, paddingHorizontal: space.lg },
  leader: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill,
    paddingVertical: space.xs, paddingLeft: space.md, paddingRight: space.lg, backgroundColor: ink.page,
  },
  leaderMe: { backgroundColor: ink.lavenderMist },
  filters: { gap: space.sm, paddingBottom: space.sm, paddingHorizontal: space.lg },
  filter: { borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill, paddingVertical: space.xs + 2, paddingHorizontal: space.md, backgroundColor: ink.page },
  filterOn: { backgroundColor: ink.ink },
  section: { marginTop: space.lg },
  none: { paddingVertical: space.xxl },
  lockedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
