/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';

import { makeStyles, useTheme } from '@/core/theme';
import { formatMoney } from '@/core/utils';
import { Bone, Card, KeyValue, StateView, Text } from '@/ui';

import { fetchMaterialOverdue, type PoMaterial, type PurchaseOrder } from '../api';
import { purchaseKeys } from '../keys';

/** Supplier's open balance and ageing, from the first material on the PO (XSManager behaviour). */
export function OutstandingSection({ item, detail }: { item: PurchaseOrder; detail: PoMaterial[] | undefined }) {
  const t = useTheme();
  const styles = useStyles();
  const first = detail?.[0];
  const query = useQuery({
    queryKey: purchaseKeys.overdue(item.id, first?.itemId ?? ''),
    queryFn: () => fetchMaterialOverdue(item, first!),
    enabled: !!first && !!item.supplierId,
  });
  if (!first || query.isPending) {
    return (
      <Card style={styles.card}>
        <Bone style={{ width: '70%', height: 14 }} />
        <Bone style={{ width: '50%', height: 14 }} />
      </Card>
    );
  }
  const ledger = query.data?.[0];
  if (!ledger) return <StateView icon="checkmark-circle-outline" title="No outstanding" message="This supplier has no open balance." />;
  const a = ledger.aging;
  return (
    <Card style={styles.card}>
      <Text variant="label">{ledger.name}</Text>
      <KeyValue label="Total due" value={formatMoney(ledger.total || ledger.due)} />
      <Text variant="label" color={t.colors.danger}>
        Overdue {formatMoney(ledger.overdue || a?.overdue || 0)}
      </Text>
      {a && (
        <>
          <KeyValue label="0–30 days" value={formatMoney(a.age1)} />
          <KeyValue label="31–60 days" value={formatMoney(a.age2)} />
          <KeyValue label="61–90 days" value={formatMoney(a.age3)} />
          <KeyValue label="90+ days" value={formatMoney(a.age4)} />
        </>
      )}
    </Card>
  );
}

const useStyles = makeStyles(() => ({ card: { gap: 8 } }));
