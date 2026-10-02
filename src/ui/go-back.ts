/** @author Lokesh */
import { router } from 'expo-router';

/** Back if there is somewhere to go back to; otherwise Home (deep links, cold starts on a screen). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
