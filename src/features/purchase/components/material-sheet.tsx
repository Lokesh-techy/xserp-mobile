/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';

import { useCan } from '@/core/permissions';
import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, formatMoney, formatQty } from '@/core/utils';
import { KeyValue, ListSkeleton, Section, StatusPill, Text } from '@/ui';

import { fetchMaterialOverdue, fetchMaterialStock, fetchSupplierProfile, type PoMaterial, type PurchaseOrder } from '../api';
import { purchaseKeys } from '../keys';

const RATE_STATUS = { 1: { label: 'Approved', tone: 'success' }, 0: { label: 'Pending', tone: 'warning' }, [-1]: { label: 'Rejected', tone: 'danger' } } as const;

/** XSManager's PO material dialog: rate, supplier price history, stock and supplier outstanding. */
export function MaterialSheet({ item, lineKey, detail }: { item: PurchaseOrder; lineKey: string; detail: PoMaterial[] | undefined }) {
  const t = useTheme();
  const styles = useStyles();
  const canSeeAccounts = useCan('ACCOUNTS', 'view');
  const m = detail?.find((x) => `${x.itemId}:${x.makeId}` === lineKey);
  const profile = useQuery({ queryKey: purchaseKeys.profile(item.id, m?.itemId ?? ''), queryFn: () => fetchSupplierProfile(item, m!), enabled: !!m });
  const stock = useQuery({ queryKey: purchaseKeys.stock(m?.itemId ?? ''), queryFn: () => fetchMaterialStock(m!.itemId), enabled: !!m });
  const overdue = useQuery({ queryKey: purchaseKeys.overdue(item.id, m?.itemId ?? ''), queryFn: () => fetchMaterialOverdue(item, m!), enabled: !!m && canSeeAccounts });
  if (!m) return null;
  const closing = stock.data?.closing_stock ?? stock.data?.material_stock.reduce((s, r) => s + r.closing_stock, 0) ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text variant="heading">{m.name}</Text>
      <Text variant="caption" color={t.colors.textMuted}>
        {[m.drawingNo, m.makeName !== '-NA-' ? m.makeName : null].filter(Boolean).join(' · ')}
      </Text>
      <View>
        <KeyValue label="Quantity" value={formatQty(m.quantity, m.unit)} />
        <KeyValue label="Rate" value={formatMoney(m.price, item.currency)} />
        <KeyValue label="Discount" value={`${m.discount}%`} />
        <KeyValue label="Store price" value={formatMoney(m.storePrice, item.currency)} />
        <KeyValue label="In stock" value={stock.isPending ? '…' : formatQty(closing, m.unit)} />
      </View>
      <Section title="Supplier prices">
        {profile.isPending ? (
          <ListSkeleton rows={1} />
        ) : (profile.data?.supplier_prices ?? []).length === 0 ? (
          <Text variant="body" color={t.colors.textMuted}>
            No approved supplier prices
          </Text>
        ) : (
          profile.data?.supplier_prices.map((p, i) => {
            const st = RATE_STATUS[p.status as 1 | 0 | -1] ?? RATE_STATUS[0];
            return (
              <View key={i} style={styles.price}>
                <View style={styles.flex}>
                  <Text variant="label">{p.supplier?.name ?? p.name ?? '—'}</Text>
                  <Text variant="caption" color={t.colors.textMuted}>
                    {formatDate(p.effect_since)} – {p.effect_till ? formatDate(p.effect_till) : 'open'}
                  </Text>
                </View>
                <Text variant="label" weight="bold">
                  {formatMoney(p.price, item.currency)}
                </Text>
                <StatusPill label={st.label} tone={st.tone} />
              </View>
            );
          })
        )}
      </Section>
      {canSeeAccounts && (
        <Section title="Supplier outstanding">
          {(overdue.data ?? []).map((l) => (
            <View key={l.id}>
              <KeyValue label={l.name} value={formatMoney(l.due || l.total)} />
              <KeyValue label="Overdue" value={formatMoney(l.overdue)} />
            </View>
          ))}
          {!overdue.isPending && (overdue.data ?? []).length === 0 && (
            <Text variant="body" color={t.colors.textMuted}>
              Nothing outstanding
            </Text>
          )}
        </Section>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  body: { paddingHorizontal: 20, paddingBottom: 24, gap: 6 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  flex: { flex: 1, gap: 2 },
}));
