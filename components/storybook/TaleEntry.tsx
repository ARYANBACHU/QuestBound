// Owner: AD. One scrapbook "tale entry": a deckled photo + the story line it became + who did it.
'use no memo';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { ink, radius, space } from '@/shared/theme';
import type { FellowshipMember } from '@/shared/types';
import { CrestRow } from '@/components/coloring/Crests';
import { MissionTypeIcon } from '@/components/coloring/MissionTypeIcon';
import { Txt } from '@/components/coloring/ui';
import type { TaleEntry as Entry } from './bookData';

/** Wavy (deckled) rectangle outline in a 100×125 box. */
function deckle(w = 100, h = 125, step = 6.25, amp = 1.3): string {
  let d = `M0 0`;
  for (let x = step; x <= w; x += step) d += ` Q${x - step / 2} ${amp * ((x / step) % 2 ? 1 : -1)} ${x} 0`;
  for (let y = step; y <= h; y += step) d += ` Q${w + amp * ((y / step) % 2 ? 1 : -1)} ${y - step / 2} ${w} ${y}`;
  for (let x = w - step; x >= 0; x -= step) d += ` Q${x + step / 2} ${h + amp * ((x / step) % 2 ? 1 : -1)} ${x} ${h}`;
  for (let y = h - step; y >= 0; y -= step) d += ` Q${amp * ((y / step) % 2 ? 1 : -1)} ${y + step / 2} 0 ${y}`;
  return d + ' Z';
}
const DECKLE = deckle();

export function DeckledPhoto({ uri, tilt, width }: { uri: string; tilt: number; width: number }) {
  const [failed, setFailed] = useState(false);
  const h = width * 1.25;
  return (
    <View style={[styles.mat, { width: width + 20, transform: [{ rotate: `${tilt}deg` }] }]}>
      <View style={{ width, height: h, backgroundColor: ink.lavenderMist }}>
        {failed ? (
          <View style={styles.missing}><Txt v="small" center>The Magic Mirror fogged over. This picture is lost to the mists.</Txt></View>
        ) : (
          <Image source={{ uri }} style={{ width, height: h }} contentFit="cover" transition={300} onError={() => setFailed(true)} />
        )}
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 125" preserveAspectRatio="none" pointerEvents="none">
          <Path d={DECKLE} fill="none" stroke={ink.page} strokeWidth={3} />
          <Path d={DECKLE} fill="none" stroke={ink.ink} strokeWidth={0.6} strokeOpacity={0.6} />
        </Svg>
      </View>
      <View style={[styles.tape, { transform: [{ rotate: `${-tilt * 3}deg` }] }]} />
    </View>
  );
}

export function TaleEntry({ entry, members, index, width }: { entry: Entry; members: FellowshipMember[]; index: number; width: number }) {
  const { mission, photo } = entry;
  const tilt = index % 2 ? 2 : -2;
  const line = mission.story_line ?? photo?.caption ?? mission.title;
  return (
    <View style={[styles.entry, { alignItems: index % 2 ? 'flex-end' : 'flex-start' }]}>
      {photo ? (
        <DeckledPhoto uri={photo.image_url} tilt={tilt} width={Math.min(width * 0.72, 320)} />
      ) : (
        <View style={styles.quote}>
          <MissionTypeIcon type={mission.type} size={22} />
          <Txt v="heading" style={styles.quoteMark}>“</Txt>
          <Txt v="story" color={ink.ink}>{line}</Txt>
        </View>
      )}
      {photo ? <Txt v="story" color={ink.ink} style={styles.caption}>{line}</Txt> : null}
      <View style={styles.by}>
        <CrestRow userIds={mission.completed_by} members={members} size={24} />
        <Txt v="small">{mission.title}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  entry: { gap: space.sm, paddingVertical: space.md },
  mat: {
    padding: 10, paddingBottom: 14, backgroundColor: ink.page, borderRadius: 2,
    shadowColor: ink.ink, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  tape: { position: 'absolute', top: -10, alignSelf: 'center', width: 70, height: 22, backgroundColor: ink.lavenderMist, opacity: 0.9 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  caption: { maxWidth: '92%' },
  by: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  quote: {
    alignSelf: 'stretch', padding: space.lg, gap: space.xs, borderLeftWidth: 4, borderLeftColor: ink.gold,
    backgroundColor: ink.page, borderRadius: radius.sm,
  },
  quoteMark: { fontSize: 40, lineHeight: 40, color: ink.gold, marginBottom: -12 },
});
