/** @author Lokesh */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { errorMessage } from '@/core/api';
import { makeStyles, useTheme } from '@/core/theme';
import { formatQty } from '@/core/utils';
import { useMaterialItems, useMaterials, useTaxes } from '@/features/master-data';
import { BottomSheet, Button, Chip, Input, PickerSheet, PressableScale, Text, type PickerItem } from '@/ui';

import { fetchPartyRate, fetchStockOnHand } from './api';
import type { InvoiceItem } from './schema';

type Props = { visible: boolean; partyId: string; onClose: () => void; onAdd: (item: InvoiceItem) => void };

const num = (s: string) => Number(s.replace(/,/g, '')) || 0;

/** XSManager's AddMaterialActivity: material, party rate, stock on hand, quantity, discount and taxes. */
export function AddMaterialSheet({ visible, partyId, onClose, onAdd }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const items = useMaterialItems();
  const materials = useMaterials();
  const taxes = useTaxes();
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<PickerItem | null>(null);
  const [qty, setQty] = useState('1');
  const [rate, setRate] = useState('');
  const [discount, setDiscount] = useState('0');
  const [taxCodes, setTaxCodes] = useState<string[]>([]);
  const [stock, setStock] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const material = picked ? materials.find((m) => `${m.itemId}:${m.makeId}` === picked.id) : undefined;

  const choose = async (p: PickerItem | null) => {
    setPicked(p);
    setStock(null);
    setError(null);
    if (!p) return;
    const [itemId = '', makeId = ''] = p.id.split(':');
    try {
      const [r, s] = await Promise.all([fetchPartyRate(partyId, itemId, makeId), fetchStockOnHand(itemId, makeId).catch(() => null)]);
      setRate(String(r.rate || ''));
      setDiscount(String(r.discount || 0));
      setStock(s);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const add = () => {
    if (!material) return setError('Choose a material.');
    if (num(qty) <= 0) return setError('Quantity must be more than 0.');
    onAdd({ itemId: material.itemId, makeId: material.makeId, name: material.name, unit: material.unit, hsnCode: material.hsnCode, quantity: num(qty), rate: num(rate), discount: num(discount), taxCodes });
    setPicked(null);
    setQty('1');
    setRate('');
    setDiscount('0');
    setTaxCodes([]);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add item">
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <PressableScale onPress={() => setPicking(true)} style={styles.picker}>
          <Text variant="label" color={picked ? t.colors.text : t.colors.textFaint} numberOfLines={1}>
            {picked?.label ?? 'Choose material'}
          </Text>
          {!!picked?.sublabel && (
            <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
              {picked.sublabel}
            </Text>
          )}
        </PressableScale>
        {stock !== null && (
          <Text variant="caption" color={stock > 0 ? t.colors.success : t.colors.warningText}>
            In stock: {formatQty(stock, material?.unit)}
          </Text>
        )}
        <View style={styles.row}>
          <View style={styles.flex}>
            <Input label="Quantity" icon="layers-outline" keyboardType="decimal-pad" value={qty} onChangeText={setQty} />
          </View>
          <View style={styles.flex}>
            <Input label="Rate" icon="pricetag-outline" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
          </View>
        </View>
        <Input label="Discount %" icon="trending-down-outline" keyboardType="decimal-pad" value={discount} onChangeText={setDiscount} />
        <Text variant="overline" color={t.colors.textMuted}>
          Taxes
        </Text>
        <View style={styles.wrap}>
          {taxes.map((tx) => (
            <Chip key={tx.code} label={tx.name} active={taxCodes.includes(tx.code)} onPress={() => setTaxCodes((c) => (c.includes(tx.code) ? c.filter((x) => x !== tx.code) : [...c, tx.code]))} />
          ))}
        </View>
        {!!error && (
          <Text variant="label" color={t.colors.danger}>
            {error}
          </Text>
        )}
        <Button title="Add item" icon="add-outline" onPress={add} />
      </ScrollView>
      <PickerSheet visible={picking} title="Material" items={items} selectedId={picked?.id} onSelect={(p) => void choose(p)} onClose={() => setPicking(false)} />
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  body: { paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  picker: { minHeight: 54, borderRadius: t.radius.md, borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.fillSubtle, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
}));
