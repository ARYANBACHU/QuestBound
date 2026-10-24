// Owner: AD. The last page of a finished book: recap, stats, titles, highlights, sequel teaser.
'use no memo';
import { StyleSheet, View } from 'react-native';
import { ink, radius, space } from '@/shared/theme';
import type { BookRecap, FellowshipMember, Storyline } from '@/shared/types';
import { CrestBubble } from '@/components/coloring/Crests';
import { roman } from '@/components/coloring/pageUtils';
import { InkButton, Txt } from '@/components/coloring/ui';

export function RecapPage({ book, recap, members, onSequel, onMontage, summoning }: {
  book: Storyline; recap: BookRecap; members: FellowshipMember[]; onSequel: () => void; onMontage: () => void; summoning: boolean;
}) {
  const stats: [number, string][] = [
    [recap.stats.missions_completed, 'missions'],
    [recap.stats.photos, 'photos'],
    [recap.stats.places_visited, 'places'],
    [recap.stats.members_active, 'heroes'],
  ];
  return (
    <View style={styles.wrap}>
      <Txt v="smallBold" color={ink.gold} center>BOOK {roman(book.book_number)} · THE END</Txt>
      <Txt v="hero" center>{book.title}</Txt>
      <Txt v="story" color={ink.ink}>{recap.summary}</Txt>

      <View style={styles.stats}>
        {stats.map(([n, label]) => (
          <View key={label} style={styles.stat}>
            <Txt v="title" center>{n}</Txt>
            <Txt v="small" center>{label}</Txt>
          </View>
        ))}
      </View>

      {recap.per_member.length > 0 && (
        <View style={styles.section}>
          <Txt v="heading">The heroes</Txt>
          {recap.per_member.map((p) => (
            <View key={p.user_id} style={styles.hero}>
              <CrestBubble userId={p.user_id} members={members} size={36} />
              <View style={{ flex: 1 }}>
                <Txt v="bodyBold">{p.title}</Txt>
                <Txt v="small">{p.contribution}</Txt>
              </View>
            </View>
          ))}
        </View>
      )}

      {recap.highlights.length > 0 && (
        <View style={styles.section}>
          <Txt v="heading">Best moments</Txt>
          {recap.highlights.map((h, i) => (
            <View key={i} style={styles.highlight}>
              <Txt v="bodyBold" color={ink.gold}>✦</Txt>
              <Txt v="story" color={ink.ink} style={{ flex: 1 }}>{h}</Txt>
            </View>
          ))}
        </View>
      )}

      <InkButton label="Play montage" variant="secondary" onPress={onMontage} />

      <View style={styles.teaser}>
        <Txt v="smallBold" color={ink.gold}>NEXT TIME…</Txt>
        <Txt v="story" color={ink.ink}>{recap.next_book_hint}</Txt>
        <InkButton label="Summon the next book" onPress={onSequel} loading={summoning} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg, paddingBottom: space.xxl },
  stats: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderBottomWidth: 2, borderColor: ink.ink, paddingVertical: space.md },
  stat: { flex: 1 },
  section: { gap: space.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  highlight: { flexDirection: 'row', gap: space.sm },
  teaser: { gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 2.5, borderColor: ink.gold, backgroundColor: ink.page },
});
