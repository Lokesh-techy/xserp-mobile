/** @author Lokesh */
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSessionStore } from '@/core/auth';
import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, formatQty, lastDays } from '@/core/utils';
import { useMaterialItems, useMaterials } from '@/features/master-data';
import { Card, Chip, PickerSheet, PressableScale, QueryState, RangeChips, StatCard, StateView, Text, useHostRefresh, type ScrollHost } from '@/ui';

import { useStockCheck } from '../hooks';

export function StockCheckTab({ host }: { host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const fy = useSessionStore((s) => s.session?.fyStartDay);
  const items = useMaterialItems();
  const materials = useMaterials();
  const [key, setKey] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [range, setRange] = useState(() => lastDays(30));
  const [faulty, setFaulty] = useState(false);
  const [excludeDrafts, setExcludeDrafts] = useState(true);
  const [itemId = null, makeId = null] = key ? key.split(':') : [];
  const material = materials.find((m) => `${m.itemId}:${m.makeId}` === key);
  const query = useStockCheck(itemId, makeId, range, faulty, excludeDrafts);
  const refetch = useCallback(() => (key ? query.refetch() : Promise.resolve()), [query, key]);
  useHostRefresh(host, refetch);

  return (
    <>
      {host.attach(
        <Animated.FlatList
          {...host.scrollProps}
          data={query.data?.movements ?? []}
          keyExtractor={(m, i) => `${m.docNo}-${i}`}
          contentContainerStyle={styles.pad}
          ListHeaderComponent={
            <View style={styles.head}>
              <PressableScale onPress={() => setPicking(true)} style={styles.picker}>
                <Text variant="label" color={material ? t.colors.text : t.colors.textFaint}>
                  {material?.name ?? 'Choose a material'}
                </Text>
                {!!material && (
                  <Text variant="caption" color={t.colors.textMuted}>
                    {[material.drawingNo, material.makeName !== '-NA-' ? material.makeName : null, material.unit].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </PressableScale>
              <RangeChips value={range} onChange={setRange} fyStartDay={fy} nested={host.nestedProps} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} {...host.nestedProps}>
                <Chip label="Exclude drafts" active={excludeDrafts} onPress={() => setExcludeDrafts((v) => !v)} />
                <Chip label="Faulty stock" tone="warning" active={faulty} onPress={() => setFaulty((v) => !v)} />
              </ScrollView>
              {!key ? (
                <StateView icon="search-outline" title="Check any material's stock" message="Pick a material to see its opening, closing and movements." />
              ) : (
                <QueryState query={query} skeleton={<View />}>
                  {(d) => (
                    <View style={styles.grid}>
                      <StatCard label="Opening" value={formatQty(d.opening, material?.unit)} icon="archive-outline" tone="neutral" />
                      <StatCard label="Closing" value={formatQty(d.closing, material?.unit)} icon="cube-outline" tone="info" />
                    </View>
                  )}
                </QueryState>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.move}>
              <View style={styles.flex}>
                <Text variant="label">{item.docNo || '—'}</Text>
                <Text variant="caption" color={t.colors.textMuted}>
                  {formatDate(item.date)}
                </Text>
              </View>
              {item.receipt > 0 && (
                <Text variant="label" weight="bold" color={t.colors.success}>
                  +{formatQty(item.receipt)}
                </Text>
              )}
              {item.issue > 0 && (
                <Text variant="label" weight="bold" color={t.colors.danger}>
                  −{formatQty(item.issue)}
                </Text>
              )}
            </Card>
          )}
        />,
      )}
      <PickerSheet visible={picking} title="Material" items={items} selectedId={key} allowClear={false} onSelect={(i) => i && setKey(i.id)} onClose={() => setPicking(false)} />
    </>
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingTop: 8, paddingBottom: 48 },
  head: { gap: 12, marginBottom: 14 },
  picker: { minHeight: 56, borderRadius: t.radius.md, backgroundColor: t.colors.surface, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8, ...t.shadow.card },
  chips: { gap: 8 },
  grid: { flexDirection: 'row', gap: 12 },
  move: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, padding: 14 },
  flex: { flex: 1, gap: 2 },
}));
