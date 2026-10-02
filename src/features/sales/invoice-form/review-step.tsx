/** @author Lokesh */
import { useFormContext, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { formatMoney } from '@/core/utils';
import { useParties, useProjects, useTaxes } from '@/features/master-data';
import { Card, KeyValue, Text } from '@/ui';

import { invoiceTotals } from './build-payload';
import type { InvoiceForm } from './schema';

export function ReviewStep() {
  const t = useTheme();
  const styles = useStyles();
  const { control } = useFormContext<InvoiceForm>();
  const form = useWatch({ control }) as InvoiceForm;
  const parties = useParties();
  const projects = useProjects();
  const taxes = useTaxes();
  const totals = invoiceTotals({ items: form.items ?? [], packingCharges: form.packingCharges ?? 0, transportCharges: form.transportCharges ?? 0 }, taxes);
  return (
    <View style={styles.root}>
      <Card>
        <KeyValue label="Type" value={form.type} />
        <KeyValue label="Customer" value={parties.find((p) => p.id === form.partyId)?.name} />
        <KeyValue label="Project" value={projects.find((p) => p.id === form.projectId)?.name} />
        <KeyValue label="Items" value={(form.items ?? []).length} />
        <KeyValue label="Customer PO" value={form.poNo} />
      </Card>
      <Card>
        <KeyValue label="Subtotal" value={formatMoney(totals.subtotal)} />
        <KeyValue label="Tax" value={formatMoney(totals.tax)} />
        <KeyValue label="Charges" value={formatMoney(totals.charges)} />
        <View style={styles.total}>
          <Text variant="heading">Total</Text>
          <Text variant="title">{formatMoney(totals.total)}</Text>
        </View>
        <Text variant="caption" color={t.colors.textMuted}>
          Estimate — XSERP calculates the final amounts when the invoice is saved.
        </Text>
      </Card>
    </View>
  );
}

const useStyles = makeStyles(() => ({ root: { gap: 14 }, total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 } }));
