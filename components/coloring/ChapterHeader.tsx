// Owner: AD. Book title → chapter title → narrative (tap to expand) → crayon-stub progress.
'use no memo'; // mock store mutates rows in place; opt out of React Compiler auto-memo so updates always render
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { TEMPLATES } from '@/shared/templates';
import { SCREEN_GRADIENTS, ink, moodFor, space } from '@/shared/theme';
import { ExpandableStory } from './ExpandableStory';
import type { FellowshipMember, Mission, Page } from '@/shared/types';
import { crayonHex, missionColors, roman } from './pageUtils';
import { Txt } from './ui';

export function ChapterHeader({ bookTitle, page, missions, members }: { bookTitle?: string; page: Page; missions: Mission[]; members: FellowshipMember[] }) {
  const mood = moodFor(page.template_id);
  return (
    <View style={styles.wrap}>
      {bookTitle ? <Txt v="smallBold" color={ink.muted} numberOfLines={1}>{bookTitle.toUpperCase()}</Txt> : null}
      <Txt v="smallBold" color={mood.deep}>Chapter {roman(page.chapter_number)}</Txt>
      <Txt v="title" style={styles.title}>{page.title}</Txt>
      <ExpandableStory text={page.narrative} lines={2} mood={mood} fadeColor={SCREEN_GRADIENTS[mood.id][0]} />
      <CrayonProgress page={page} missions={missions} members={members} />
    </View>
  );
}

/** A row of crayon stubs, one per region; filled with the completer's color. */
export function CrayonProgress({ page, missions, members, compact }: { page: Page; missions: Mission[]; members: FellowshipMember[]; compact?: boolean }) {
  const { width } = useWindowDimensions();
  const small = compact || width < 380;
  const regions = TEMPLATES[page.template_id].regions;
  const byRegion = Object.fromEntries(missions.map((m) => [m.region_id, m]));
  const done = regions.filter((r) => byRegion[r.id]?.status === 'complete').length;
  return (
    <View style={styles.progress}>
      <View style={styles.stubs}>
        {regions.map((r) => {
          const m = byRegion[r.id];
          const color = m?.status === 'complete' ? crayonHex(missionColors(m, members)[0]) : null;
          return <CrayonStub key={r.id} color={color} size={small ? 13 : 18} />;
        })}
      </View>
      <Txt v="smallBold" numberOfLines={1}>{done} of {regions.length} colored</Txt>
    </View>
  );
}

function CrayonStub({ color, size }: { color: string | null; size: number }) {
  // a little crayon: rounded body with a pointed tip
  return (
    <Svg width={size * 2.2} height={size} viewBox="0 0 44 20">
      <Path
        d="M4 4 H30 L40 10 L30 16 H4 Q1 16 1 13 V7 Q1 4 4 4 Z"
        fill={color ?? ink.page}
        stroke={ink.ink}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <Path d="M10 4 V16" stroke={color ? ink.page : ink.muted} strokeOpacity={0.6} strokeWidth={2} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md },
  title: { marginBottom: space.xs },
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm, gap: space.sm },
  stubs: { flexDirection: 'row', gap: 2, flexShrink: 1 },
});
