/** @author Lokesh */
import { useEffect, useState } from 'react';

/**
 * False on the first paint, true right after. Heavy screens render their shell (header + skeleton) first so
 * navigation feels instant, then fill in the content a frame later instead of blocking the transition.
 */
export function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One frame for the shell to paint, then a macrotask so the push animation has already started.
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(() => setReady(true), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, []);
  return ready;
}
