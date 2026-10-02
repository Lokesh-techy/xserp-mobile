/** @author Lokesh */
import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { View } from 'react-native';

import { makeStyles } from '@/core/theme';
import { Input, type IconName } from '@/ui';

import type { InvoiceForm } from './schema';

type TextKey = 'paymentTerms' | 'transportMode' | 'lrNo' | 'roadPermitNo' | 'packingSlipNo' | 'packingDescription' | 'specialInstruction' | 'notes';

const CHARGES: { key: 'packingCharges' | 'transportCharges'; label: string; icon: IconName }[] = [
  { key: 'packingCharges', label: 'Packing charges', icon: 'cube-outline' },
  { key: 'transportCharges', label: 'Transport charges', icon: 'car-outline' },
];
const CHARGE_TEXT: { key: TextKey; label: string; icon: IconName }[] = [{ key: 'paymentTerms', label: 'Payment terms', icon: 'card-outline' }];
const TRANSPORT: { key: TextKey; label: string; icon: IconName }[] = [
  { key: 'transportMode', label: 'Transport mode', icon: 'bus-outline' },
  { key: 'lrNo', label: 'LR no.', icon: 'barcode-outline' },
  { key: 'roadPermitNo', label: 'Road permit no.', icon: 'document-outline' },
  { key: 'packingSlipNo', label: 'Packing slip no.', icon: 'reader-outline' },
  { key: 'packingDescription', label: 'Packing description', icon: 'archive-outline' },
  { key: 'specialInstruction', label: 'Special instructions', icon: 'alert-circle-outline' },
  { key: 'notes', label: 'Notes', icon: 'create-outline' },
];

export function ChargesStep() {
  const styles = useStyles();
  const { control } = useFormContext<InvoiceForm>();
  return (
    <View style={styles.root}>
      {CHARGES.map((c) => (
        <Controller
          key={c.key}
          control={control}
          name={c.key}
          render={({ field, fieldState }) => <MoneyInput label={c.label} icon={c.icon} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />}
        />
      ))}
      <TextFields fields={CHARGE_TEXT} />
    </View>
  );
}

export function TransportStep() {
  const styles = useStyles();
  return (
    <View style={styles.root}>
      <TextFields fields={TRANSPORT} />
    </View>
  );
}

/** Keeps the typed text (so "150." and "0.5" can be entered) and reports a number to the form. */
function MoneyInput({ label, icon, value, onChange, error }: { label: string; icon: IconName; value: number; onChange: (n: number) => void; error?: string }) {
  const [text, setText] = useState(value ? String(value) : '');
  return (
    <Input
      label={label}
      icon={icon}
      keyboardType="decimal-pad"
      value={text}
      error={error ?? (text && !Number.isFinite(Number(text.replace(/,/g, ''))) ? 'Enter a number' : undefined)}
      onChangeText={(v) => {
        setText(v);
        const n = Number(v.replace(/,/g, ''));
        onChange(v.trim() === '' ? 0 : Number.isFinite(n) ? n : value);
      }}
    />
  );
}

function TextFields({ fields }: { fields: { key: TextKey; label: string; icon: IconName }[] }) {
  const { control } = useFormContext<InvoiceForm>();
  return (
    <>
      {fields.map((f) => (
        <Controller key={f.key} control={control} name={f.key} render={({ field }) => <Input label={f.label} icon={f.icon} value={field.value} onChangeText={field.onChange} multiline={f.key === 'notes' || f.key === 'specialInstruction'} />} />
      ))}
    </>
  );
}

const useStyles = makeStyles(() => ({ root: { gap: 16 } }));
