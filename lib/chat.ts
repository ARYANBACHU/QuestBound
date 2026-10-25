// Owner: MP. Group chat for a fellowship (texts + proclamations + system + wizard), realtime.
// CONTRACT: keep these export names/signatures.
//
// Real mode: one shared store per fellowship (ref-counted), so the Friends tab, the header crest row and any
// other screen share the same messages, Presence channel and typing state.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { USE_MOCKS } from './env';
import { mock, emitMock, subscribeMock } from './mockStore';
import { supabase } from './supabase';
import { sessionStore } from './session';
import { fellowshipStore } from './fellowship';
import { ME } from '@/fixtures/demo';
import type { Message } from '@/shared/types';

/** A message plus local delivery state for my own optimistic sends. */
export type ChatMessage = Message & { status?: 'sending' | 'failed' };

export interface ChatState {
  messages: ChatMessage[]; // oldest -> newest
  loading: boolean;
  send: (body: string) => Promise<void>;
  // ---- extras (MP) ----
  /** user ids currently in the app with this fellowship open (Supabase Presence). */
  online: Set<string>;
  /** user ids typing right now (excludes me). */
  typingUserIds: string[];
  /** Call on every composer keystroke; throttled broadcast. */
  notifyTyping: () => void;
  /** Re-send a failed optimistic message. */
  retry: (tempId: string) => Promise<void>;
  /** Drop a failed optimistic message. */
  discard: (tempId: string) => void;
  error: string | null;
  /** messageId → emoji → user ids who reacted. */
  reactions: Reactions;
  /** Add my reaction, or remove it if I already left that emoji. */
  toggleReaction: (messageId: string, emoji: ReactionEmoji) => Promise<void>;
  /** Post a small centered system line as me (joins, nudges). */
  sendSystem: (body: string) => Promise<void>;
}

export const REACTIONS = ['👑', '🔥', '😂', '❤️', '🎉'] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];
export type Reactions = Record<string, Partial<Record<ReactionEmoji, string[]>>>;

/** Row in `message_reactions` (proposed in REQUESTS.md; not in shared/types yet). */
interface ReactionRow {
  message_id: string;
  fellowship_id: string;
  user_id: string;
  emoji: ReactionEmoji;
}

function applyReaction(r: Reactions, messageId: string, emoji: ReactionEmoji, uid: string, on: boolean): Reactions {
  const forMsg = { ...(r[messageId] ?? {}) };
  const users = new Set(forMsg[emoji] ?? []);
  if (on) users.add(uid);
  else users.delete(uid);
  if (users.size) forMsg[emoji] = [...users];
  else delete forMsg[emoji];
  return { ...r, [messageId]: forMsg };
}

function reactionsFromRows(rows: ReactionRow[]): Reactions {
  return rows.reduce<Reactions>((acc, row) => applyReaction(acc, row.message_id, row.emoji, row.user_id, true), {});
}

const PAGE = 100;
const TYPING_TTL = 3000;
const EMPTY_SET = new Set<string>();

// ---------------------------------------------------------------------------------------------------------
// Real store (per fellowship)
// ---------------------------------------------------------------------------------------------------------
interface Snapshot {
  messages: ChatMessage[];
  loading: boolean;
  online: Set<string>;
  typingUserIds: string[];
  error: string | null;
  reactions: Reactions;
}

