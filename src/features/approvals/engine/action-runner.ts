/** @author Lokesh */
type Options = {
  delayMs: number;
  /** Called when the action is queued; `undo` cancels it while the window is open. */
  onScheduled: (key: string, undo: () => void) => void;
  onDone: (key: string) => void;
  onError: (key: string, error: unknown) => void;
};

/**
 * Serialises approve/reject so each (item, action) runs at most once: double taps are ignored,
 * a precheck runs first, then an undo window, then the request.
 */
export function createActionRunner({ delayMs, onScheduled, onDone, onError }: Options) {
  const pending = new Map<string, ReturnType<typeof setTimeout> | 'checking' | 'running'>();

  const cancel = (key: string) => {
    const p = pending.get(key);
    if (p && p !== 'checking' && p !== 'running') clearTimeout(p);
    if (p !== 'running') pending.delete(key);
  };

  const schedule = (key: string, task: () => Promise<void>) => {
    const timer = setTimeout(async () => {
      pending.set(key, 'running');
      try {
        await task();
        onDone(key);
      } catch (e) {
        onError(key, e);
      } finally {
        pending.delete(key);
      }
    }, delayMs);
    pending.set(key, timer);
    onScheduled(key, () => cancel(key));
  };

  const run = (key: string, task: () => Promise<void>, precheck?: () => Promise<void>): boolean => {
    if (pending.has(key)) return false;
    if (!precheck) {
      schedule(key, task);
      return true;
    }
    pending.set(key, 'checking');
    precheck().then(
      () => {
        if (pending.get(key) === 'checking') schedule(key, task);
      },
      (e: unknown) => {
        pending.delete(key);
        onError(key, e);
      },
    );
    return true;
  };

  return { run, cancel, isPending: (key: string) => pending.has(key) };
}
