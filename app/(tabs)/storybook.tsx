// Owner: AD. The Storybook: a shelf of every book → reader (pages + photos + story lines) → recap → montage.
'use no memo';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useFellowship } from '@/lib/fellowship';
import { useBooks, useMemories, useMissions } from '@/lib/game';
import { useCompletions, usePages } from '@/components/storybook/useStoryData';
import { generateStoryline } from '@/lib/api';
import { ink, moodFor, radius, space } from '@/shared/theme';
import type { FellowshipMember, Page, Storyline } from '@/shared/types';
import { ColoringPage } from '@/components/coloring/ColoringPage';
import { pageMissions, roman } from '@/components/coloring/pageUtils';
import { InkButton, Txt } from '@/components/coloring/ui';
import { SageSays } from '@/components/coloring/sage';
import { BookReader } from '@/components/storybook/BookReader';
import { Montage } from '@/components/storybook/Montage';
import { fallbackRecap, montageSlides, withDemoMemories } from '@/components/storybook/bookData';

export default function StorybookScreen() {
  const insets = useSafeAreaInsets();
  const { fellowship, members } = useFellowship();
  const fid = fellowship?.id ?? null;
  const { books, loading } = useBooks(fid);
  const [openId, setOpenId] = useState<string | null>(null);
  const [montage, setMontage] = useState(false);
  const [summoning, setSummoning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Any book on the shelf (current or older) loads its own pages, missions, memories and verses.
  const open = books.find((b) => b.id === openId) ?? null;
  const { pages, loading: pagesLoading } = usePages(open?.id ?? null);
  const { missions } = useMissions(open?.id ?? null);
  const { completions } = useCompletions(open?.id ?? null);
  const { memories: rawMemories } = useMemories(fid, open?.id ?? null);
  const memories = withDemoMemories(rawMemories, missions);
  const done = !!open && isBookDone(open, pages);
  const recap = open && done ? open.recap ?? fallbackRecap(open, pages, missions, memories, members) : null;

  const sequel = async () => {
    if (!fid) return;
    setSummoning(true);
    setError(null);
    try {
      await generateStoryline({ fellowship_id: fid, mode: 'sequel' });
      setOpenId(null);
      router.push('/(tabs)/coloring');
    } catch {
      setError('Sage dropped the quill. Try summoning again in a moment.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } finally {
      setSummoning(false);
    }
  };

  if (open) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {pagesLoading && !pages.length ? (
          <ActivityIndicator color={ink.ink} style={{ marginTop: space.xxl }} />
        ) : (
          <BookReader
            book={open} pages={pages} missions={missions} memories={memories} completions={completions} members={members} recap={recap}
            onClose={() => setOpenId(null)} onMontage={() => setMontage(true)} onSequel={sequel} summoning={summoning}
          />
        )}
        {error ? <Txt v="small" color={ink.danger} center>{error}</Txt> : null}
        <Montage visible={montage} slides={montageSlides(open, pages, missions, memories, recap)} onClose={() => setMontage(false)} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.shelfWrap}>
        <Txt v="hero">Storybook</Txt>
        <Txt v="story">Every tale your fellowship has lived, with the pictures to prove it.</Txt>
        {loading ? (
          <ActivityIndicator color={ink.ink} style={{ marginTop: space.xxl }} />
        ) : books.length === 0 ? (
          <View style={styles.empty}>
            <SageSays expression="idle" size="md" title="The shelf is empty." line="Books appear here as I write them. Summon your first tale on the Page tab." />
            <InkButton label="Go to the page" onPress={() => router.push('/(tabs)/coloring')} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : (
          <View style={styles.shelf}>
            {books.map((b) => (
              <BookCard key={b.id} book={b} members={members} onPress={() => setOpenId(b.id)} />
            ))}
            <View style={styles.plank} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const isBookDone = (b: Storyline, pages: Page[]) => b.status === 'complete' || (pages.length > 0 && pages.every((p) => p.status === 'complete'));

function BookCard({ book, members, onPress }: { book: Storyline; members: FellowshipMember[]; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const { pages } = usePages(book.id);
  const { missions } = useMissions(book.id);
  const done = isBookDone(book, pages);
  const coverW = Math.min(132, width * 0.32);
  const first = pages[0];
  const colored = missions.filter((m) => m.status === 'complete').length;
  const chaptersDone = pages.filter((p) => p.status === 'complete').length;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]} accessibilityRole="button" accessibilityLabel={`Open ${book.title}`}>
      <View style={[styles.spine, { backgroundColor: moodFor(first?.template_id).deep }]} />
      <View style={styles.cover}>
        {first ? (
          <ColoringPage templateId={first.template_id} missions={pageMissions(missions, first)} members={members} interactive={false} animate={false} width={coverW} />
        ) : (
          <View style={{ width: coverW, height: coverW * 1.4, backgroundColor: ink.lavenderMist }} />
        )}
      </View>
      <View style={styles.cardText}>
        <Txt v="smallBold" color={moodFor(first?.template_id).deep}>BOOK {roman(book.book_number)}</Txt>
        <Txt v="heading" numberOfLines={3}>{book.title}</Txt>
        <Txt v="small" numberOfLines={3}>{book.synopsis}</Txt>
        <View style={[styles.badge, done && styles.badgeDone]}>
          <Txt v="smallBold" color={done ? ink.page : ink.ink}>
            {done ? 'Complete' : pages.length ? `Chapter ${chaptersDone + 1} of ${pages.length} · ${colored} colored` : 'Being written'}
          </Txt>
        </View>
        <Txt v="bodyBold">Read ›</Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ink.paper },
  shelfWrap: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl * 2 },
  empty: { marginTop: space.xl, gap: space.lg },
  shelf: { marginTop: space.lg, gap: space.lg },
  plank: { height: 10, borderRadius: 5, backgroundColor: ink.ink, opacity: 0.12 },
  card: {
    flexDirection: 'row', gap: space.md, padding: space.md, paddingLeft: space.lg, backgroundColor: ink.page,
    borderWidth: 2.5, borderColor: ink.ink, borderRadius: radius.md, overflow: 'hidden',
  },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, backgroundColor: ink.gold },
  cover: { borderWidth: 1.5, borderColor: ink.ink, borderRadius: 4, overflow: 'hidden', alignSelf: 'flex-start' },
  cardText: { flex: 1, gap: space.xs },
  badge: { alignSelf: 'flex-start', borderWidth: 1.5, borderColor: ink.ink, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2, marginTop: space.xs },
  badgeDone: { backgroundColor: ink.gold, borderColor: ink.gold },
});