interface Room {
  id: string;
  snap: Snapshot;
  listeners: Set<() => void>;
  refs: number;
  db: RealtimeChannel | null;
  presence: RealtimeChannel | null;
  presenceUid: string | null;
  typing: Map<string, number>;
  reactionsCh: RealtimeChannel | null;
  /** false once we learn the message_reactions table doesn't exist yet → reactions stay local. */
  reactionsRemote: boolean;
  typingTimer: ReturnType<typeof setInterval> | null;
  lastTypingSent: number;
  stopSession: (() => void) | null;
  closeTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, Room>();
const EMPTY_SNAP: Snapshot = { messages: [], loading: false, online: EMPTY_SET, typingUserIds: [], error: null, reactions: {} };

function setRoom(room: Room, patch: Partial<Snapshot>) {
  room.snap = { ...room.snap, ...patch };
  room.listeners.forEach((fn) => fn());
}

function byTime(a: ChatMessage, b: ChatMessage) {
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/** Merge server rows into the list: dedupe by id, swap my matching optimistic message for the real one. */
function merge(room: Room, incoming: Message[]) {
  let list = room.snap.messages;
  let changed = false;
  for (const m of incoming) {
    if (list.some((x) => x.id === m.id)) continue;
    const tempIdx = list.findIndex((x) => x.status === 'sending' && x.user_id === m.user_id && x.body === m.body);
    list = tempIdx >= 0 ? list.map((x, i) => (i === tempIdx ? m : x)) : [...list, m];
    changed = true;
  }
  if (!changed) return;
  // Keep server order; optimistic/failed ones stay at the tail.
  const confirmed = list.filter((x) => !x.status).sort(byTime);
  const local = list.filter((x) => x.status);
  setRoom(room, { messages: [...confirmed, ...local] });
}

async function loadLatest(room: Room) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('fellowship_id', room.id)
    .order('created_at', { ascending: false })
    .limit(PAGE);
  if (error) {
    setRoom(room, { loading: false, error: 'Sage could not fetch the chat. Pull to refresh or check your connection.' });
    return;
  }
  setRoom(room, { loading: false, error: null });
  merge(room, ((data ?? []) as Message[]).reverse());
}

function onIncoming(room: Room, m: Message) {
  merge(room, [m]);
  // Someone new (or a renamed hero) → refresh the member list so crests/names render.
  const members = fellowshipStore.get().members;
  if (m.kind === 'system' || (m.user_id && !members.some((x) => x.user_id === m.user_id))) {
    void fellowshipStore.reloadMembers();
  }
  if (m.user_id) clearTyping(room, m.user_id);
}

function clearTyping(room: Room, uid: string) {
  if (!room.typing.delete(uid)) return;
  setRoom(room, { typingUserIds: [...room.typing.keys()] });
}

function startPresence(room: Room, uid: string) {
  if (room.presenceUid === uid) return;
  stopPresence(room);
  room.presenceUid = uid;
  const ch = supabase.channel(`presence:${room.id}`, { config: { presence: { key: uid }, broadcast: { self: false } } });
  ch.on('presence', { event: 'sync' }, () => {
    setRoom(room, { online: new Set(Object.keys(ch.presenceState())) });
  })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      const who = (payload as { user_id?: string })?.user_id;
      if (!who || who === uid) return;
      room.typing.set(who, Date.now() + TYPING_TTL);
      setRoom(room, { typingUserIds: [...room.typing.keys()] });
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void ch.track({ user_id: uid, at: new Date().toISOString() });
    });
  room.presence = ch;
  room.typingTimer = setInterval(() => {
    const now = Date.now();
    let changed = false;
    room.typing.forEach((until, who) => {
      if (until < now) {
        room.typing.delete(who);
        changed = true;
      }
    });
    if (changed) setRoom(room, { typingUserIds: [...room.typing.keys()] });
  }, 1000);
}

function stopPresence(room: Room) {
  if (room.presence) void supabase.removeChannel(room.presence);
  if (room.typingTimer) clearInterval(room.typingTimer);
  room.presence = null;
  room.typingTimer = null;
  room.presenceUid = null;
  room.typing.clear();
}

const MISSING_TABLE = new Set(['42P01', 'PGRST205', 'PGRST200']);
let warnedReactions = false;
function reactionsUnavailable(room: Room, err: { code?: string; message?: string }) {
  if (!MISSING_TABLE.has(err.code ?? '') && !/message_reactions/.test(err.message ?? '')) return false;
  room.reactionsRemote = false;
  if (!warnedReactions) console.warn('[chat] message_reactions table missing — reactions are local only (see REQUESTS.md)');
  warnedReactions = true;
  return true;
}

async function loadReactions(room: Room) {
  if (!room.reactionsRemote) return;
  const { data, error } = await supabase
    .from('message_reactions')
    .select('message_id, fellowship_id, user_id, emoji')
    .eq('fellowship_id', room.id)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) {
    if (!reactionsUnavailable(room, error)) console.warn('[chat] reactions load failed', error);
    return;
  }
  setRoom(room, { reactions: reactionsFromRows((data ?? []) as ReactionRow[]) });
}

