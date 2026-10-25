// Owner: MP. A proclamation in the group chat: a parchment card edged in the crayon that painted the region, a gold
// seal with the hero's crest, and Sage's line in Fraunces italic. Tap → where it happened. If the mission has a
// place: "Open in Maps" (always lib/maps openInMaps) and, separately, a small "Website" link.
import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { accent, fonts, ink, panel, radius, shadow, space, type, ui } from '@/shared/theme';
import type { FellowshipMember, Message, Mission } from '@/shared/types';
import { profileOf } from '@/lib/fellowship';
import { openInMaps } from '@/lib/maps';
import { crestEmoji } from './Crest';
import { crayonHex } from './color';
import { haptic } from './haptics';

const EVENT_SEAL: Record<string, string> = {
  page_complete: '📖',
  book_complete: '👑',
  storyline_ready: '📜',
  member_joined: '🛡️',
};
const EVENT_CTA: Record<string, string> = {
  mission_complete: 'See the mission',
  page_complete: 'See the page',
  book_complete: 'Open the storybook',
  storyline_ready: 'Open the storybook',
  member_joined: 'Meet the fellowship',
};

export interface ProclamationCardProps {
  message: Message;
  members: FellowshipMember[];
  /** The completed mission (mission_complete) — shows its place with Open in Maps. */
  mission?: Mission;
  /** Play the seal stamp (only for proclamations that arrive while the chat is open). */
  fresh?: boolean;
  /** Called for member_joined (the Friends tab shows the fellowship). */
  onShowFellowship?: () => void;
  /** Long-press (e.g. open the reaction picker). */
  onLongPress?: () => void;
  /** Called once when a fresh card mounts (so the list never replays the stamp). */
  onPlayed?: () => void;
}

export function openProclamation(message: Message, onShowFellowship?: () => void) {
  const p = message.payload;
  if (!p) return;
  switch (p.event) {
    case 'mission_complete':
      if (p.mission_id) router.push({ pathname: '/mission/[id]', params: { id: p.mission_id } });
      return;
    case 'page_complete':
      router.navigate('/(tabs)/coloring');
      return;
    case 'book_complete':
    case 'storyline_ready':
      router.navigate('/(tabs)/storybook');
      return;
    case 'member_joined':
      onShowFellowship?.();
      return;
  }
}

export default function ProclamationCard({ message, members, mission, fresh, onShowFellowship, onLongPress, onPlayed }: ProclamationCardProps) {
  useEffect(() => {
    if (fresh) onPlayed?.();
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const p = message.payload;
  const event = p?.event ?? '';
  const actor = profileOf(members, p?.user_id ?? message.user_id);
  const edge = p?.color ? crayonHex(p.color) : actor ? crayonHex(actor.color) : ink.gold;
  const seal = actor && (event === 'mission_complete' || event === 'member_joined') ? crestEmoji(actor.crest) : (EVENT_SEAL[event] ?? (actor ? crestEmoji(actor.crest) : '📜'));
  const tappable = !!EVENT_CTA[event];
  const place = event === 'mission_complete' ? mission?.place ?? null : null;

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { borderLeftColor: edge }]}>
        <Pressable
          disabled={!tappable && !onLongPress}
          onLongPress={onLongPress}
          delayLongPress={300}
          onPress={() => {
            if (!tappable) return;
            haptic.tap();
            openProclamation(message, onShowFellowship);
          }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          accessibilityRole={tappable ? 'button' : undefined}
          accessibilityLabel={`Proclamation. ${message.body}`}
          accessibilityHint={tappable ? EVENT_CTA[event] : undefined}
        >
          <Animated.View entering={fresh ? ZoomIn.springify().damping(9) : undefined} style={styles.seal}>
            <Text style={styles.sealEmoji} allowFontScaling={false}>
              {seal}
            </Text>
          </Animated.View>
          <View style={styles.content}>
            <Text style={styles.body}>{message.body}</Text>
            {p?.image_url ? <Image source={{ uri: p.image_url }} style={styles.thumb} contentFit="cover" transition={200} /> : null}
            {tappable ? <Text style={styles.cta}>{EVENT_CTA[event]} ›</Text> : null}
          </View>
        </Pressable>
        {place ? (
          <View style={styles.placeRow}>
            <Pressable
              onPress={() => {
                haptic.tap();
                void openInMaps(place);
              }}
              hitSlop={6}
              style={({ pressed }) => [styles.placeMain, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel={`Open ${place.title} in Maps`}
            >
              <Text style={styles.place} numberOfLines={1}>
                📍 {place.title}
              </Text>
              <Text style={styles.maps}>Open in Maps</Text>
            </Pressable>
            {place.website ? (
              <Pressable
                onPress={() => void Linking.openURL(place.website!).catch(() => {})}
                hitSlop={6}
                accessibilityRole="link"
                accessibilityLabel={`${place.title} website`}
              >
                <Text style={styles.website}>Website</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const SEAL = 44;
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, marginVertical: space.sm, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: panel.parchment,
    borderWidth: ui.borderWidth,
    borderLeftWidth: 7,
    borderColor: ink.ink,
    borderRadius: ui.cardRadius, // no overflow:hidden — it would clip the iOS shadow; no child paints an edge
    ...shadow.sm,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', padding: space.md, gap: space.md, alignItems: 'flex-start' },
  seal: {
    width: SEAL,
    height: SEAL,
    borderRadius: SEAL / 2,
    backgroundColor: ink.gold,
    borderWidth: ui.borderWidth,
    borderColor: ink.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealEmoji: { fontSize: 21 },
  content: { flex: 1 },
  body: { fontFamily: fonts.displayItalic, fontSize: type.body + 1, lineHeight: 23, color: ink.ink },
  thumb: { marginTop: space.sm, width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, borderWidth: 2, borderColor: ink.ink, backgroundColor: ink.lavenderMist },
  cta: { fontFamily: fonts.bodyBold, fontSize: type.small, color: accent.primary, marginTop: space.sm },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderTopWidth: 1.5,
    borderTopColor: panel.parchmentEdge,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  placeMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  place: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: type.small, color: ink.ink },
  maps: { fontFamily: fonts.bodyBold, fontSize: type.small, color: accent.secondary },
  website: { fontFamily: fonts.body, fontSize: 12, color: ink.inkSoft, textDecorationLine: 'underline' },
});
