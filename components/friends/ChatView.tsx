// Owner: MP. The fellowship group chat: texts, proclamations (scroll cards), system lines, Sage, day separators.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { haptic } from './haptics';
import { SAGE_CREDIT, SAGE_SIZES, fonts, ink, panel, radius, realm, sageColors, shadow, space, type, ui } from '@/shared/theme';
import type { FellowshipMember, Mission } from '@/shared/types';
import type { ChatMessage, ChatState } from '@/lib/chat';
import { heroName, profileOf } from '@/lib/fellowship';
import Crest from './Crest';
import ProclamationCard from './ProclamationCard';
import { crayonHex, textOn } from './color';
import { ReactionChips, ReactionPicker } from './Reactions';
import { KeyboardSafe, useKeyboardVisible } from '@/components/shell/KeyboardSafe';
import { useWizard } from '@/components/wizard/WizardProvider';
import { Sage, playSfx } from './sage';
import SageTalk from './SageTalk';
import GameButton from './GameButton';

type Row =
  | { key: string; type: 'day'; label: string }
  | { key: string; type: 'msg'; m: ChatMessage; first: boolean; last: boolean };

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Today';
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const RUN_GAP_MS = 5 * 60 * 1000;

/** Chronological rows with day separators + run flags, returned newest-first for the inverted list. */
function buildRows(messages: ChatMessage[]): Row[] {
  const rows: Row[] = [];
  let lastDay = '';
  messages.forEach((m, i) => {
    const dk = dayKey(m.created_at);
    if (dk !== lastDay) {
      rows.push({ key: `day-${dk}`, type: 'day', label: dayLabel(m.created_at) });
      lastDay = dk;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const sameRun = (a?: ChatMessage, b?: ChatMessage) =>
      !!a && !!b && a.kind === b.kind && a.user_id === b.user_id && (a.kind === 'text' || a.kind === 'wizard') &&
      dayKey(a.created_at) === dayKey(b.created_at) &&
      Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < RUN_GAP_MS;
    rows.push({ key: m.id, type: 'msg', m, first: !sameRun(prev, m), last: !sameRun(m, next) });
  });
  return rows.reverse();
}

export interface ChatViewProps {
  chat: ChatState;
  members: FellowshipMember[];
  myId: string | null;
  onShowFellowship?: () => void;
  /** Tap a friend's crest → their profile sheet. */
  onOpenMember?: (userId: string) => void;
  /** Missions of the current book by id — proclamations show the mission's place (Open in Maps). */
  missionsById?: Record<string, Mission>;
  /** Composer bar color — pass the chapter mood tint so it sits calmly on the screen gradient. */
  surface?: string;
}

export default function ChatView({ chat, members, myId, onShowFellowship, onOpenMember, missionsById, surface }: ChatViewProps) {
  const rows = useMemo(() => buildRows(chat.messages), [chat.messages]);
  const listRef = useRef<FlatList<Row>>(null);
  const keyboardOpen = useKeyboardVisible();
  const scrollToNewest = () => listRef.current?.scrollToOffset({ offset: 0, animated: true });
  // Keyboard opens → jump to the newest message so you see what you're replying to.
  useEffect(() => {
    if (keyboardOpen) scrollToNewest();
  }, [keyboardOpen]);
  // My own message lands → follow it down.
  const newest = chat.messages[chat.messages.length - 1];
  useEffect(() => {
    if (newest && newest.user_id === myId) scrollToNewest();
  }, [newest?.id, newest?.user_id, myId]);
  // Messages already here when the chat opened (or finished loading) are the baseline; anything after is "fresh":
  // proclamations stamp their seal, Sage talks + pings — once per message, never on reopen or scroll-back.
  const [baseline, setBaseline] = useState<Set<string> | null>(null);
  const settled = !(chat.loading && chat.messages.length === 0);
  useEffect(() => {
    if (!baseline && settled) setBaseline(new Set(chat.messages.map((m) => m.id)));
  }, [baseline, settled, chat.messages]);
  const isFresh = (id: string) => !!baseline && !baseline.has(id) && !id.startsWith('temp-');
  const played = useRef(new Set<string>());
  const pinged = useRef(new Set<string>());
  useEffect(() => {
    if (!baseline) return;
    const fresh = chat.messages.filter(
      (m) => (m.kind === 'wizard' || m.kind === 'proclamation') && !baseline.has(m.id) && !pinged.current.has(m.id),
    );
    if (!fresh.length) return;
    fresh.forEach((m) => pinged.current.add(m.id));
    // One sound per batch: Sage's soft chime wins over the seal stamp.
    playSfx(fresh.some((m) => m.kind === 'wizard') ? 'ping' : 'seal');
  }, [baseline, chat.messages]);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const extraData = useMemo(() => ({ pickerFor, reactions: chat.reactions, baseline }), [pickerFor, chat.reactions, baseline]);
  const openPicker = (id: string) => {
    if (id.startsWith('temp-')) return;
    haptic.select();
    setPickerFor((cur) => (cur === id ? null : id));
  };

  const renderItem = ({ item }: { item: Row }) => {
    if (item.type === 'day') return renderRow(item);
    const align = item.m.kind === 'proclamation' ? 'center' : item.m.user_id && item.m.user_id === myId ? 'right' : 'left';
    const reactable = item.m.kind === 'proclamation' || item.m.kind === 'text' || item.m.kind === 'wizard';
    return (
      <View>
        {renderRow(item)}
        {reactable ? (
          <ReactionChips messageId={item.m.id} reactions={chat.reactions} myId={myId} align={align} onToggle={(e) => void chat.toggleReaction(item.m.id, e)} />
        ) : null}
        {pickerFor === item.m.id ? (
          <ReactionPicker
            align={align}
            onPick={(e) => {
              setPickerFor(null);
              void chat.toggleReaction(item.m.id, e);
            }}
          />
        ) : null}
      </View>
    );
  };

  const renderRow = (item: Row) => {
    if (item.type === 'day') {
      return (
        <View style={styles.dayWrap}>
          <Text style={styles.day}>{item.label}</Text>
        </View>
      );
    }
    const { m, first, last } = item;
    switch (m.kind) {
      case 'proclamation':
        return (
          <ProclamationCard
            message={m}
            members={members}
            mission={m.payload?.mission_id ? missionsById?.[m.payload.mission_id] : undefined}
            fresh={isFresh(m.id) && !played.current.has(m.id)}
            onPlayed={() => played.current.add(m.id)}
            onShowFellowship={onShowFellowship}
            onLongPress={() => openPicker(m.id)}
          />
        );
      case 'system':
        return <Text style={styles.system}>{m.body}</Text>;
      case 'wizard':
        return (
          <WizardBubble
            m={m}
            first={first}
            last={last}
            talk={isFresh(m.id) && !played.current.has(m.id)}
            onPlayed={() => played.current.add(m.id)}
            onLongPress={() => openPicker(m.id)}
          />
        );
      default:
        return m.user_id && m.user_id === myId ? (
          <MyBubble m={m} chat={chat} members={members} last={last} onLongPress={() => openPicker(m.id)} />
        ) : (
          <TheirBubble m={m} members={members} first={first} last={last} onLongPress={() => openPicker(m.id)} onOpenMember={onOpenMember} />
        );
    }
  };

  const typing = chat.typingUserIds.map((id) => profileOf(members, id)).filter(Boolean);

  return (
    <KeyboardSafe dismissOnTap={false}>
      <Pressable style={styles.flex} onPress={Keyboard.dismiss} accessible={false}>
        {chat.loading && chat.messages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={ink.ink} />
            <Text style={styles.muted}>Unrolling the scrolls…</Text>
          </View>
        ) : chat.messages.length === 0 ? (
          <View style={styles.center}>
            <Sage expression="idle" size="md" />
            <Text style={styles.empty}>The fellowship is quiet. Say hello, or pick a mission to start the story.</Text>
            {chat.error ? <Text style={styles.error}>{chat.error}</Text> : null}
          </View>
        ) : (
          <FlatList
            ref={listRef}
            inverted
            data={rows}
            keyExtractor={(r) => r.key}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            extraData={extraData}
            onScrollBeginDrag={() => setPickerFor(null)}
            ListFooterComponent={chat.error ? <Text style={styles.error}>{chat.error}</Text> : undefined}
          />
        )}
      </Pressable>
      {typing.length ? (
        <Text style={styles.typing} numberOfLines={1}>
          {typing.length === 1 ? `${heroName(typing[0])} is writing…` : `${typing.length} heroes are writing…`}
        </Text>
      ) : null}
      <Composer chat={chat} keyboardOpen={keyboardOpen} onSent={scrollToNewest} surface={surface} />
    </KeyboardSafe>
  );
}

