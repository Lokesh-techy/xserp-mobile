/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { Controller, useFormContext } from 'react-hook-form';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { useLedgerItems, usePartyItems, useProjectItems, type LedgerName } from '@/features/master-data';
import { Chip, DateField, Input, Text } from '@/ui';

import { fetchFrequentPicks, fetchLastUsedDetails } from './api';
import { PickField } from './pick-field';
import { INVOICE_TYPES, type InvoiceForm } from './schema';

const salesLedger = (l: LedgerName) => /sales/i.test(l.group) || /sales/i.test(l.name);

export function PartyStep() {
  const t = useTheme();
  const styles = useStyles();
  const { control, setValue, getValues, formState } = useFormContext<InvoiceForm>();
  const parties = usePartyItems();
  const projects = useProjectItems();
  const accounts = useLedgerItems(salesLedger);
  const frequent = useQuery({ queryKey: ['sales', 'frequent-picks'], queryFn: fetchFrequentPicks, staleTime: 10 * 60_000 });
  const first = (ids: string[] | undefined, items: typeof parties) => {
    const set = new Set(ids ?? []);
    return [...items.filter((i) => set.has(i.id)), ...items.filter((i) => !set.has(i.id))];
  };
  const e = formState.errors;

  const pickParty = async (id: string) => {
    setValue('partyId', id, { shouldValidate: true, shouldDirty: true });
    const last = await fetchLastUsedDetails(id).catch(() => null);
    if (!last) return;
    const fill = (k: 'deliverTo' | 'gstin' | 'paymentTerms' | 'transportMode' | 'packingDescription', v: string) => {
      if (v && !getValues(k)) setValue(k, v, { shouldDirty: true });
    };
    fill('deliverTo', last.deliverTo);
    fill('gstin', last.gstin);
    fill('paymentTerms', last.paymentTerms);
    fill('transportMode', last.transportMode);
    fill('packingDescription', last.packingDescription);
  };

  return (
    <View style={styles.root}>
      <Text variant="overline" color={t.colors.textMuted}>
        Invoice type
      </Text>
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <View style={styles.wrap}>
            {INVOICE_TYPES.map((ty) => (
              <Chip key={ty} label={ty} active={field.value === ty} onPress={() => field.onChange(ty)} />
            ))}
          </View>
        )}
      />
      <Controller control={control} name="partyId" render={({ field }) => <PickField label="Customer" items={first(frequent.data?.partyIds, parties)} value={field.value} onChange={(id) => void pickParty(id)} error={e.partyId?.message} />} />
      <Controller control={control} name="projectId" render={({ field }) => <PickField label="Project" items={first(frequent.data?.projectIds, projects)} value={field.value} onChange={field.onChange} error={e.projectId?.message} />} />
      <Controller control={control} name="saleAccountId" render={({ field }) => <PickField label="Sales account" items={accounts} value={field.value} onChange={field.onChange} error={e.saleAccountId?.message} />} />
      <Controller control={control} name="poNo" render={({ field }) => <Input label="Customer PO no." icon="document-outline" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="poDate" render={({ field }) => <DateField label="Customer PO date" value={field.value ?? new Date()} onChange={field.onChange} />} />
      <Controller control={control} name="gstin" render={({ field }) => <Input label="GSTIN" icon="shield-outline" autoCapitalize="characters" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="deliverTo" render={({ field }) => <Input label="Deliver to" icon="location-outline" multiline value={field.value} onChangeText={field.onChange} />} />
    </View>
  );
}

const useStyles = makeStyles(() => ({ root: { gap: 16 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } }));
