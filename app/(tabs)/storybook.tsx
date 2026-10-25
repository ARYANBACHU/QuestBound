// Owner: AD. The Storybook: a shelf of every book → reader (pages + photos + story lines) → recap → montage.
'use no memo';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useIsFocused } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFellowship } from '@/lib/fellowship';
import { useBooks, useMemories, useMissions } from '@/lib/game';
import { useCompletions, usePages } from '@/components/storybook/useStoryData';
import { generateStoryline } from '@/lib/api';
import { SCREEN_GRADIENTS, ink, moodFor, panel, shadow, space, ui } from '@/shared/theme';
import type { FellowshipMember, Page, Storyline } from '@/shared/types';
import { ColoringPage } from '@/components/coloring/ColoringPage';
import { pageMissions, roman } from '@/components/coloring/pageUtils';
import { Chip, InkButton, Txt } from '@/components/coloring/ui';
import { SageSays } from '@/components/coloring/sage';
import { useHideWizardFab } from '@/components/wizard/WizardProvider';
import { HeaderMusicToggle } from '@/components/shell/music';
import { BookReader } from '@/components/storybook/BookReader';
import { Montage } from '@/components/storybook/Montage';
import { bookProgress, fallbackRecap, montageSlides, withDemoMemories } from '@/components/storybook/bookData';

export default function StorybookScreen() {
  const insets = useSafeAreaInsets();
  const { fellowship, members } = useFellowship();
  const fid = fellowship?.id ?? null;
  const { books, loading } = useBooks(fid);
  const [openId, setOpenId] = useState<string | null>(null);
  const [montage, setMontage] = useState(false);
  const [summoning, setSummoning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sage's FAB covers the reader's arrows and the montage — hide it while either is open (AB's A10 hook).
  useHideWizardFab(!!openId || montage);
  // V9: the Storybook tab always opens on the shelf — leaving the tab closes the book (and its montage), so coming
  // back never lands mid-book.
  const focused = useIsFocused();
  useEffect(() => {
    if (focused) return;
    setMontage(false);
    setOpenId(null);
    setError(null);
  }, [focused]);

  // Any book on the shelf (current or older) loads its own pages, missions, memories and verses.
  const open = books.find((b) => b.id === openId) ?? null;
  const { pages, loading: pagesLoading } = usePages(open?.id ?? null);
  const { missions } = useMissions(open?.id ?? null);
  const { completions } = useCompletions(open?.id ?? null);
  const { memories: rawMemories } = useMemories(fid, open?.id ?? null);
  const memories = withDemoMemories(rawMemories, missions);
  const progress = open ? bookProgress(open, pages, missions) : null;
  // finished books end on the recap; set-aside books end on Sage's bookmark note (the engine's abandoned recap)
  const recap = !open || !progress ? null
    : progress.kind === 'finished' ? open.recap ?? fallbackRecap(open, pages, missions, memories, members)
    : progress.kind === 'setAside' ? open.recap ?? null
    : null;

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
            setAside={progress?.kind === 'setAside'}
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
      <LinearGradient colors={SCREEN_GRADIENTS.castle} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.shelfWrap}>
        <View style={styles.head}>
          <Txt v="hero" style={{ flex: 1 }}>Storybook</Txt>
          <HeaderMusicToggle />
        </View>
        <Txt v="story" color={ink.inkSoft}>Every tale your fellowship has lived.</Txt>
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

function BookCard({ book, members, onPress }: { book: Storyline; members: FellowshipMember[]; onPress: () => void }) {
  const { width } = useWindowDimensions();
  const { pages } = usePages(book.id);
  const { missions } = useMissions(book.id);
  const progress = bookProgress(book, pages, missions);
  const coverW = Math.min(132, width * 0.32);
  const first = pages[0];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: ui.pressScale }] }]} accessibilityRole="button" accessibilityLabel={`Open ${book.title}`}>
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
        <Chip tone={progress.kind === 'finished' ? 'gold' : 'neutral'} label={progress.label} style={{ marginTop: space.xs }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ink.paper },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  shelfWrap: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl * 2 },
  empty: { marginTop: space.xl, gap: space.lg },
  shelf: { marginTop: space.lg, gap: space.lg },
  plank: { height: 10, borderRadius: 5, backgroundColor: ink.ink, opacity: 0.12 },
  card: {
    flexDirection: 'row', gap: space.md, padding: space.md, paddingLeft: space.lg, backgroundColor: panel.parchment,
    borderWidth: ui.borderWidth, borderColor: ink.ink, borderRadius: ui.cardRadius, overflow: 'hidden', ...shadow.sm,
  },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, backgroundColor: ink.gold },
  cover: { borderWidth: 1.5, borderColor: ink.ink, borderRadius: 4, overflow: 'hidden', alignSelf: 'flex-start' },
  cardText: { flex: 1, gap: space.xs },
});