const WEB = Platform.OS === 'web';
const INPUT_MIN = ui.buttonHeightSm + ui.buttonDepth;
const INPUT_MAX = 120;

function Composer({ chat, keyboardOpen, onSent, surface }: { chat: ChatState; keyboardOpen: boolean; onSent: () => void; surface?: string }) {
  const [text, setText] = useState('');
  // Web only: a <textarea> doesn't grow on its own and starts 2 rows tall. Start at 1 row and follow the content.
  const [webHeight, setWebHeight] = useState(INPUT_MIN);
  const { open: askSage, openDemoTools } = useWizard();
  const canSend = text.trim().length > 0;
  const submit = () => {
    if (!canSend) return;
    const body = text;
    setText('');
    if (WEB) setWebHeight(INPUT_MIN);
    void chat.send(body);
    onSent();
    haptic.tap();
    playSfx('send');
  };
  return (
    <View style={[styles.composer, surface ? { backgroundColor: surface } : null]}>
      {/* One slot: ⌄ while typing; otherwise Sage lives here (the floating Sage button is hidden on the chat so it
          never covers the newest messages). Long-press keeps the floating button's demo tools. */}
      {keyboardOpen ? (
        <Pressable onPress={Keyboard.dismiss} hitSlop={8} style={({ pressed }) => [styles.hideKb, pressed && styles.pressed]} accessibilityLabel="Hide keyboard">
          <Text style={styles.hideKbText}>⌄</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => {
            haptic.select();
            playSfx('open');
            askSage();
          }}
          onLongPress={() => {
            haptic.tap();
            playSfx('open');
            openDemoTools();
          }}
          delayLongPress={600}
          hitSlop={6}
          style={({ pressed }) => [styles.askSage, pressed && styles.askSagePressed]}
          accessibilityRole="button"
          accessibilityLabel="Ask Sage the wizard"
          accessibilityHint="Long-press for demo tools"
        >
          <Sage size={38} variant="face" still />
        </Pressable>
      )}
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          if (t) chat.notifyTyping();
          else if (WEB) setWebHeight(INPUT_MIN);
        }}
        placeholder="Message the fellowship"
        placeholderTextColor={ink.muted}
        style={[styles.input, WEB && { height: webHeight }]}
        multiline
        maxLength={1000}
        submitBehavior="submit"
        returnKeyType="send"
        onSubmitEditing={submit}
        {...(WEB
          ? {
              rows: 1,
              // scrollHeight includes padding, not the border.
              onContentSizeChange: (e: { nativeEvent: { contentSize: { height: number } } }) =>
                setWebHeight(Math.min(INPUT_MAX, Math.max(INPUT_MIN, e.nativeEvent.contentSize.height + ui.borderWidth * 2))),
              // react-native-web ignores submitBehavior on a multiline input: Enter sends, Shift+Enter is a new line.
              onKeyPress: (e: { nativeEvent: { key: string; shiftKey?: boolean; isComposing?: boolean }; preventDefault?: () => void }) => {
                const k = e.nativeEvent;
                if (k.key === 'Enter' && !k.shiftKey && !k.isComposing) {
                  e.preventDefault?.();
                  submit();
                }
              },
            }
          : null)}
      />
      <GameButton label="Send" size="sm" onPress={submit} disabled={!canSend} />
    </View>
  );
}

