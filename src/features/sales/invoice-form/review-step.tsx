/** @author Lokesh */
import { useFormContext, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, formatMoney } from '@/core/utils';
import { useLedgers, useParties, useProjects, useTaxes } from '@/features/master-data';
import { Card, KeyValue, PressableScale, Text } from '@/ui';

import { invoiceTotals } from './build-payload';
import type { InvoiceForm } from './schema';

function Block({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Card style={styles.block}>
      <View style={styles.blockHead}>
        <Text variant="overline" color={t.colors.textMuted}>
          {title}
        </Text>
        <PressableScale onPress={onEdit} hitSlop={10} accessibilityLabel={`Edit ${title}`}>
          <Text variant="label" weight="bold" color={t.colors.accent}>
            Edit
          </Text>
        </PressableScale>
      </View>
      {children}
    </Card>
  );
}

/** Everything at a glance, each section one tap from its step. */
export function ReviewStep({ goTo }: { goTo: (step: number) => void }) {
  const t = useTheme();
  const styles = useStyles();
  const { control } = useFormContext<InvoiceForm>();
  const form = useWatch({ control }) as InvoiceForm;
  const parties = useParties();
  const projects = useProjects();
  const ledgers = useLedgers();
  const taxes = useTaxes();
  const totals = invoiceTotals({ items: form.items ?? [], packingCharges: form.packingCharges ?? 0, transportCharges: form.transportCharges ?? 0 }, taxes);
  return (
    <View style={styles.root}>
      <Block title="Party" onEdit={() => goTo(0)}>
        <KeyValue label="Type" value={form.type} />
        <KeyValue label="Customer" value={parties.find((p) => p.id === form.partyId)?.name} />
        <KeyValue label="Project" value={projects.find((p) => p.id === form.projectId)?.name} />
        <KeyValue label="Sales account" value={ledgers.find((l) => l.id === form.saleAccountId)?.name} />
        <KeyValue label="Customer PO" value={[form.poNo, form.poDate ? formatDate(form.poDate) : null].filter(Boolean).join(' · ')} />
        <KeyValue label="GSTIN" value={form.gstin} />
      </Block>
      <Block title={`Items · ${(form.items ?? []).length}`} onEdit={() => goTo(1)}>
        {(form.items ?? []).map((i, n) => (
          <KeyValue key={`${i.itemId}:${i.makeId}:${n}`} label={`${i.name} × ${i.quantity}`} value={formatMoney(i.quantity * i.rate * (1 - i.discount / 100))} />
        ))}
      </Block>
      <Block title="Charges & terms" onEdit={() => goTo(2)}>
        <KeyValue label="Packing" value={formatMoney(form.packingCharges ?? 0)} />
        <KeyValue label="Transport" value={formatMoney(form.transportCharges ?? 0)} />
        <KeyValue label="Payment terms" value={form.paymentTerms} />
      </Block>
      <Block title="Transport" onEdit={() => goTo(3)}>
        <KeyValue label="Mode" value={form.transportMode} />
        <KeyValue label="LR no." value={form.lrNo} />
      </Block>
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

const useStyles = makeStyles(() => ({
  root: { gap: 12 },
  block: { gap: 2 },
  blockHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
}));
