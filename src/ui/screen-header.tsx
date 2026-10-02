/** @author Lokesh */
import { LinearGradient } from 'expo-linear-gradient';
import { goBack } from './go-back';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useTheme } from '@/core/theme';

import type { IconName } from './button';
import { GlassIconButton } from './glass';
import { Text } from './text';

export type HeaderAction = { icon: IconName; onPress: () => void; badge?: number; label: string };

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  actions?: HeaderAction[];
  /** Rendered under the title row, e.g. SegmentedTabs. */
  tabs?: ReactNode;
  /** PullToSync indicator: stretches the header open while pulling. */
  pull?: ReactNode;
};

/** Slim Despack gradient bar used by every module screen. Always dark → light status bar in both schemes. */
export function ScreenHeader({ title, subtitle, back = true, actions = [], tabs, pull }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={t.gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <StatusBar style="light" />
      {pull}
      <View style={styles.row}>
        {back && <GlassIconButton icon="chevron-back" size={40} onPress={goBack} accessibilityLabel="Back" />}
        <View style={styles.titles}>
          <Text variant="heading" color={t.alpha.onGradient} numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {!!subtitle && (
            <Text variant="caption" color={t.alpha.onGradientFaint} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {actions.map((a) => (
          <GlassIconButton key={a.label} icon={a.icon} size={40} onPress={a.onPress} badge={a.badge} accessibilityLabel={a.label} />
        ))}
      </View>
      {tabs && <View style={styles.tabs}>{tabs}</View>}
    </LinearGradient>
  );
}

const useStyles = makeStyles((t) => ({
  root: { paddingHorizontal: 14, paddingBottom: 14, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  titles: { flex: 1, paddingHorizontal: 4 },
  title: { fontSize: 18, lineHeight: 24 },
  tabs: { marginTop: 12 },
}));
