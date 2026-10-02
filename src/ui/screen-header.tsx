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
  /** A compact control at the right of the bar, before any actions (e.g. a filter menu). */
  right?: ReactNode;
  /** Rendered just under the bar, on the page background (e.g. SegmentedTabs). */
  tabs?: ReactNode;
  /** PullToSync indicator: stretches the header open while pulling. */
  pull?: ReactNode;
};

/** Slim gradient bar: back, title (+ subtitle), up to two actions. Tabs sit below it on the page. */
export function ScreenHeader({ title, subtitle, back = true, actions = [], right, tabs, pull }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <>
      <LinearGradient
        colors={t.gradients.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.root, { paddingTop: insets.top + 6 }]}>
        <StatusBar style="light" />
        {pull}
        <View style={styles.row}>
          {back && <GlassIconButton icon="chevron-back" size={36} onPress={goBack} accessibilityLabel="Back" />}
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
          {right}
          {actions.slice(0, 2).map((a) => (
            <GlassIconButton
              key={a.label}
              icon={a.icon}
              size={36}
              onPress={a.onPress}
              badge={a.badge}
              accessibilityLabel={a.label}
            />
          ))}
        </View>
      </LinearGradient>
      {tabs && <View style={styles.tabs}>{tabs}</View>}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  root: { paddingHorizontal: 12, paddingBottom: 10, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  titles: { flex: 1, paddingHorizontal: 4 },
  title: { fontSize: 17, lineHeight: 22 },
  tabs: { backgroundColor: t.colors.bg, marginTop: 2 },
}));