function subscribeReactions(room: Room) {
  // Own channel: if the table isn't published yet, the chat channel must keep working.
  room.reactionsCh = supabase
    .channel(`reactions:${room.id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions', filter: `fellowship_id=eq.${room.id}` }, (p) => {
      const r = p.new as ReactionRow;
      setRoom(room, { reactions: applyReaction(room.snap.reactions, r.message_id, r.emoji, r.user_id, true) });
    })
    // DELETEs can't be filtered; with replica identity full the old row has every column.
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (p) => {
      const r = p.old as Partial<ReactionRow>;
      if (r.fellowship_id !== room.id || !r.message_id || !r.emoji || !r.user_id) return;
      setRoom(room, { reactions: applyReaction(room.snap.reactions, r.message_id, r.emoji, r.user_id, false) });
    })
    .subscribe();
}

async function toggleReactionReal(fellowshipId: string, messageId: string, emoji: ReactionEmoji) {
  const room = getRoom(fellowshipId);
  const uid = await sessionStore.ensureSignedIn();
  const had = (room.snap.reactions[messageId]?.[emoji] ?? []).includes(uid);
  setRoom(room, { reactions: applyReaction(room.snap.reactions, messageId, emoji, uid, !had) });
  if (!room.reactionsRemote || messageId.startsWith('temp-')) return;
  const { error } = had
    ? await supabase.from('message_reactions').delete().match({ message_id: messageId, user_id: uid, emoji })
    : await supabase.from('message_reactions').insert({ message_id: messageId, fellowship_id: fellowshipId, user_id: uid, emoji });
  if (error && error.code !== '23505' && !reactionsUnavailable(room, error)) {
    setRoom(room, { reactions: applyReaction(room.snap.reactions, messageId, emoji, uid, had) });
  }
}

function open(room: Room) {
  setRoom(room, { loading: room.snap.messages.length === 0 });
  room.db = supabase
    .channel(`chat:${room.id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `fellowship_id=eq.${room.id}` }, (p) =>
      onIncoming(room, p.new as Message),
    )
    .subscribe((status) => {
      // (Re)connected → backfill anything missed while offline / backgrounded.
      if (status === 'SUBSCRIBED') {
        void loadLatest(room);
        void loadReactions(room);
      }
    });
  void loadLatest(room);
  void loadReactions(room);
  subscribeReactions(room);
  const syncPresence = () => {
    const uid = sessionStore.get().userId;
    if (uid) startPresence(room, uid);
    else stopPresence(room);
  };
  room.stopSession = sessionStore.subscribe(syncPresence);
  syncPresence();
}

function close(room: Room) {
  if (room.db) void supabase.removeChannel(room.db);
  room.db = null;
  if (room.reactionsCh) void supabase.removeChannel(room.reactionsCh);
  room.reactionsCh = null;
  stopPresence(room);
  room.stopSession?.();
  room.stopSession = null;
  setRoom(room, { online: EMPTY_SET, typingUserIds: [] });
}

function getRoom(id: string): Room {
  let room = rooms.get(id);
  if (!room) {
    room = {
      id,
      snap: { messages: [], loading: true, online: EMPTY_SET, typingUserIds: [], error: null, reactions: {} },
      listeners: new Set(),
      refs: 0,
      db: null,
      presence: null,
      presenceUid: null,
      typing: new Map(),
      reactionsCh: null,
      reactionsRemote: true,
      typingTimer: null,
      lastTypingSent: 0,
      stopSession: null,
      closeTimer: null,
    };
    rooms.set(id, room);
  }
  return room;
}

function retain(room: Room, fn: () => void): () => void {
  room.listeners.add(fn);
  room.refs++;
  if (room.closeTimer) {
    clearTimeout(room.closeTimer);
    room.closeTimer = null;
  } else if (room.refs === 1 && !room.db) {
    open(room);
  }
  return () => {
    room.listeners.delete(fn);
    room.refs--;
    // Small grace period so tab switches / remounts don't drop the channel.
    if (room.refs === 0) {
      room.closeTimer = setTimeout(() => {
        room.closeTimer = null;
        if (room.refs === 0) close(room);
      }, 1500);
    }
  };
}

async function insertText(room: Room, tempId: string, body: string) {
  const uid = await sessionStore.ensureSignedIn();
  const { data, error } = await supabase
    .from('messages')
    .insert({ fellowship_id: room.id, user_id: uid, kind: 'text', body })
    .select('*')
    .single();
  if (error || !data) {
    setRoom(room, { messages: room.snap.messages.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)) });
    return;
  }
  const real = data as Message;
  const already = room.snap.messages.some((m) => m.id === real.id);
  const without = room.snap.messages.filter((m) => m.id !== tempId);
  setRoom(room, { messages: already ? without : [...without.filter((m) => !m.status), real, ...without.filter((m) => m.status)] });
}

async function sendReal(fellowshipId: string, raw: string) {
  const body = raw.trim();
  if (!body) return;
  const room = getRoom(fellowshipId);
  const uid = sessionStore.get().userId;
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const temp: ChatMessage = {
    id: tempId,
    fellowship_id: fellowshipId,
    user_id: uid,
    kind: 'text',
    body,
    payload: null,
    created_at: new Date().toISOString(),
    status: 'sending',
  };
  setRoom(room, { messages: [...room.snap.messages, temp] });
  room.lastTypingSent = 0;
  await insertText(room, tempId, body);
}

async function sendSystemReal(fellowshipId: string, body: string) {
  const uid = await sessionStore.ensureSignedIn();
  const { data, error } = await supabase
    .from('messages')
    .insert({ fellowship_id: fellowshipId, user_id: uid, kind: 'system', body, payload: null })
    .select('*')
    .single();
  if (error) throw new Error(`Sage's raven got lost: ${error.message}. Try again.`);
  merge(getRoom(fellowshipId), [data as Message]);
}

