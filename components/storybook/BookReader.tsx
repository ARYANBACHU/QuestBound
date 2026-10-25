// Owner: AD. Reader: one spread per chapter (+ the recap when the book is finished). Arrows, dots or a horizontal
// swipe turn the page with a real page flip; the cover swings open when the book is opened.
'use no memo';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SCREEN_GRADIENTS, ink, moodFor, panel, radius, shadow, space } from '@/shared/theme';
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
import { Sage } from '@/components/coloring/sage';
import { CrestRow } from '@/components/coloring/Crests';
import { MontageButton } from './MontageButton';
import { useChapterPainting } from './paint';
import { HeaderMusicToggle } from '@/components/shell/music';

type Item = { kind: 'page'; page: Page } | { kind: 'recap' };

export interface BookReaderProps {
  book: Storyline;
  pages: Page[];
  missions: Mission[];
  memories: Memory[];
  completions: Completion[];
  members: FellowshipMember[];
  recap: BookRecap | null; // non-null → recap page appended
  setAside?: boolean; // shelved unfinished: the last page is Sage's bookmark note, not "The End"
  onClose: () => void;
  onMontage: () => void;
  onSequel: () => void;
  summoning: boolean;
}

export function BookReader({ book, pages, missions, memories, completions, members, recap, setAside = false, onClose, onMontage, onSequel, summoning }: BookReaderProps) {
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
      <RecapPage book={book} recap={recap!} setAside={setAside} members={members} onSequel={onSequel} onMontage={onMontage} summoning={summoning} />
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
        <MontageButton onPress={onMontage} />
        {/* V5: music sits beside Montage in this row (the floating fallback used to cover the Montage button) */}
        <HeaderMusicToggle />
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

/**
 * U3 — ONE organized chapter view (no more Coloring | Illustration toggle):
 *   1. the chapter's Storybook painting by Muse as the hero (painted on demand, "Sage is painting…" meanwhile)
 *   2. your colored page as a thumbnail beside it (tap to see it full size)
 *   3. the tale entries: photos, verses and story lines, in the order they happened
 * Unfinished chapters have no painting yet, so the coloring page itself is the hero.
 */
function ChapterSpread({ page, missions, memories, completions, members, width }: {
  page: Page; missions: Mission[]; memories: Memory[]; completions: Completion[]; members: FellowshipMember[]; width: number;
}) {
  const entries = taleEntries(page, missions, memories, completions);
  const mood = moodFor(page.template_id);
  const locked = page.status === 'locked';
  const finished = page.status === 'complete';
  const pm = pageMissions(missions, page);
  const stored = page.illustration_url ?? memories.find((m) => m.page_id === page.id && m.kind === 'illustration')?.image_url ?? null;
  const { url: painting, painting: busy } = useChapterPainting(page.id, stored, finished);
  const [bigPage, setBigPage] = useState(false);
  const colored = pm.filter((m) => m.status === 'complete');
  const heroes = [...new Set(colored.flatMap((m) => m.completed_by))];
  const heroH = Math.round(width * 1.25);
  const thumbW = Math.min(112, width * 0.3);
  const paintingHero = !!painting || busy;

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <Txt v="smallBold" color={mood.deep}>Chapter {roman(page.chapter_number)}</Txt>
        <Txt v="title">{page.title}</Txt>
        <ExpandableStory text={page.narrative} lines={3} mood={mood} fadeColor={SCREEN_GRADIENTS[mood.id][0]} />
      </View>

      {painting ? (
        <View style={[styles.hero, { width, height: heroH }]}>
          <LinearGradient colors={mood.gradient} style={StyleSheet.absoluteFill} />
          <Image source={{ uri: painting }} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} accessibilityLabel={`Storybook painting of ${page.title}`} />
          <View style={styles.heroTag}><Txt v="smallBold" color={ink.ink}>✦ Storybook · painted by Sage</Txt></View>
        </View>
      ) : busy ? (
        <View style={[styles.hero, { width, height: heroH }]}>
          <LinearGradient colors={mood.gradient} style={StyleSheet.absoluteFill} />
          <View style={styles.painting}>
            <Sage expression="thinking" size="md" still />
            <Txt v="heading" center>Sage is painting…</Txt>
            <Txt v="story" color={ink.inkSoft} center>A picture-book painting of this chapter, just for your fellowship.</Txt>
          </View>
        </View>
      ) : (
        <View style={styles.pageCard}>
          <ColoringPage templateId={page.template_id} missions={pm} members={members} interactive={false} animate={false} locked={locked} width={width} />
        </View>
      )}

      {paintingHero ? (
        <Pressable onPress={() => setBigPage((b) => !b)} style={styles.thumbRow} accessibilityRole="button" accessibilityLabel={bigPage ? 'Shrink your coloring page' : 'Show your coloring page full size'}>
          <View style={styles.thumb}>
            <ColoringPage templateId={page.template_id} missions={pm} members={members} interactive={false} animate={false} width={thumbW} />
          </View>
          <View style={{ flex: 1, gap: space.xs }}>
            <Txt v="smallBold" color={mood.deep}>YOUR COLORING PAGE</Txt>
            <Txt v="body">{colored.length} of {pm.length || 6} regions colored</Txt>
            {heroes.length ? <CrestRow userIds={heroes} members={members} size={24} /> : null}
            <Txt v="small" color={ink.inkSoft}>{bigPage ? 'Tap to tuck it away ▴' : 'Tap to see it full size ▾'}</Txt>
          </View>
        </Pressable>
      ) : !locked && !finished ? (
        <Txt v="small" color={ink.inkSoft} center>Sage paints this chapter for your Storybook once every region is colored.</Txt>
      ) : null}
      {paintingHero && bigPage ? (
        <View style={styles.pageCard}>
          <ColoringPage templateId={page.template_id} missions={pm} members={members} interactive={false} animate={false} width={width} />
        </View>
      ) : null}

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
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  spread: { padding: space.lg, paddingBottom: space.xxl * 2 },
  hero: { alignSelf: 'center', borderRadius: radius.md, borderWidth: 2.5, borderColor: ink.ink, overflow: 'hidden', backgroundColor: ink.page, ...shadow.md },
  heroTag: {
    position: 'absolute', left: space.sm, bottom: space.sm, paddingHorizontal: space.md, paddingVertical: 4,
    borderRadius: radius.pill, backgroundColor: panel.parchment, borderWidth: 1.5, borderColor: ink.ink, overflow: 'hidden',
  },
  painting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  thumbRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.md,
    backgroundColor: panel.parchment, borderWidth: 1.5, borderColor: ink.ink, overflow: 'hidden',
  },
  thumb: { borderRadius: 4, borderWidth: 1.5, borderColor: ink.ink, overflow: 'hidden' },
  pageCard: { alignSelf: 'center', backgroundColor: ink.page, borderRadius: radius.sm, ...shadow.md },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: space.sm },
  dots: { flexDirection: 'row', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: ink.ink },
  dotOn: { backgroundColor: ink.ink },
});
