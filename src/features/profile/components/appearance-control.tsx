/** @author Lokesh */
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { makeStyles, useTheme, useThemePreference, type ThemePreference } from '@/core/theme';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * System / Light / Dark on the platform's own segmented control: on iOS it is UIKit's, so it takes the
 * system look (Liquid Glass on iOS 26) untouched; Android gets the brand colours. Applies instantly.
 */
export function AppearanceControl() {
  const t = useTheme();
  const styles = useStyles();
  const { preference, setPreference } = useThemePreference();
  const index = Math.max(
    0,
    OPTIONS.findIndex((o) => o.value === preference),
  );
  const ios = Platform.OS === 'ios';
  return (
    <SegmentedControl
      values={OPTIONS.map((o) => o.label)}
      selectedIndex={index}
      onChange={(e) => {
        const o = OPTIONS[e.nativeEvent.selectedSegmentIndex];
        if (!o || o.value === preference) return;
        void Haptics.selectionAsync().catch(() => {});
        setPreference(o.value);
      }}
      appearance={t.dark ? 'dark' : 'light'}
      style={styles.control}
      // iOS: leave the system styling alone. Android: brand-tinted to match the rest of the app.
      {...(ios
        ? {}
        : {
            tintColor: t.colors.primary,
            backgroundColor: t.colors.fill,
            fontStyle: { color: t.colors.textMuted, fontFamily: t.fonts.semibold },
            activeFontStyle: { color: t.colors.white, fontFamily: t.fonts.bold },
          })}
      accessibilityLabel="Appearance"
    />
  );
}

const useStyles = makeStyles(() => ({
  control: { height: 36 },
}));
