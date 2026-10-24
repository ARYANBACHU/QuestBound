// Owner: AB. Muse's chat sheet: lavender bottom sheet, per-screen suggestion chips, tappable actions.
import { usePathname, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ScrollViewInstance, ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wizardChat } from '@/lib/api';
import { useChat } from '@/lib/chat';
import { USE_MOCKS } from '@/lib/env';
import { useFellowship } from '@/lib/fellowship';
import { useMissions, useStoryline } from '@/lib/game';
import { useSession } from '@/lib/session';
import { fonts, ink, radius, space, type } from '@/shared/theme';
import { T } from '@/components/shell/T';
import { localMuse } from './localMuse';
import { MuseAvatar } from './MuseAvatar';
import { planMeetup } from './planMeetup';
import { actionLabel, runAction } from './runAction';
import { SCREEN_GREETINGS, SCREEN_SUGGESTIONS, screenFromPath } from './screens';
import { useTypewriter } from './useTypewriter';
import { useWizard, type WizardMsg } from './WizardProvider';

export function WizardSheet() {
  const wiz = useWizard();
  const router = useRouter();
  const screen = screenFromPath(usePathname());
  const insets = useSafeAreaInsets();
  const { userId } = useSession();
  const { fellowship, members } = useFellowship();
  const { storyline, activePage } = useStoryline(fellowship?.id ?? null);
  const { missions } = useMissions(storyline?.id ?? null);
  const chat = useChat(fellowship?.id ?? null);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const { messages, setMessages } = wiz;

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || thinking) return;
    const userMsg: WizardMsg = { id: `u-${Date.now()}`, role: 'user', content: q };
    const history = [...messages, userMsg];
    setMessages(history);
    setDraft('');
    setThinking(true);
    const ctx = { meId: userId, members, storyline, activePage, missions };
    if (/meet ?up|plan (a|our)|hang ?out/i.test(q)) {
      const plan = planMeetup(members, missions.filter((m) => m.page_id === activePage?.id), userId);
      if (plan) {
        await new Promise((r) => setTimeout(r, 600));
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: plan.reply, post: plan.post,
          actions: plan.mission ? [{ type: 'open_mission', target: plan.mission.id }] : [] }]);
        setThinking(false);
        return;
      }
    }
    let reply;
    try {
      reply = USE_MOCKS
        ? (await new Promise((r) => setTimeout(r, 700)), localMuse(q, screen, ctx))
        : await wizardChat({
            fellowship_id: fellowship?.id ?? null,
            screen,
            messages: history.slice(-12).map(({ role, content }) => ({ role, content })),
          });
      if (!reply?.reply) throw new Error('empty reply');
    } catch {
      reply = localMuse(q, screen, ctx); // Muse is never silent
    }
    // only keep actions we can actually perform
    const actions = (reply.actions ?? []).filter((a) => a.type !== 'open_mission' || missions.some((m) => m.id === a.target)).slice(0, 2);
    setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply.reply, actions }]);
    setThinking(false);
  }, [thinking, messages, setMessages, userId, members, storyline, activePage, missions, screen, fellowship?.id]);

  // A question passed via useWizard().open('...') is asked as soon as the sheet opens.
  useEffect(() => {
    if (!wiz.sheetOpen) return;
    const q = wiz.consumePending();
    if (q) ask(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wiz.sheetOpen]);

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length, thinking]);

  const lastId = messages[messages.length - 1]?.id;

  return (
    <Modal visible={wiz.sheetOpen} transparent animationType="slide" onRequestClose={wiz.close}>
      <Pressable style={styles.backdrop} onPress={wiz.close} accessibilityLabel="Close Muse" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <MuseAvatar size={36} />
            <View style={{ flex: 1 }}>
              <T variant="heading">Muse</T>
              <T variant="small">The Wizard · knows your whole tale</T>
            </View>
            <Pressable onPress={wiz.close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <T variant="heading">✕</T>
            </Pressable>
          </View>

          <ScrollView ref={scroll} style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
            <Bubble role="assistant" content={SCREEN_GREETINGS[screen]} animate={false} />
            {messages.map((m) => (
              <View key={m.id}>
                <Bubble role={m.role} content={m.content} animate={m.role === 'assistant' && m.id === lastId} />
                {m.post ? (
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.actionChip, styles.postChip]}
                      accessibilityRole="button"
                      onPress={async () => {
                        const body = m.post!;
                        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, post: undefined } : x)));
                        try {
                          await chat.send(body);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                          setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant',
                            content: 'Posted to the fellowship chat! I’ll be listening for thumbs.',
                            actions: [{ type: 'navigate', target: 'friends' }] }]);
                        } catch {
                          setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant',
                            content: 'My raven got lost on the way to the chat. Try again in a moment.', post: body }]);
                        }
                      }}
                    >
                      <T variant="smallBold" color={ink.ink}>📜 Post to the fellowship</T>
                    </Pressable>
                  </View>
                ) : null}
                {m.actions?.length ? (
                  <View style={styles.actions}>
                    {m.actions.map((a, i) => (
                      <Pressable
                        key={i}
                        style={styles.actionChip}
                        accessibilityRole="button"
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          wiz.close();
                          runAction(router, a);
                        }}
                      >
                        <T variant="smallBold" color={ink.page}>
                          {actionLabel(a, a.type === 'open_mission' ? missions.find((x) => x.id === a.target)?.title : undefined)} →
                        </T>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
            {thinking ? (
              <View style={styles.thinking}>
                <ActivityIndicator color={ink.inkSoft} size="small" />
                <T variant="story">Muse strokes his beard…</T>
              </View>
            ) : null}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {SCREEN_SUGGESTIONS[screen].map((s) => (
              <Pressable key={s} style={styles.chip} onPress={() => ask(s)} disabled={thinking} accessibilityRole="button">
                <T variant="smallBold" color={ink.ink}>{s}</T>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask Muse anything…"
              placeholderTextColor={ink.muted}
              style={styles.input}
              onSubmitEditing={() => ask(draft)}
              returnKeyType="send"
              maxLength={400}
            />
            <Pressable
              onPress={() => ask(draft)}
              disabled={!draft.trim() || thinking}
              style={[styles.send, (!draft.trim() || thinking) && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel="Send"
            >
              <T variant="bodyBold" color={ink.page}>↑</T>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Bubble({ role, content, animate }: { role: 'user' | 'assistant'; content: string; animate: boolean }) {
  const { shown } = useTypewriter(content, 18, animate);
  const mine = role === 'user';
  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <T variant="body" color={mine ? ink.page : ink.ink}>{shown}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(33,26,59,0.35)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '82%', minHeight: '60%', backgroundColor: ink.lavenderMist, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 2, borderBottomWidth: 0, borderColor: ink.ink,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: ink.muted, marginTop: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  list: { flex: 1 },
  listContent: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.sm },
  bubble: { maxWidth: '86%', paddingVertical: space.sm + 2, paddingHorizontal: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: ink.ink },
  theirs: { alignSelf: 'flex-start', backgroundColor: ink.page, borderTopLeftRadius: 6 },
  mine: { alignSelf: 'flex-end', backgroundColor: ink.ink, borderTopRightRadius: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  postChip: { backgroundColor: ink.gold, borderWidth: 2, borderColor: ink.ink },
  actionChip: { backgroundColor: ink.ink, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.md },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  chipsRow: { flexGrow: 0, flexShrink: 0 },
  chips: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  chip: { borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill, paddingVertical: space.xs + 2, paddingHorizontal: space.md, backgroundColor: ink.page },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.xs },
  input: {
    flex: 1, minHeight: 46, borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill, paddingHorizontal: space.lg,
    backgroundColor: ink.page, fontFamily: fonts.body, fontSize: type.body, color: ink.ink,
  },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: ink.ink, alignItems: 'center', justifyContent: 'center' },
});
