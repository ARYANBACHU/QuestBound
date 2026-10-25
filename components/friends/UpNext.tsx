// Owner: MP. One slim "what now?" strip under the Friends header — useful content instead of decoration.
// Works with no storyline (a friend joined before the founder summoned one), while Sage is writing, mid-book and
// when the book is done. Never throws on missing data.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { fonts, ink, moodFor, space, type, ui } from '@/shared/theme';
import type { FellowshipMember, Mission, Page, Storyline } from '@/shared/types';
import { heroName } from '@/lib/fellowship';
import { openInMaps } from '@/lib/maps';
import { haptic } from './haptics';

export interface UpNextProps {
  storyline: Storyline | null;
  pages: Page[];
  activePage: Page | null;
  missions: Mission[];
  members: FellowshipMember[];
  myId: string | null;
  loading: boolean;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/** The open mission on the active page that suits me best: assigned to me, then open to anyone, then any. */
export function nextMissionFor(myId: string | null, activePage: Page | null, missions: Mission[]): Mission | null {
  if (!activePage) return null;
  const open = missions.filter((m) => m.page_id === activePage.id && m.status === 'open');
  const mine = (m: Mission) => !!myId && (m.assignee_ids ?? []).includes(myId);
  return open.find(mine) ?? open.find((m) => !(m.assignee_ids ?? []).length) ?? open[0] ?? null;
}

export default function UpNext({ storyline, pages, activePage, missions, members, myId, loading }: UpNextProps) {
  if (loading && !storyline) return null;
  const mood = moodFor(activePage?.template_id ?? pages[0]?.template_id);

  let eyebrow: string;
  let line: string;
  let action: { label: string; go: () => void } | null = null;
  let place: Mission['place'] = null;

  if (!storyline) {
    const founder = members.find((m) => m.role === 'founder');
    const founderIsMe = !!founder && founder.user_id === myId;
    eyebrow = 'The book is still blank';
    line = founderIsMe || !founder
      ? 'Summon your first tale and the adventure begins.'
      : `Waiting for ${heroName(founder.profile)} to summon the story… or summon it yourself.`;
    action = { label: 'Summon', go: () => router.navigate('/(tabs)/missions') };
  } else if (storyline.status === 'generating') {
    eyebrow = 'Sage is writing';
    line = `“${storyline.title || 'Your tale'}” is taking shape. Chat while the ink dries.`;
  } else if (storyline.status === 'complete') {
    eyebrow = 'The book is finished';
    line = 'Relive it together in the Storybook.';
    action = { label: 'Open', go: () => router.navigate('/(tabs)/storybook') };
  } else {
    const next = nextMissionFor(myId, activePage, missions);
    const chapter = activePage ? `Chapter ${ROMAN[activePage.chapter_number] ?? activePage.chapter_number}` : 'This chapter';
    if (next) {
      eyebrow = `Up next · ${chapter}`;
      line = next.title;
      place = next.place;
      action = { label: 'Go', go: () => router.push({ pathname: '/mission/[id]', params: { id: next.id } }) };
    } else if (activePage && missions.some((m) => m.page_id === activePage.id && m.status === 'pending')) {
      eyebrow = chapter;
      line = 'Sage is weighing your proof. Hold tight.';
    } else {
      return null;
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: mood.tint, borderColor: mood.deep }]}>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && action && styles.pressed]}
        disabled={!action}
        onPress={() => {
          haptic.tap();
          action?.go();
        }}
        accessibilityRole={action ? 'button' : undefined}
        accessibilityLabel={`${eyebrow}. ${line}`}
      >
        <View style={styles.text}>
          <Text style={[styles.eyebrow, { color: mood.deep }]} numberOfLines={1}>
            {eyebrow}
          </Text>
          <Text style={styles.line} numberOfLines={2}>
            {line}
          </Text>
        </View>
        {action ? (
          <View style={[styles.go, { backgroundColor: mood.deep }]}>
            <Text style={[styles.goText, { color: mood.onDeep }]}>{action.label}</Text>
          </View>
        ) : null}
      </Pressable>
      {place ? (
        <Pressable
          onPress={() => {
            haptic.tap();
            void openInMaps(place);
          }}
          hitSlop={6}
          style={styles.placeRow}
          accessibilityRole="link"
          accessibilityLabel={`Open ${place.title} in Maps`}
        >
          <Text style={[styles.place, { color: mood.deep }]} numberOfLines={1}>
            📍 {place.title} · Open in Maps
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: space.lg, marginBottom: space.sm, borderWidth: ui.borderWidth, borderRadius: ui.cardRadius, overflow: 'hidden' },
  main: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm + 2, paddingHorizontal: space.md },
  pressed: { opacity: 0.85 },
  text: { flex: 1 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  line: { fontFamily: fonts.bodyBold, fontSize: type.body - 1, color: ink.ink, marginTop: 1 },
  go: { borderRadius: ui.buttonRadius, paddingHorizontal: space.lg, paddingVertical: space.sm },
  goText: { fontFamily: fonts.bodyBold, fontSize: type.small + 1 },
  placeRow: { paddingHorizontal: space.md, paddingBottom: space.sm, marginTop: -4 },
  place: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