async function retryReal(fellowshipId: string, tempId: string) {
  const room = getRoom(fellowshipId);
  const m = room.snap.messages.find((x) => x.id === tempId);
  if (!m || m.status !== 'failed') return;
  setRoom(room, { messages: room.snap.messages.map((x) => (x.id === tempId ? { ...x, status: 'sending' } : x)) });
  await insertText(room, tempId, m.body);
}

function discardReal(fellowshipId: string, tempId: string) {
  const room = getRoom(fellowshipId);
  setRoom(room, { messages: room.snap.messages.filter((x) => x.id !== tempId) });
}

function notifyTypingReal(fellowshipId: string) {
  const room = rooms.get(fellowshipId);
  if (!room?.presence || !room.presenceUid) return;
  const now = Date.now();
  if (now - room.lastTypingSent < 2000) return;
  room.lastTypingSent = now;
  void room.presence.send({ type: 'broadcast', event: 'typing', payload: { user_id: room.presenceUid } });
}

// ---------------------------------------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------------------------------------
function useMockChat(fellowshipId: string | null): ChatState {
  'use no memo'; // mock store mutates in place; the React Compiler must not cache reads of it
  const [, force] = useState(0);
  useEffect(() => subscribeMock(() => force((n) => n + 1)), []);
  const send = useCallback(
    async (raw: string) => {
      const body = raw.trim();
      if (!body) return;
      mock.messages.push({ id: `msg-${Date.now()}`, fellowship_id: fellowshipId ?? '', user_id: ME, kind: 'text', body, payload: null, created_at: new Date().toISOString() });
      emitMock();
    },
    [fellowshipId],
  );
  const noop = useCallback(() => {}, []);
  const retry = useCallback(async () => {}, []);
  const sendSystem = useCallback(
    async (body: string) => {
      mock.messages.push({ id: `msg-${Date.now()}`, fellowship_id: fellowshipId ?? '', user_id: ME, kind: 'system', body, payload: null, created_at: new Date().toISOString() });
      emitMock();
    },
    [fellowshipId],
  );
  const toggleReaction = useCallback(async (messageId: string, emoji: ReactionEmoji) => {
    const had = (mockReactions[messageId]?.[emoji] ?? []).includes(ME);
    mockReactions = applyReaction(mockReactions, messageId, emoji, ME, !had);
    emitMock();
  }, []);
  return {
    messages: [...mock.messages],
    loading: false,
    send,
    online: MOCK_ONLINE,
    typingUserIds: [],
    notifyTyping: noop,
    retry,
    discard: noop,
    error: null,
    reactions: mockReactions,
    toggleReaction,
    sendSystem,
  };
}
let mockReactions: Reactions = { 'msg-4': { '👑': ['u-cleo'], '🔥': ['u-dax', 'u-bram'] }, 'msg-5': { '😂': ['u-bram'] } };
const MOCK_ONLINE = new Set([ME, 'u-bram']);

function useRealChat(fellowshipId: string | null): ChatState {
  const subscribe = useCallback((fn: () => void) => (fellowshipId ? retain(getRoom(fellowshipId), fn) : () => {}), [fellowshipId]);
  const getSnap = useCallback(() => (fellowshipId ? getRoom(fellowshipId).snap : EMPTY_SNAP), [fellowshipId]);
  const s = useSyncExternalStore(subscribe, getSnap, getSnap);
  const send = useCallback((body: string) => (fellowshipId ? sendReal(fellowshipId, body) : Promise.resolve()), [fellowshipId]);
  const retry = useCallback((id: string) => (fellowshipId ? retryReal(fellowshipId, id) : Promise.resolve()), [fellowshipId]);
  const discard = useCallback((id: string) => fellowshipId && discardReal(fellowshipId, id), [fellowshipId]);
  const notifyTyping = useCallback(() => fellowshipId && notifyTypingReal(fellowshipId), [fellowshipId]);
  const toggleReaction = useCallback(
    (messageId: string, emoji: ReactionEmoji) => (fellowshipId ? toggleReactionReal(fellowshipId, messageId, emoji) : Promise.resolve()),
    [fellowshipId],
  );
  const sendSystem = useCallback((body: string) => (fellowshipId ? sendSystemReal(fellowshipId, body) : Promise.resolve()), [fellowshipId]);
  return { ...s, send, retry, toggleReaction, sendSystem, discard: discard as (id: string) => void, notifyTyping: notifyTyping as () => void };
}

// USE_MOCKS is a build-time constant, so the hook order never changes between renders.
export const useChat: (fellowshipId: string | null) => ChatState = USE_MOCKS ? useMockChat : useRealChat;
