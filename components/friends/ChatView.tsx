// Owner: MP. The fellowship group chat: texts, proclamations (scroll cards), system lines, Muse, day separators.
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { haptic } from './haptics';
import { fonts, ink, radius, space, type } from '@/shared/theme';
import type { FellowshipMember } from '@/shared/types';
import type { ChatMessage, ChatState } from '@/lib/chat';
import { heroName, profileOf } from '@/lib/fellowship';
import Crest from './Crest';
import ProclamationCard from './ProclamationCard';
import { crayonHex, textOn } from './color';
import { ReactionChips, ReactionPicker } from './Reactions';

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
}

export default function ChatView({ chat, members, myId, onShowFellowship, onOpenMember }: ChatViewProps) {
  const rows = useMemo(() => buildRows(chat.messages), [chat.messages]);
  // Proclamations that arrive after the chat opened get the seal-stamp animation.
  const openedAt = useRef(new Date().toISOString()).current;
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const extraData = useMemo(() => ({ pickerFor, reactions: chat.reactions }), [pickerFor, chat.reactions]);
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
          <View style={styles.dayLine} />
          <Text style={styles.day}>{item.label}</Text>
          <View style={styles.dayLine} />
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
            fresh={m.created_at > openedAt}
            onShowFellowship={onShowFellowship}
            onLongPress={() => openPicker(m.id)}
          />
        );
      case 'system':
        return <Text style={styles.system}>{m.body}</Text>;
      case 'wizard':
        return <WizardBubble m={m} first={first} last={last} onLongPress={() => openPicker(m.id)} />;
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.flex}>
        {chat.loading && chat.messages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={ink.ink} />
            <Text style={styles.muted}>Unrolling the scrolls…</Text>
          </View>
        ) : chat.messages.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🧙</Text>
            <Text style={styles.empty}>The fellowship is quiet. Say hello, or pick a mission to start the story.</Text>
            {chat.error ? <Text style={styles.error}>{chat.error}</Text> : null}
          </View>
        ) : (
          <FlatList
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
      </View>
      {typing.length ? (
        <Text style={styles.typing} numberOfLines={1}>
          {typing.length === 1 ? `${heroName(typing[0])} is writing…` : `${typing.length} heroes are writing…`}
        </Text>
      ) : null}
      <Composer chat={chat} />
    </KeyboardAvoidingView>
  );
}

function Composer({ chat }: { chat: ChatState }) {
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;
  const submit = () => {
    if (!canSend) return;
    const body = text;
    setText('');
    void chat.send(body);
    haptic.tap();
  };
  return (
    <View style={styles.composer}>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          if (t) chat.notifyTyping();
        }}
        placeholder="Send a message to the fellowship"
        placeholderTextColor={ink.muted}
        style={styles.input}
        multiline
        maxLength={1000}
        submitBehavior="submit"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <Pressable
        onPress={submit}
        disabled={!canSend}
        style={({ pressed }) => [styles.sendBtn, !canSend && styles.sendDisabled, pressed && styles.pressed]}
        accessibilityLabel="Send"
      >
        <Text style={styles.sendText}>Send</Text>
      </Pressable>
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
        Alert.alert('Message not sent', 'Muse could not deliver it. Try again?', [
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

function WizardBubble({ m, first, last, onLongPress }: { m: ChatMessage; first: boolean; last: boolean; onLongPress: () => void }) {
  return (
    <View style={[styles.rowTheirs, last && styles.runEnd]}>
      <View style={styles.avatarCol}>
        {first ? (
          <View style={styles.wizardAvatar}>
            <Text style={styles.wizardEmoji} allowFontScaling={false}>
              🧙
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.theirsCol}>
        {first ? <Text style={styles.name}>Muse</Text> : null}
        <Pressable onLongPress={onLongPress} delayLongPress={300} style={[styles.bubble, styles.wizard]}>
          <Text style={[styles.text, styles.wizardText]}>{m.body}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl, gap: space.sm },
  muted: { fontFamily: fonts.body, color: ink.muted, fontSize: type.small },
  emptyEmoji: { fontSize: 48 },
  empty: { fontFamily: fonts.displayItalic, fontSize: type.heading - 2, lineHeight: 26, color: ink.inkSoft, textAlign: 'center' },
  error: { fontFamily: fonts.body, fontSize: type.small, color: ink.danger, textAlign: 'center', padding: space.md },
  list: { paddingVertical: space.md },
  dayWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, marginVertical: space.md, gap: space.sm },
  dayLine: { flex: 1, height: 1.5, backgroundColor: ink.muted, opacity: 0.4 },
  day: { fontFamily: fonts.bodyBold, fontSize: 12, color: ink.muted, letterSpacing: 1, textTransform: 'uppercase' },
  system: { fontFamily: fonts.body, fontSize: type.small, color: ink.muted, textAlign: 'center', marginVertical: space.sm, paddingHorizontal: space.xl },
  rowMine: { alignItems: 'flex-end', paddingHorizontal: space.lg, marginTop: 3 },
  rowTheirs: { flexDirection: 'row', paddingHorizontal: space.md, marginTop: 3 },
  runEnd: { marginBottom: space.sm },
  avatarCol: { width: AVATAR, marginRight: space.sm, justifyContent: 'flex-start', paddingTop: 18 },
  theirsCol: { flex: 1, alignItems: 'flex-start' },
  name: { fontFamily: fonts.bodyBold, fontSize: 12, color: ink.inkSoft, marginBottom: 2, marginLeft: 4 },
  bubble: { maxWidth: '82%', paddingHorizontal: space.md, paddingVertical: 9, borderRadius: radius.lg },
  mine: { borderBottomRightRadius: 6, borderWidth: 2, borderColor: ink.ink },
  sending: { opacity: 0.6 },
  theirs: { backgroundColor: ink.page, borderWidth: 2, borderColor: ink.ink, borderBottomLeftRadius: 6 },
  wizard: { backgroundColor: ink.lavenderMist, borderWidth: 2, borderColor: ink.inkSoft, borderBottomLeftRadius: 6 },
  wizardAvatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: ink.lavenderMist, borderWidth: 2, borderColor: ink.inkSoft, alignItems: 'center', justifyContent: 'center' },
  wizardEmoji: { fontSize: 17 },
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
    paddingVertical: space.sm,
    borderTopWidth: 2,
    borderTopColor: ink.ink,
    backgroundColor: ink.paper,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 2,
    borderColor: ink.ink,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: fonts.body,
    fontSize: type.body,
    color: ink.ink,
    backgroundColor: ink.page,
  },
  sendBtn: { height: 44, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: ink.ink, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.35 },
  sendText: { fontFamily: fonts.bodyBold, fontSize: type.body, color: ink.page },
  pressed: { opacity: 0.75 },
});
