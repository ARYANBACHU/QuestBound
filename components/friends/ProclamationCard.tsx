// Owner: MP. A proclamation in the group chat: a parchment scroll card with a gold wax seal (actor's crest),
// a stripe in the crayon that painted the region, and Muse's line in Fraunces italic. Tap → where it happened.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { haptic } from './haptics';
import { router } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { fonts, ink, radius, space, type } from '@/shared/theme';
import type { FellowshipMember, Message } from '@/shared/types';
import { profileOf } from '@/lib/fellowship';
import { crestEmoji } from './Crest';
import { crayonHex } from './color';

const EVENT_LABEL: Record<string, string> = {
  mission_complete: 'Mission complete',
  page_complete: 'A page is finished',
  book_complete: 'The book is complete',
  storyline_ready: 'A new tale begins',
  member_joined: 'A new hero arrives',
};
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
  /** Play the seal stamp (only for proclamations that arrive while the chat is open). */
  fresh?: boolean;
  /** Called for member_joined (the Friends tab switches to the Fellowship view). */
  onShowFellowship?: () => void;
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

export default function ProclamationCard({ message, members, fresh, onShowFellowship }: ProclamationCardProps) {
  const p = message.payload;
  const event = p?.event ?? '';
  const actor = profileOf(members, p?.user_id ?? message.user_id);
  const stripe = p?.color ? crayonHex(p.color) : actor ? crayonHex(actor.color) : ink.gold;
  const seal = actor && (event === 'mission_complete' || event === 'member_joined') ? crestEmoji(actor.crest) : (EVENT_SEAL[event] ?? (actor ? crestEmoji(actor.crest) : '📜'));
  const tappable = !!EVENT_CTA[event];

  return (
    <View style={styles.wrap}>
      <Pressable
        disabled={!tappable}
        onPress={() => {
          openProclamation(message, onShowFellowship);
          haptic.tap();
        }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole={tappable ? 'button' : undefined}
        accessibilityLabel={`Proclamation. ${message.body}`}
      >
        <View style={[styles.stripe, { backgroundColor: stripe }]} />
        <View style={styles.row}>
          <Animated.View entering={fresh ? ZoomIn.springify().damping(9) : undefined} style={styles.seal}>
            <View style={styles.sealInner}>
              <Text style={styles.sealEmoji} allowFontScaling={false}>
                {seal}
              </Text>
            </View>
          </Animated.View>
          <View style={styles.content}>
            <Text style={styles.label}>{EVENT_LABEL[event] ?? 'Proclamation'}</Text>
            <Text style={styles.body}>{message.body}</Text>
            {p?.image_url ? <Image source={{ uri: p.image_url }} style={styles.thumb} contentFit="cover" transition={200} /> : null}
            {tappable ? <Text style={styles.cta}>{EVENT_CTA[event]} ›</Text> : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const SEAL = 52;
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, marginVertical: space.sm, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: ink.page,
    borderWidth: 3,
    borderColor: ink.ink,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  stripe: { height: 6, borderBottomWidth: 2, borderBottomColor: ink.ink },
  row: { flexDirection: 'row', padding: space.md, gap: space.md, alignItems: 'flex-start' },
  seal: {
    width: SEAL,
    height: SEAL,
    borderRadius: SEAL / 2,
    backgroundColor: ink.gold,
    borderWidth: 3,
    borderColor: ink.ink,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  sealInner: {
    width: SEAL - 14,
    height: SEAL - 14,
    borderRadius: (SEAL - 14) / 2,
    borderWidth: 1.5,
    borderColor: ink.ink,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealEmoji: { fontSize: 22 },
  content: { flex: 1 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, color: ink.inkSoft, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 2 },
  body: { fontFamily: fonts.displayItalic, fontSize: type.body + 1, lineHeight: 23, color: ink.ink },
  thumb: { marginTop: space.sm, width: '100%', aspectRatio: 4 / 3, borderRadius: radius.sm, borderWidth: 2, borderColor: ink.ink, backgroundColor: ink.lavenderMist },
  cta: { fontFamily: fonts.bodyBold, fontSize: type.small, color: ink.inkSoft, marginTop: space.sm },
});
