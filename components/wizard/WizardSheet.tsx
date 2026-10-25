// Owner: AB. Sage's chat sheet. Three states: minimized pill · half · full screen (drag the handle, or use the buttons).
// History lives in WizardProvider (per fellowship, persisted); reopening never re-asks the API. The sheet sits flush
// on the keyboard; tapping outside dismisses the keyboard (or minimizes when the keyboard is down).
import { usePathname, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type ScrollViewInstance, ActivityIndicator, Keyboard, PanResponder, Pressable, ScrollView, StyleSheet, TextInput,
  View, useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wizardChat } from '@/lib/api';
import { useChat } from '@/lib/chat';
import { USE_MOCKS } from '@/lib/env';
import { useFellowship } from '@/lib/fellowship';
import { useMissions, useStoryline } from '@/lib/game';
import { useSession } from '@/lib/session';
import { accent, fonts, ink, motion, panel, realm, radius, scrim, shadow, space, type, ui } from '@/shared/theme';
import { useKeyboardInset, useKeyboardVisible } from '@/components/shell/KeyboardSafe';
import { TAB_BAR_HEIGHT } from '@/components/shell/TabBar';
import { T } from '@/components/shell/T';
import { localMuse } from './localMuse';
import { planMeetup } from './planMeetup';
import { actionLabel, runAction } from './runAction';
import { Sage, SageTitle } from './Sage';
import { SCREEN_SUGGESTIONS, screenFromPath } from './screens';
import { useTypewriter } from './useTypewriter';
import { useWizard, type WizardMsg } from './WizardProvider';
import { playSfx } from '@/components/shell/sfx';

const RADIUS = ui.cardRadius + 6;

