// Owner: AD. A bard's full verse as an illuminated manuscript card: gilded drop cap, gold rules, the author's crest.
import { StyleSheet, View } from 'react-native';
import { accent, fonts, ink, panel, space, type as typeScale, ui, type Mood } from '@/shared/theme';
import type { FellowshipMember } from '@/shared/types';
import { profileOf } from '@/lib/fellowship';
import { CrestBubble } from '@/components/coloring/Crests';
import { Txt } from '@/components/coloring/ui';

export function VerseCard({ verse, authorId, members, mood, title }: { verse: string; authorId: string | null; members: FellowshipMember[]; mood: Mood; title?: string }) {
  const text = verse.trim();
  const first = text.charAt(0).toUpperCase();
  const rest = text.slice(1);
  const author = authorId ? profileOf(members, authorId) : null;
  return (
    <View style={styles.card} accessible accessibilityLabel={`Verse${author ? ` by ${author.display_name}` : ''}: ${text}`}>
      <View style={[styles.rule, { borderColor: ink.gold }]} />
      {title ? <Txt v="smallBold" color={mood.deep} center>{title.toUpperCase()}</Txt> : null}
      <View style={styles.body}>
        <View style={[styles.cap, { backgroundColor: mood.deep }]}>
          <Txt v="title" color={mood.onDeep} style={styles.capLetter}>{first}</Txt>
        </View>
        <Txt v="story" color={ink.ink} style={styles.verse}>{rest}</Txt>
      </View>
      <View style={styles.by}>
        {authorId ? <CrestBubble userId={authorId} members={members} size={28} /> : null}
        <Txt v="smallBold" color={accent.gold}>— {author?.display_name ?? 'A bard of the fellowship'}</Txt>
      </View>
      <View style={[styles.rule, { borderColor: ink.gold }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch', gap: space.md, padding: space.lg, backgroundColor: panel.parchment, borderWidth: ui.borderWidth,
    borderColor: ink.ink, borderRadius: ui.cardRadius, overflow: 'hidden',
  },
  rule: { height: 5, borderTopWidth: 1.5, borderBottomWidth: 1.5, marginHorizontal: space.xl },
  body: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  cap: {
    width: 56, height: 56, borderRadius: space.sm, borderWidth: 3, borderColor: ink.gold, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  capLetter: { fontFamily: fonts.display, fontSize: typeScale.hero, lineHeight: typeScale.hero * 1.15 },
  verse: { flex: 1, fontSize: typeScale.heading - 2, lineHeight: (typeScale.heading - 2) * 1.5 },
  by: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.sm },
});