function MyBubble({ m, chat, members, last, onLongPress }: { m: ChatMessage; chat: ChatState; members: FellowshipMember[]; last: boolean; onLongPress: () => void }) {
  const me = profileOf(members, m.user_id);
  const bg = crayonHex(me?.color);
  const fg = textOn(me?.color);
  const failed = m.status === 'failed';
  const onPress = failed
    ? () => {
        haptic.warning();
        Alert.alert('Message not sent', 'Sage could not deliver it. Try again?', [
          { text: 'Delete', style: 'destructive', onPress: () => chat.discard(m.id) },
          { text: 'Retry', onPress: () => void chat.retry(m.id) },
        ]);
      }
    : undefined;
  return (
    <View style={[styles.rowMine, last && styles.runEnd]}>
      <Pressable onPress={onPress} onLongPress={failed ? undefined : onLongPress} delayLongPress={300} style={[styles.bubble, styles.mine, { backgroundColor: bg }, m.status === 'sending' && styles.sending]}>
        <Text style={[styles.text, { color: fg }]}>{m.body}</Text>
      </Pressable>
      {failed ? (
        <Text style={styles.failed} onPress={onPress}>
          Not sent · Tap to retry
        </Text>
      ) : last ? (
        <Text style={styles.meta}>{m.status === 'sending' ? 'Sending…' : timeLabel(m.created_at)}</Text>
      ) : null}
    </View>
  );
}

