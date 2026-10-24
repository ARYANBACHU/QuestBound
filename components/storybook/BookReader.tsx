// Owner: AD. Reader: one horizontally-paged spread per chapter (+ the recap when the book is finished).
'use no memo';
import { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { ink, radius, space } from '@/shared/theme';
import type { BookRecap, FellowshipMember, Memory, Mission, Page, Storyline } from '@/shared/types';
import { ColoringPage } from '@/components/coloring/ColoringPage';
import { pageMissions, roman } from '@/components/coloring/pageUtils';
import { InkButton, Txt } from '@/components/coloring/ui';
import { taleEntries } from './bookData';
import { RecapPage } from './RecapPage';
import { TaleEntry } from './TaleEntry';

type Item = { kind: 'page'; page: Page } | { kind: 'recap' };

export interface BookReaderProps {
  book: Storyline;
  pages: Page[];
  missions: Mission[];
  memories: Memory[];
  members: FellowshipMember[];
  recap: BookRecap | null; // non-null → recap page appended
  onClose: () => void;
  onMontage: () => void;
  onSequel: () => void;
  summoning: boolean;
}

export function BookReader({ book, pages, missions, memories, members, recap, onClose, onMontage, onSequel, summoning }: BookReaderProps) {
  const { width } = useWindowDimensions();
  const items: Item[] = [...pages.map((page) => ({ kind: 'page' as const, page })), ...(recap ? [{ kind: 'recap' as const }] : [])];
  const [index, setIndex] = useState(0);
  const [listH, setListH] = useState(0);
  const listRef = useRef<FlatList<Item>>(null);
  const onViewable = useRef(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    const i = viewableItems[0]?.index;
    if (typeof i === 'number') setIndex(i);
  }).current;
  const go = (i: number) => {
    if (i < 0 || i >= items.length) return;
    listRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back to the shelf">
          <Txt v="bodyBold">‹ Shelf</Txt>
        </Pressable>
        <Txt v="smallBold" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>Book {roman(book.book_number)} · {book.title}</Txt>
        <Pressable onPress={onMontage} hitSlop={12} accessibilityRole="button" accessibilityLabel="Play montage">
          <Txt v="bodyBold">▶ Montage</Txt>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={items}
        horizontal
        pagingEnabled
        style={{ flex: 1 }}
        onLayout={(e) => setListH(e.nativeEvent.layout.height)}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(it) => (it.kind === 'page' ? it.page.id : 'recap')}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <ScrollView style={{ width, height: listH || undefined }} contentContainerStyle={styles.spread}>
            {item.kind === 'page' ? (
              <ChapterSpread page={item.page} missions={missions} memories={memories} members={members} width={width - 2 * space.lg} />
            ) : (
              <RecapPage book={book} recap={recap!} members={members} onSequel={onSequel} onMontage={onMontage} summoning={summoning} />
            )}
          </ScrollView>
        )}
      />

      <View style={styles.footer}>
        <Pressable onPress={() => go(index - 1)} disabled={index === 0} hitSlop={12} style={index === 0 && { opacity: 0.3 }} accessibilityLabel="Previous page">
          <Txt v="heading">‹</Txt>
        </Pressable>
        <View style={styles.dots}>
          {items.map((it, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotOn, it.kind === 'recap' && { borderColor: ink.gold }]} />
          ))}
        </View>
        <Pressable onPress={() => go(index + 1)} disabled={index >= items.length - 1} hitSlop={12} style={index >= items.length - 1 && { opacity: 0.3 }} accessibilityLabel="Next page">
          <Txt v="heading">›</Txt>
        </Pressable>
      </View>
    </View>
  );
}

function ChapterSpread({ page, missions, memories, members, width }: { page: Page; missions: Mission[]; memories: Memory[]; members: FellowshipMember[]; width: number }) {
  const [mode, setMode] = useState<'coloring' | 'illustration'>(page.illustration_url ? 'illustration' : 'coloring');
  const entries = taleEntries(page, missions, memories);
  const locked = page.status === 'locked';
  return (
    <View style={{ gap: space.md }}>
      <Txt v="small" color={ink.muted}>Chapter {roman(page.chapter_number)}</Txt>
      <Txt v="title">{page.title}</Txt>
      <Txt v="story">{page.narrative}</Txt>

      {page.illustration_url ? (
        <View style={styles.toggle}>
          {(['coloring', 'illustration'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.toggleBtn, mode === m && styles.toggleOn]} accessibilityRole="button">
              <Txt v="smallBold" color={mode === m ? ink.page : ink.ink}>{m === 'coloring' ? 'Coloring' : 'Illustration'}</Txt>
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
        <Txt v="story" center>This chapter is still unwritten. Color the one before it to turn the page.</Txt>
      ) : entries.length === 0 ? (
        <Txt v="story" center>No tales on this page yet. Every colored region writes a line here, with your photos.</Txt>
      ) : (
        <View>
          <Txt v="heading" style={{ marginTop: space.md }}>The tale so far</Txt>
          {entries.map((e, i) => <TaleEntry key={e.mission.id} entry={e} members={members} index={i} width={width} />)}
        </View>
      )}
    </View>
  );
}

export function ReaderEmpty({ onBack }: { onBack: () => void }) {
  return (
    <View style={{ padding: space.xxl, gap: space.md, alignItems: 'center' }}>
      <Txt v="story" center>This book is shelved somewhere Muse can’t reach right now.</Txt>
      <InkButton label="Back to the shelf" variant="secondary" onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  spread: { padding: space.lg, paddingBottom: space.xxl * 2 },
  toggle: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill, overflow: 'hidden' },
  toggleBtn: { paddingHorizontal: space.lg, paddingVertical: space.xs },
  toggleOn: { backgroundColor: ink.ink },
  pageCard: {
    alignSelf: 'center', backgroundColor: ink.page, borderRadius: radius.sm,
    shadowColor: ink.ink, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: space.sm },
  dots: { flexDirection: 'row', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: ink.ink },
  dotOn: { backgroundColor: ink.ink },
});
