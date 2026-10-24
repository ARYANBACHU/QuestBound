// Owner: AB. Unread proclamation count for the Friends tab badge (last-seen message id in AsyncStorage).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { useChat } from '@/lib/chat';

const KEY = 'qb.lastSeenMsg';

export function useUnreadProclamations(fellowshipId: string | null) {
  const { messages } = useChat(fellowshipId);
  const [lastSeen, setLastSeen] = useState<string | null | undefined>(undefined); // undefined = not loaded

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => setLastSeen(v), () => setLastSeen(null));
  }, []);

  const latestId = messages.length ? messages[messages.length - 1].id : null;

  const markSeen = useCallback(() => {
    if (!latestId) return;
    setLastSeen(latestId);
    AsyncStorage.setItem(KEY, latestId).catch(() => {});
  }, [latestId]);

  let unread = 0;
  if (lastSeen !== undefined) {
    const idx = lastSeen ? messages.findIndex((m) => m.id === lastSeen) : -1;
    unread = messages.slice(idx + 1).filter((m) => m.kind === 'proclamation').length;
  }
  return { unread, markSeen };
}
