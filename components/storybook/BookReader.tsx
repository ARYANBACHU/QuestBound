// Owner: AD. Reader: one spread per chapter (+ the recap when the book is finished). Arrows, dots or a horizontal
// swipe turn the page with a real page flip; the cover swings open when the book is opened.
'use no memo';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SCREEN_GRADIENTS, ink, moodFor, radius, shadow, space } from '@/shared/theme';
import type { BookRecap, Completion, FellowshipMember, Memory, Mission, Page, Storyline } from '@/shared/types';
import { ColoringPage } from '@/components/coloring/ColoringPage';
import { pageMissions, roman } from '@/components/coloring/pageUtils';
import { Txt } from '@/components/coloring/ui';
import { taleEntries } from './bookData';
import { RecapPage } from './RecapPage';
import { CoverSwing } from './BookCover';
import { PageFlip } from '@/components/coloring/PageFlip';
import { TaleEntry } from './TaleEntry';
import { ExpandableStory } from '@/components/coloring/ExpandableStory';

type Item = { kind: 'page'; page: Page } | { kind: 'recap' };

export interface BookReaderProps {
  book: Storyline;
  pages: Page[];
  missions: Mission[];
  memories: Memory[];
  completions: Completion[];
  members: FellowshipMember[];
  recap: BookRecap | null; // non-null → recap page appended
  onClose: () => void;
  onMontage: () => void;
  onSequel: () => void;
  summoning: boolean;
}

export function BookReader({ book, pages, missions, memories, completions, members, recap, onClose, onMontage, onSequel, summoning }: BookReaderProps) {
  const { width } = useWindowDimensions();
  const items: Item[] = [...pages.map((page) => ({ kind: 'page' as const, page })), ...(recap ? [{ kind: 'recap' as const }] : [])];
  const [index, setIndex] = useState(0);
  const [flip, setFlip] = useState<{ key: number; mode: 'next' | 'prev'; over: number; under: number; overY: number; underY: number } | null>(null);
  const [areaH, setAreaH] = useState(0);
  const [opening, setOpening] = useState(true); // the cover swings open when the book is opened
  const scrollY = useRef(0);

  const go = (i: number) => {
    if (i < 0 || i >= items.length || i === index || flip) return;
    const forward = i > index;
    // the page that moves is the one on top: forward → the current spread, back → the previous one
    setFlip({ key: Date.now(), mode: forward ? 'next' : 'prev', over: forward ? index : i, under: forward ? i : index, overY: forward ? scrollY.current : 0, underY: forward ? 0 : scrollY.current });
    setIndex(i);
    scrollY.current = 0;
  };
  const goRef = useRef(go);
  goRef.current = go;
  const idxRef = useRef(index);
  idxRef.current = index;
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 50) goRef.current(idxRef.current + (g.dx < 0 ? 1 : -1));
        },
      }),
    [],
  );

  const spread = (i: number, live: boolean, y = 0) => {
    const it = items[i];
    if (!it) return null;
    const m = moodFor(it.kind === 'page' ? it.page.template_id : 'royal_feast');
    const content = it.kind === 'page' ? (
      <ChapterSpread page={it.page} missions={missions} memories={memories} completions={completions} members={members} width={width - 2 * space.lg} />
    ) : (
      <RecapPage book={book} recap={recap!} members={members} onSequel={onSequel} onMontage={onMontage} summoning={summoning} />
    );
    return (
      <View style={{ width, height: areaH || undefined, overflow: 'hidden' }}>
        <LinearGradient colors={SCREEN_GRADIENTS[m.id]} style={StyleSheet.absoluteFill} />
        <ScrollView
          key={live ? `live-${i}` : `snap-${i}`}
          scrollEnabled={live}
          contentOffset={{ x: 0, y }}
          onScroll={live ? (e) => { scrollY.current = e.nativeEvent.contentOffset.y; } : undefined}
          scrollEventThrottle={64}
          contentContainerStyle={styles.spread}
        >
          {content}
        </ScrollView>
      </View>
    );
  };

  const cur = items[index];
  const tint = SCREEN_GRADIENTS[moodFor(cur?.kind === 'page' ? cur.page.template_id : 'royal_feast').id][0];
  return (
    <View style={[styles.wrap, { backgroundColor: tint }]}>
      <View style={styles.top}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to the shelf">
          <Txt v="bodyBold">‹ Shelf</Txt>
        </Pressable>
        <Txt v="smallBold" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>Book {roman(book.book_number)} · {book.title}</Txt>
        <Pressable onPress={onMontage} hitSlop={12} accessibilityRole="button" accessibilityLabel="Play montage">
          <Txt v="bodyBold">▶ Montage</Txt>
        </Pressable>
      </View>

      <View style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => setAreaH(e.nativeEvent.layout.height)} {...swipe.panHandlers}>
        {flip ? (
          <PageFlip key={flip.key} mode={flip.mode} over={spread(flip.over, false, flip.overY)} under={spread(flip.under, false, flip.underY)} onDone={() => setFlip(null)} />
        ) : (
          spread(index, true)
        )}
        {opening ? <CoverSwing book={book} onDone={() => setOpening(false)} /> : null}
      </View>

      <View style={styles.footer}>
        <Pressable onPress={() => go(index - 1)} disabled={index === 0} hitSlop={12} style={index === 0 && { opacity: 0.3 }} accessibilityLabel="Previous page">
          <Txt v="heading">‹</Txt>
        </Pressable>
        <View style={styles.dots}>
          {items.map((it, i) => (
            <Pressable key={i} onPress={() => go(i)} hitSlop={6} accessibilityLabel={it.kind === 'page' ? `Chapter ${it.page.chapter_number}` : 'The end'}>
              <View style={[styles.dot, i === index && styles.dotOn, it.kind === 'recap' && { borderColor: ink.gold }]} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => go(index + 1)} disabled={index >= items.length - 1} hitSlop={12} style={index >= items.length - 1 && { opacity: 0.3 }} accessibilityLabel="Next page">
          <Txt v="heading">›</Txt>
        </Pressable>
      </View>
    </View>
  );
}

