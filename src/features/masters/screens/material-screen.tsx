/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, formatMoney, formatQty, parseServerDate } from '@/core/utils';
import { useMaterials } from '@/features/master-data';
import {
  Card,
  KeyValue,
  LineChartCard,
  ModuleScreen,
  QueryState,
  Section,
  StatCard,
  Text,
  useHostRefresh,
  type ScrollHost,
} from '@/ui';

import { fetchMaterialDetail, fetchMaterialStock } from '../api';
import { mastersKeys } from '../keys';

export function MaterialScreen({ id }: { id: string }) {
  const [itemId = '', makeId = ''] = id.split(':');
  const material = useMaterials().find((m) => m.itemId === itemId && m.makeId === makeId);
  return (
    <ModuleScreen title={material?.name ?? 'Material'} subtitle={material?.drawingNo}>
      {(host) => <Body host={host} itemId={itemId} makeId={makeId} />}
    </ModuleScreen>
  );
}

function Body({ host, itemId, makeId }: { host: ScrollHost; itemId: string; makeId: string }) {
  const t = useTheme();
  const styles = useStyles();
  const detail = useQuery({
    queryKey: mastersKeys.material(itemId, makeId),
    queryFn: () => fetchMaterialDetail(itemId, makeId),
  });
  const stock = useQuery({ queryKey: mastersKeys.stock(itemId), queryFn: () => fetchMaterialStock(itemId) });
  useHostRefresh(
    host,
    useCallback(() => Promise.all([detail.refetch(), stock.refetch()]), [detail, stock]),
  );
  const closing = stock.data?.closing_stock ?? stock.data?.material_stock.reduce((s, r) => s + r.closing_stock, 0);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <QueryState query={detail}>
        {(m) => {
          const history = [...m.supplier_history]
            .sort(
              (a, b) =>
                (parseServerDate(a.effect_since)?.getTime() ?? 0) - (parseServerDate(b.effect_since)?.getTime() ?? 0),
            )
            .map((h) => ({ label: formatDate(h.effect_since, 'MMM yy'), value: h.price }));
          return (
            <>
              <View style={styles.grid}>
                <StatCard
                  label="Price"
                  value={formatMoney(m.price)}
                  icon="pricetag-outline"
                  tone="info"
                  caption={m.unit ? `per ${m.unit}` : undefined}
                />
                <StatCard
                  label="Store price"
                  value={formatMoney(m.store_price)}
                  icon="storefront-outline"
                  tone="violet"
                />
                <StatCard
                  label="In stock"
                  value={closing === undefined ? '…' : formatQty(closing, m.unit)}
                  icon="cube-outline"
                  tone="success"
                />
              </View>
              {!!m.category && (
                <Text variant="caption" color={t.colors.textMuted} style={styles.cat}>
                  Category · {m.category}
                </Text>
              )}
              {m.makes.length > 0 && (
                <Section title="Makes">
                  <Card>
                    <Text variant="body">{m.makes.join(' · ')}</Text>
                  </Card>
                </Section>
              )}
              {history.length > 1 && (
                <Section title="Price history">
                  <LineChartCard title="Supplier price over time" data={history} />
                </Section>
              )}
              {m.supplier_prices.length > 0 && (
                <Section title="Supplier prices">
                  <Card>
                    {m.supplier_prices.map((p, i) => (
                      <KeyValue
                        key={i}
                        label={`${p.supplier?.name ?? p.name ?? '—'} · since ${formatDate(p.effect_since)}`}
                        value={formatMoney(p.price)}
                      />
                    ))}
                  </Card>
                </Section>
              )}
              {m.bill_of_material.length > 0 && (
                <Section title="Bill of material">
                  <Card>
                    {m.bill_of_material.map((b, i) => (
                      <KeyValue
                        key={i}
                        label={`${b.name}${b.drawing_no ? ` · ${b.drawing_no}` : ''}`}
                        value={formatQty(b.quantity, b.unit)}
                      />
                    ))}
                  </Card>
                </Section>
              )}
              {m.taxes.length > 0 && (
                <Section title="Taxes">
                  <Card>
                    <Text variant="body">{m.taxes.map((tx) => tx.name).join(' · ')}</Text>
                  </Card>
                </Section>
              )}
            </>
          );
        }}
      </QueryState>
    </Animated.ScrollView>,
  );
}

const useStyles = makeStyles((t) => ({
  pad: { padding: t.space.gutter, paddingBottom: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cat: { marginTop: 10 },
}));
