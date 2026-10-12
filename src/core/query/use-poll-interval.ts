/** @author Lokesh */
import { useIsFocused } from 'expo-router';

import { POLL_MS } from './query-client';

/**
 * `refetchInterval` for data shown on this screen: polls only while the screen is the one in front.
 * Screens under a pushed one stay mounted, so a plain interval would keep polling behind it.
 */
export function usePollInterval(): number | false {
  return useIsFocused() ? POLL_MS : false;
}
