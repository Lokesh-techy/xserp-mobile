/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { formatMoney, formatQty } from '@/core/utils';
import { useTaxes } from '@/features/master-data';
import { BottomSheet, Button, Chip, Input, Text } from '@/ui';

import { fetchStockOnHand } from './api';
import { invoiceItemSchema, type InvoiceItem } from './schema';

type Props = { item: InvoiceItem | null; onClose: () => void; onSave: (item: InvoiceItem) => void; onRemove: () => void };

const num = (s: string) => (s.trim() === '' ? Number.NaN : Number(s.replace(/,/g, '')));

/** Edit one line: quantity, rate, discount and taxes, with stock in hand and live validation. */
export function ItemEditorSheet({ item, onClose, onSave, onRemove }: Props) {
  return <BottomSheet visible={!!item} onClose={onClose} title="Edit item">{item && <Editor key={`${item.itemId}:${item.makeId}`} item={item} onClose={onClose} onSave={onSave} onRemove={onRemove} />}</BottomSheet>;
}

function Editor({ item, onClose, onSave, onRemove }: Props & { item: InvoiceItem }) {
  const t = useTheme();
  const styles = useStyles();
  const taxes = useTaxes();
  // Text drafts so partial input like "12." or "0.5" can be typed; validated on save.
  const [qty, setQty] = useState(String(item.quantity));
  const [rate, setRate] = useState(String(item.rate));
  const [discount, setDiscount] = useState(String(item.discount));
  const [taxCodes, setTaxCodes] = useState(item.taxCodes);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const stock = useQuery({ queryKey: ['stores', 'stock-on-hand', item.itemId, item.makeId], queryFn: () => fetchStockOnHand(item.itemId, item.makeId), staleTime: 60_000 });
  const draft = { ...item, quantity: num(qty), rate: num(rate), discount: discount.trim() === '' ? 0 : num(discount), taxCodes };
  const lineValue = Number.isFinite(draft.quantity * draft.rate) ? draft.quantity * draft.rate * (1 - (draft.discount || 0) / 100) : 0;

  const save = () => {
    const r = invoiceItemSchema.safeParse(draft);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    onSave(r.data);
    onClose();
  };

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <Text variant="heading" numberOfLines={2}>
          {item.name}
        </Text>
        <Text variant="caption" color={stock.data !== undefined && stock.data <= 0 ? t.colors.warningText : t.colors.textMuted}>
          {stock.isPending ? 'Checking stock…' : stock.data !== undefined ? `In stock: ${formatQty(stock.data, item.unit)}` : 'Stock unavailable'}
          {item.hsnCode ? ` · HSN ${item.hsnCode}` : ''}
        </Text>
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Input label={`Quantity${item.unit ? ` (${item.unit})` : ''}`} required icon="layers-outline" keyboardType="decimal-pad" value={qty} onChangeText={setQty} error={errors.quantity} selectTextOnFocus />
        </View>
        <View style={styles.flex}>
          <Input label="Rate" required icon="pricetag-outline" keyboardType="decimal-pad" value={rate} onChangeText={setRate} error={errors.rate} selectTextOnFocus />
        </View>
      </View>
      <Input label="Discount %" icon="trending-down-outline" keyboardType="decimal-pad" value={discount} onChangeText={setDiscount} error={errors.discount} selectTextOnFocus />
      <Text variant="overline" color={t.colors.textMuted}>
        Taxes
      </Text>
      <View style={styles.wrap}>
        {taxes.map((tx) => (
          <Chip key={tx.code} label={tx.name} active={taxCodes.includes(tx.code)} onPress={() => setTaxCodes((c) => (c.includes(tx.code) ? c.filter((x) => x !== tx.code) : [...c, tx.code]))} />
        ))}
      </View>
      <View style={styles.total}>
        <Text variant="label" color={t.colors.textMuted}>
          Line value
        </Text>
        <Text variant="heading">{formatMoney(lineValue)}</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Remove" icon="trash-outline" variant="danger" size="sm" onPress={() => (onRemove(), onClose())} style={styles.flex} />
        <Button title="Save item" icon="checkmark-outline" size="sm" onPress={save} style={styles.grow} />
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  body: { paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  head: { gap: 4 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  grow: { flex: 1.6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.colors.divider },
  actions: { flexDirection: 'row', gap: 10 },
}));
