/** @author Lokesh */
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSessionStore } from '@/core/auth';
import { useFocusRefetch } from '@/core/query';
import { makeStyles } from '@/core/theme';
import { lastDays } from '@/core/utils';
import { QueryState, RangeChips, Section, StatCard, useHostRefresh, type ScrollHost, HeaderRight } from '@/ui';

import { useIndentStatus } from '../hooks';

export function IndentTab({ host }: { host: ScrollHost }) {
  const styles = useStyles();
  const fy = useSessionStore((s) => s.session?.fyStartDay);
  const [range, setRange] = useState(() => lastDays(30));
  const query = useIndentStatus(range);
  const refetch = useCallback(() => query.refetch(), [query]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <HeaderRight>
        <RangeChips value={range} onChange={setRange} fyStartDay={fy} />
      </HeaderRight>
      <QueryState query={query}>
        {(d) => (
          <Section title="Indents">
            <View style={styles.grid}>
              <StatCard label="Raised" value={String(d.indent_raised)} icon="add-circle-outline" tone="info" />
              <StatCard label="Closed" value={String(d.indent_closed)} icon="checkmark-done-outline" tone="success" />
              <StatCard label="Pending" value={String(d.indent_pending)} icon="time-outline" tone="warning" />
              <StatCard label="Due for PO" value={String(d.indent_due_po)} icon="cart-outline" tone="danger" />
              <StatCard
                label="Due for material"
                value={String(d.indent_due_material)}
                icon="cube-outline"
                tone="violet"
              />
            </View>
          </Section>
        )}
      </QueryState>
    </Animated.ScrollView>,
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
}));