const AVATAR = 32;

function TheirBubble({
  m,
  members,
  first,
  last,
  onLongPress,
  onOpenMember,
}: {
  m: ChatMessage;
  members: FellowshipMember[];
  first: boolean;
  last: boolean;
  onLongPress: () => void;
  onOpenMember?: (userId: string) => void;
}) {
  const p = profileOf(members, m.user_id);
  return (
    <View style={[styles.rowTheirs, last && styles.runEnd]}>
      <View style={styles.avatarCol}>
        {first ? (
          <Pressable onPress={() => m.user_id && onOpenMember?.(m.user_id)} hitSlop={6} accessibilityLabel={`Open ${p?.display_name ?? 'member'}`}>
            <Crest crest={p?.crest} color={p?.color} size={AVATAR} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.theirsCol}>
        {first ? <Text style={styles.name}>{p ? heroName(p) : 'A wanderer'}</Text> : null}
        <Pressable onLongPress={onLongPress} delayLongPress={300} style={[styles.bubble, styles.theirs]}>
          <Text style={styles.text}>{m.body}</Text>
        </Pressable>
        {last ? <Text style={[styles.meta, styles.metaLeft]}>{timeLabel(m.created_at)}</Text> : null}
      </View>
    </View>
  );
}

function WizardBubble({
  m,
  first,
  last,
  talk,
  onPlayed,
  onLongPress,
}: {
  m: ChatMessage;
  first: boolean;
  last: boolean;
  talk: boolean;
  onPlayed: () => void;
  onLongPress: () => void;
}) {
  const bubble = (
    <Pressable onLongPress={onLongPress} delayLongPress={300} style={[styles.bubble, styles.wizard]}>
      <Text style={[styles.text, styles.wizardText]}>{m.body}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.rowTheirs, last && styles.runEnd]}>
      <View style={styles.sageCol}>
        {first ? (
          <SageTalk talk={talk} onPlayed={onPlayed}>
            <Sage expression="happy" size="sm" />
          </SageTalk>
        ) : null}
      </View>
      <View style={styles.theirsCol}>
        {first ? (
          <Text style={styles.name}>
            Sage<Text style={styles.credit}>{`  ${SAGE_CREDIT}`}</Text>
          </Text>
        ) : null}
        {first ? (
          bubble
        ) : (
          // No avatar on follow-up lines: the bubble itself does the little talk.
          <SageTalk talk={talk} onPlayed={onPlayed}>
            {bubble}
          </SageTalk>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl, gap: space.sm },
  muted: { fontFamily: fonts.body, color: ink.muted, fontSize: type.small },
  empty: { fontFamily: fonts.displayItalic, fontSize: type.heading - 2, lineHeight: 26, color: ink.inkSoft, textAlign: 'center' },
  error: { fontFamily: fonts.body, fontSize: type.small, color: ink.danger, textAlign: 'center', padding: space.md },
  list: { paddingVertical: space.md },
  dayWrap: { alignItems: 'center', marginVertical: space.md },
  day: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: ink.inkSoft,
    letterSpacing: 1,
    textTransform: 'uppercase',
    backgroundColor: panel.parchment,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: space.md,
    paddingVertical: 3,
  },
  system: { fontFamily: fonts.body, fontSize: type.small, color: ink.inkSoft, textAlign: 'center', marginVertical: space.sm, paddingHorizontal: space.xl },
  rowMine: { alignItems: 'flex-end', paddingHorizontal: space.lg, marginTop: 3 },
  rowTheirs: { flexDirection: 'row', paddingHorizontal: space.md, marginTop: 3 },
  runEnd: { marginBottom: space.sm },
  avatarCol: { width: AVATAR, marginRight: space.sm, justifyContent: 'flex-start', paddingTop: 18 },
  theirsCol: { flex: 1, alignItems: 'flex-start' },
  name: { fontFamily: fonts.bodyBold, fontSize: 12, color: ink.inkSoft, marginBottom: 2, marginLeft: 4 },
  bubble: { maxWidth: '82%', paddingHorizontal: space.md, paddingVertical: 9, borderRadius: radius.lg },
  mine: { borderBottomRightRadius: 6, borderWidth: ui.borderWidth, borderColor: ink.ink },
  sending: { opacity: 0.6 },
  theirs: { backgroundColor: panel.parchment, borderWidth: ui.borderWidth, borderColor: ink.ink, borderBottomLeftRadius: 6 },
  wizard: { backgroundColor: realm.royalMist, borderWidth: ui.borderWidth, borderColor: sageColors.robe, borderBottomLeftRadius: 6 },
  sageCol: { width: SAGE_SIZES.sm, marginRight: space.sm, justifyContent: 'flex-start', paddingTop: 14 },
  credit: { fontFamily: fonts.body, fontSize: 11, color: ink.muted },
  wizardText: { fontFamily: fonts.displayItalic },
  text: { fontFamily: fonts.body, fontSize: type.body, lineHeight: 21, color: ink.ink },
  meta: { fontFamily: fonts.body, fontSize: 11, color: ink.muted, marginTop: 2 },
  metaLeft: { marginLeft: 4 },
  failed: { fontFamily: fonts.bodyBold, fontSize: 12, color: ink.danger, marginTop: 3 },
  typing: { fontFamily: fonts.displayItalic, fontSize: type.small, color: ink.inkSoft, paddingHorizontal: space.lg, paddingBottom: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.sm - 2,
    backgroundColor: ink.paper,
    ...shadow.sm,
  },
  input: {
    flex: 1,
    minHeight: INPUT_MIN,
    maxHeight: INPUT_MAX,
    borderWidth: ui.borderWidth,
    borderColor: ink.ink,
    borderRadius: ui.buttonRadius,
    paddingHorizontal: space.md,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: fonts.body,
    fontSize: type.body,
    color: ink.ink,
    backgroundColor: panel.parchment,
  },
  askSage: {
    width: INPUT_MIN,
    height: INPUT_MIN,
    borderRadius: INPUT_MIN / 2,
    backgroundColor: realm.royalMist,
    borderWidth: ui.borderWidth,
    borderColor: ink.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  askSagePressed: { transform: [{ scale: 0.93 }] },
  hideKb: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  hideKbText: { fontFamily: fonts.bodyBold, fontSize: 26, lineHeight: 30, color: ink.inkSoft, marginTop: -8 },
  pressed: { opacity: 0.75 },
});
