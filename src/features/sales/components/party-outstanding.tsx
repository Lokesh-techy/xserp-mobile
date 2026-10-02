/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';

import { makeStyles, useTheme } from '@/core/theme';
import { formatMoney } from '@/core/utils';
import { Bone, Card, KeyValue, StateView, Text } from '@/ui';

import { fetchPartyOverdue } from '../api';
import { salesKeys } from '../keys';

/** Customer's open balance and ageing for an invoice/OA under review. */
export function PartyOutstanding({ partyId }: { partyId: string }) {
  const t = useTheme();
  const styles = useStyles();
  const query = useQuery({ queryKey: salesKeys.partyOverdue(partyId), queryFn: () => fetchPartyOverdue(partyId), enabled: !!partyId });
  if (query.isPending) {
    return (
      <Card style={styles.card}>
        <Bone style={{ width: '70%', height: 14 }} />
        <Bone style={{ width: '50%', height: 14 }} />
      </Card>
    );
  }
  const l = query.data?.[0];
  if (!l) return <StateView icon="checkmark-circle-outline" title="No outstanding" message="This customer has no open balance." />;
  return (
    <Card style={styles.card}>
      <Text variant="label">{l.name}</Text>
      <KeyValue label="Total due" value={formatMoney(l.total || l.due)} />
      <Text variant="label" color={t.colors.danger}>
        Overdue {formatMoney(l.overdue || l.aging?.overdue || 0)}
      </Text>
      {l.aging && (
        <>
          <KeyValue label="0–30 days" value={formatMoney(l.aging.age1)} />
          <KeyValue label="31–60 days" value={formatMoney(l.aging.age2)} />
          <KeyValue label="61–90 days" value={formatMoney(l.aging.age3)} />
          <KeyValue label="90+ days" value={formatMoney(l.aging.age4)} />
        </>
      )}
    </Card>
  );
}

const useStyles = makeStyles(() => ({ card: { gap: 8 } }));
