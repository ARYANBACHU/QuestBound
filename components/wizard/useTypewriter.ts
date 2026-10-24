// Owner: AB. Reveal text one character at a time (~25 ms/char). skip() shows it all.
import { useCallback, useEffect, useState } from 'react';

export function useTypewriter(text: string, msPerChar = 25, enabled = true) {
  const [n, setN] = useState(enabled ? 0 : text.length);

  useEffect(() => {
    if (!enabled) { setN(text.length); return; }
    setN(0);
    const id = setInterval(() => {
      setN((c) => {
        if (c >= text.length) { clearInterval(id); return c; }
        return c + 1;
      });
    }, msPerChar);
    return () => clearInterval(id);
  }, [text, msPerChar, enabled]);

  const skip = useCallback(() => setN(text.length), [text.length]);
  return { shown: text.slice(0, n), done: n >= text.length, skip };
}