export function WizardSheet() {
  const wiz = useWizard();
  const router = useRouter();
  const screen = screenFromPath(usePathname());
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const { userId } = useSession();
  const { fellowship, members } = useFellowship();
  const { storyline, activePage } = useStoryline(fellowship?.id ?? null);
  const { missions } = useMissions(storyline?.id ?? null);
  const chat = useChat(fellowship?.id ?? null);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const { messages, setMessages, mode, setMode } = wiz;

  // ---------- sizes + motion ----------
  const FULL = winH - insets.top - space.sm;
  const HALF = Math.min(FULL, Math.round(winH * 0.58));
  const target = mode === 'full' ? FULL : HALF;
  const h = useSharedValue(target);
  const kbInset = useKeyboardInset(0);
  const kbOpen = useKeyboardVisible();
  useEffect(() => { h.value = withTiming(target, { duration: motion.sheet }); }, [target, h]);

  const sheetStyle = useAnimatedStyle(() => {
    const k = kbInset.value;
    return { bottom: k, height: Math.max(160, Math.min(h.value, FULL - k)) };
  });

  // Drag the handle: up → full, down → half → pill.
  const dragStart = useRef(0);
  const pan = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => { dragStart.current = h.value; },
      onPanResponderMove: (_, g) => { h.value = Math.max(120, dragStart.current - g.dy); },
      onPanResponderRelease: (_, g) => {
        const end = dragStart.current - g.dy;
        const cur = modeRef.current;
        let next: typeof cur = cur;
        if (g.vy < -0.6 || end > (HALF + FULL) / 2) next = 'full';
        else if (g.vy > 0.8 || end < HALF * 0.7) next = cur === 'full' && end > HALF * 0.7 ? 'half' : 'pill';
        else next = 'half';
        Haptics.selectionAsync().catch(() => {}); playSfx('tap');
        if (next === cur) h.value = withTiming(cur === 'full' ? FULL : HALF, { duration: motion.sheet });
        if (next === 'pill') Keyboard.dismiss();
        setMode(next);
      },
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [HALF, FULL, setMode]);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // ---------- asking ----------
  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || thinking) return;
    playSfx('send');
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
            messages: history.filter((m) => !m.id.startsWith('greet-')).slice(-12).map(({ role, content }) => ({ role, content })),
          });
      if (!reply?.reply) throw new Error('empty reply');
    } catch {
      reply = localMuse(q, screen, ctx); // Sage is never silent
    }
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
    if (!wiz.sheetOpen) return;
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages.length, thinking, wiz.sheetOpen, kbOpen]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  // ---------- pill ----------
  if (mode === 'pill') {
    return (
      <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(150)}
        style={[styles.pillWrap, { bottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, space.sm) + space.md }]} pointerEvents="box-none">
        <Pressable
          style={styles.pill}
          onPress={() => { Haptics.selectionAsync().catch(() => {}); playSfx('open'); wiz.setMode('half'); }}
          accessibilityRole="button"
          accessibilityLabel="Open Sage"
        >
          <Sage size={36} variant="face" still />
          <View style={styles.fill}>
            <T variant="smallBold">Sage</T>
            <T variant="small" numberOfLines={1}>{thinking ? 'Thinking…' : lastAssistant?.content ?? 'Ask me anything'}</T>
          </View>
          <Pressable onPress={() => { playSfx('close'); wiz.close(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close Sage" style={styles.pillClose}>
            <T variant="bodyBold" color={ink.inkSoft}>✕</T>
          </Pressable>
        </Pressable>
      </Animated.View>
    );
  }
  if (!wiz.sheetOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={() => { if (kbOpen) Keyboard.dismiss(); else { playSfx('close'); wiz.minimize(); } }}
        accessibilityLabel={kbOpen ? 'Hide keyboard' : 'Minimize Sage'}
      />
      <Animated.View entering={FadeInDown.duration(motion.sheet)} style={[styles.sheet, sheetStyle]}>
        <View style={styles.sheetInner}>
          {/* Header = drag handle */}
          <View {...pan.panHandlers} style={styles.header}>
            <View style={styles.grabber} />
            <View style={styles.headRow}>
              <Sage size={52} variant="face" expression={thinking ? 'thinking' : 'idle'} speakKey={lastAssistant?.id ?? null} />
              <SageTitle style={styles.fill} />
              <HeaderButton label={mode === 'full' ? 'Half screen' : 'Full screen'} glyph={mode === 'full' ? '⌄' : '⌃'}
                onPress={() => wiz.setMode(mode === 'full' ? 'half' : 'full')} />
              <HeaderButton label="Minimize" glyph="–" onPress={() => { Keyboard.dismiss(); playSfx('close'); wiz.minimize(); }} />
              <HeaderButton label="Close" glyph="✕" onPress={() => { Keyboard.dismiss(); playSfx('close'); wiz.close(); }} />
            </View>
          </View>

          <ScrollView
            ref={scroll}
            style={styles.fill}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {messages.map((m) => (
              <View key={m.id}>
                <Bubble id={m.id} role={m.role} content={m.content} animate={wiz.freshIds.has(m.id) && m.id === lastAssistant?.id} />
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
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); playSfx('success');
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
                          Haptics.selectionAsync().catch(() => {}); playSfx('tap');
                          Keyboard.dismiss();
                          wiz.minimize();
                          runAction(router, a);
                        }}
                      >
                        <T variant="smallBold" color={accent.onPrimary}>
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
                <T variant="story">Sage strokes his beard…</T>
              </View>
            ) : null}
          </ScrollView>

          {!kbOpen ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chips}
              keyboardShouldPersistTaps="handled">
              {SCREEN_SUGGESTIONS[screen].map((s) => (
                <Pressable key={s} style={styles.chip} onPress={() => ask(s)} disabled={thinking} accessibilityRole="button">
                  <T variant="smallBold" color={ink.ink}>{s}</T>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={[styles.inputRow, { paddingBottom: kbOpen ? space.sm : Math.max(insets.bottom, space.md) }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask Sage anything…"
              placeholderTextColor={ink.muted}
              style={styles.input}
              onSubmitEditing={() => ask(draft)}
              returnKeyType="send"
              maxLength={400}
              accessibilityLabel="Ask Sage"
            />
            <Pressable
              onPress={() => ask(draft)}
              disabled={!draft.trim() || thinking}
              style={[styles.send, (!draft.trim() || thinking) && styles.sendOff]}
              accessibilityRole="button"
              accessibilityLabel="Send"
            >
              <T variant="bodyBold" color={accent.onPrimary}>↑</T>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function HeaderButton({ label, glyph, onPress }: { label: string; glyph: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); playSfx('tap'); onPress(); }} hitSlop={8} style={styles.hBtn}
      accessibilityRole="button" accessibilityLabel={label}>
      <T variant="bodyBold" style={styles.hGlyph}>{glyph}</T>
    </Pressable>
  );
}

/** Replies type out once; reopening the sheet shows them whole. */
const typed = new Set<string>();

function Bubble({ id, role, content, animate }: { id: string; role: 'user' | 'assistant'; content: string; animate: boolean }) {
  const [typeIt] = useState(() => animate && !typed.has(id));
  useEffect(() => { typed.add(id); }, [id]);
  const { shown } = useTypewriter(content, 18, typeIt);
  const mine = role === 'user';
  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <T variant="body" color={mine ? accent.onPrimary : ink.ink}>{shown}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: scrim.soft },
  sheet: {
    position: 'absolute', left: 0, right: 0, borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, ...shadow.lg,
  },
  sheetInner: {
    flex: 1, backgroundColor: realm.royalMist, borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS, overflow: 'hidden',
    borderWidth: panel.borderWidth, borderBottomWidth: 0, borderColor: panel.border,
  },
  header: {
    paddingHorizontal: space.lg, paddingBottom: space.sm, backgroundColor: panel.parchment,
    borderBottomWidth: 2, borderBottomColor: panel.parchmentEdge,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: ink.muted, marginVertical: space.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  hBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: ink.ink, backgroundColor: ink.page,
    alignItems: 'center', justifyContent: 'center',
  },
  hGlyph: { fontSize: 16, lineHeight: 20 },
  listContent: { padding: space.lg, gap: space.sm },
  bubble: { maxWidth: '86%', paddingVertical: space.sm + 2, paddingHorizontal: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: ink.ink },
  theirs: { alignSelf: 'flex-start', backgroundColor: ink.page, borderTopLeftRadius: 6 },
  mine: { alignSelf: 'flex-end', backgroundColor: accent.primary, borderTopRightRadius: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  postChip: { backgroundColor: accent.goldSoft, borderWidth: 2, borderColor: ink.ink },
  actionChip: { backgroundColor: accent.primary, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.md },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  chipsRow: { flexGrow: 0, flexShrink: 0 },
  chips: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  chip: {
    borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill, paddingVertical: space.xs + 2, paddingHorizontal: space.md,
    backgroundColor: ink.page,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm,
    backgroundColor: panel.parchment, borderTopWidth: 2, borderTopColor: panel.parchmentEdge,
  },
  input: {
    flex: 1, minHeight: 46, borderWidth: 2, borderColor: ink.ink, borderRadius: radius.pill, paddingHorizontal: space.lg,
    backgroundColor: ink.page, fontFamily: fonts.body, fontSize: type.body, color: ink.ink,
  },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: accent.primary, borderWidth: 2, borderColor: ink.ink, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
  pillWrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, maxWidth: 420, width: '100%', paddingVertical: space.xs,
    paddingLeft: space.xs, paddingRight: space.md, borderRadius: radius.pill, borderWidth: 2.5, borderColor: ink.ink,
    backgroundColor: panel.parchment, ...shadow.md,
  },
  pillClose: { paddingHorizontal: space.xs },
});
