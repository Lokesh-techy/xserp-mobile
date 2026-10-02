/** @author Lokesh */
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

/** Android haptics are silent when touch vibration is off, so a short vibration is sent alongside. */
export function tapFeedback() {
  if (Platform.OS === 'android') {
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key).catch(() => {});
    Vibration.vibrate(20);
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export const successFeedback = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
export const errorFeedback = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
