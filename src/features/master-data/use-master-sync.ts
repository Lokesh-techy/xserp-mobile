/** @author Lokesh */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncAllMasters } from './store';

/** Re-syncs any master list older than 12 h, at mount and whenever the app returns to the foreground. */
export function useMasterSync() {
  useEffect(() => {
    void syncAllMasters();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void syncAllMasters());
    return () => sub.remove();
  }, []);
}
