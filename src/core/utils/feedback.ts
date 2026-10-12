/** @author Lokesh */
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

/** A crisp system tick, not a motor buzz; it follows the phone's touch-feedback setting. */
export function tapFeedback() {
  if (Platform.OS === 'android') {
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key).catch(() => {});
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export const successFeedback = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
export const errorFeedback = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

/** A firm knock for a committed destructive gesture (e.g. swipe-to-delete released). */
export function commitFeedback() {
  if (Platform.OS === 'android') {
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm).catch(() => {});
    Vibration.vibrate(35);
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}
