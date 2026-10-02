/** @author Lokesh */
import { LinearGradient } from 'expo-linear-gradient';
import { goBack } from './go-back';
import { StatusBar } from 'expo-status-bar';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useTheme } from '@/core/theme';

import type { IconName } from './button';
import { GlassIconButton } from './glass';
import { PlacementContext, TabsWidthContext, type HeaderSlot } from './header-slot';
import { Text } from './text';

const none = () => null;
const noSubscribe = () => () => {};

export type HeaderAction = { icon: IconName; onPress: () => void; badge?: number; label: string };

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  actions?: HeaderAction[];
  /** A compact control at the right of the bar, before any actions (e.g. a filter menu). */
  right?: ReactNode;
  /** A tab's single control (see `HeaderRight`): beside the tabs when it fits, else at the bar's right end. */
  slot?: HeaderSlot;
  /** Rendered just under the bar, on the page background (e.g. SegmentedTabs). */
  tabs?: ReactNode;
  /** PullToSync indicator: stretches the header open while pulling. */
  pull?: ReactNode;
};

/** Slim gradient bar: back, title (+ subtitle), up to two actions. Tabs sit below it on the page. */
export function ScreenHeader({ title, subtitle, back = true, actions = [], right, slot, tabs, pull }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const control = useSyncExternalStore(slot?.subscribe ?? noSubscribe, slot?.get ?? none, slot?.get ?? none);
  const [rowW, setRowW] = useState(0);
  const [tabsW, setTabsW] = useState(0);
  const [controlW, setControlW] = useState(0);
  // Measured in the tab row only, so moving it to the bar never feeds back into the decision.
  const besideTabs = !!tabs && (controlW === 0 || tabsW + controlW <= rowW);
  const inBar = control && !besideTabs;
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
          {(right || inBar) && (
            <PlacementContext.Provider value="bar">
              {right}
              {inBar && control}
            </PlacementContext.Provider>
          )}
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
      {tabs && (
        <View style={styles.tabs} onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
          <View style={styles.flex}>
            <TabsWidthContext.Provider value={setTabsW}>{tabs}</TabsWidthContext.Provider>
          </View>
          {!!control && besideTabs && (
            <View style={styles.beside} onLayout={(e) => setControlW(Math.ceil(e.nativeEvent.layout.width))}>
              <PlacementContext.Provider value="tabs">{control}</PlacementContext.Provider>
            </View>
          )}
        </View>
      )}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  root: { paddingHorizontal: 12, paddingBottom: 10, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  titles: { flex: 1, paddingHorizontal: 4 },
  title: { fontSize: 17, lineHeight: 22 },
  tabs: { backgroundColor: t.colors.bg, marginTop: 2, flexDirection: 'row', alignItems: 'stretch' },
  flex: { flex: 1 },
  beside: {
    justifyContent: 'center',
    paddingLeft: 4,
    paddingRight: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
}));