function ChapterSpread({ page, missions, memories, completions, members, width }: {
  page: Page; missions: Mission[]; memories: Memory[]; completions: Completion[]; members: FellowshipMember[]; width: number;
}) {
  const [mode, setMode] = useState<'coloring' | 'illustration'>(page.illustration_url ? 'illustration' : 'coloring');
  const entries = taleEntries(page, missions, memories, completions);
  const mood = moodFor(page.template_id);
  const locked = page.status === 'locked';
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <Txt v="smallBold" color={mood.deep}>Chapter {roman(page.chapter_number)}</Txt>
        <Txt v="title">{page.title}</Txt>
        <ExpandableStory text={page.narrative} lines={3} mood={mood} fadeColor={SCREEN_GRADIENTS[mood.id][0]} />
      </View>

      {page.illustration_url ? (
        <View style={[styles.toggle, { borderColor: mood.deep }]}>
          {(['coloring', 'illustration'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.toggleBtn, mode === m && { backgroundColor: mood.deep }]} accessibilityRole="button" accessibilityState={{ selected: mode === m }}>
              <Txt v="smallBold" color={mode === m ? mood.onDeep : mood.deep}>{m === 'coloring' ? 'Coloring' : 'Illustration'}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.pageCard}>
        {mode === 'illustration' && page.illustration_url ? (
          <Image source={{ uri: page.illustration_url }} style={{ width, height: (width * 1400) / 1000 }} contentFit="cover" transition={300} />
        ) : (
          <ColoringPage templateId={page.template_id} missions={pageMissions(missions, page)} members={members} interactive={false} animate={false} locked={locked} width={width} />
        )}
      </View>

      {locked ? (
        <Txt v="story" color={ink.inkSoft} center>This chapter is still unwritten. Color the one before it to turn the page.</Txt>
      ) : entries.length === 0 ? (
        <Txt v="story" color={ink.inkSoft} center>No tales on this page yet. Every colored region writes a line here, with your photos.</Txt>
      ) : (
        <View>
          <Txt v="smallBold" color={mood.deep} style={{ marginTop: space.md }}>THE TALE SO FAR</Txt>
          {entries.map((e, i) => <TaleEntry key={e.mission.id} entry={e} members={members} index={i} width={width} mood={mood} />)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  spread: { padding: space.lg, paddingBottom: space.xxl * 2 },
  toggle: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill, overflow: 'hidden' },
  toggleBtn: { paddingHorizontal: space.lg, paddingVertical: space.xs },
  pageCard: { alignSelf: 'center', backgroundColor: ink.page, borderRadius: radius.sm, ...shadow.md },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: space.sm },
  dots: { flexDirection: 'row', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: ink.ink },
  dotOn: { backgroundColor: ink.ink },
});
