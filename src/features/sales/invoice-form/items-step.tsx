/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { formatMoney, formatQty } from '@/core/utils';
import { useMaterialItems, useMaterials } from '@/features/master-data';
import { Button, PressableScale, StateView, Text, toast } from '@/ui';

import { fetchPartyRate } from './api';
import { ItemEditorSheet } from './item-editor-sheet';
import { MaterialPickerSheet } from './material-picker-sheet';
import type { InvoiceForm, InvoiceItem } from './schema';

const lineValue = (i: InvoiceItem) => i.quantity * i.rate * (1 - i.discount / 100);

/** Pick several materials at once (party rates fill in), then tap any line to edit or remove it. */
export function ItemsStep() {
  const t = useTheme();
  const styles = useStyles();
  const { control, formState, trigger } = useFormContext<InvoiceForm>();
  const { fields, append, update, remove } = useFieldArray({ control, name: 'items' });
  const partyId = useWatch({ control, name: 'partyId' });
  const materials = useMaterials();
  const materialItems = useMaterialItems();
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const addMany = async (picks: { id: string; quantity: number }[]) => {
    // A material already on the invoice gets its quantity topped up instead of a duplicate line.
    const fresh: typeof picks = [];
    for (const p of picks) {
      const at = fields.findIndex((f) => `${f.itemId}:${f.makeId}` === p.id);
      if (at >= 0) update(at, { ...fields[at]!, quantity: fields[at]!.quantity + p.quantity });
      else fresh.push(p);
    }
    if (!fresh.length) return;
    setAdding(true);
    const rows = await Promise.all(
      fresh.map(async ({ id: key, quantity }) => {
        const m = materials.find((x) => `${x.itemId}:${x.makeId}` === key);
        if (!m) return null;
        const rate = partyId ? await fetchPartyRate(partyId, m.itemId, m.makeId).catch(() => ({ rate: 0, discount: 0 })) : { rate: 0, discount: 0 };
        return { itemId: m.itemId, makeId: m.makeId, name: m.name, unit: m.unit, hsnCode: m.hsnCode, quantity, rate: rate.rate, discount: rate.discount, taxCodes: [] } satisfies InvoiceItem;
      }),
    );
    rows.forEach((r) => r && append(r));
    setAdding(false);
    void trigger('items');
    toast.show({ message: `${fresh.length} item${fresh.length === 1 ? '' : 's'} added — tap a line to adjust rate or taxes`, tone: 'success' });
  };

  const total = fields.reduce((n, f) => n + lineValue(f), 0);
  return (
    <View style={styles.root}>
      {fields.length === 0 ? (
        <StateView icon="cube-outline" title="No items yet" message={formState.errors.items?.message ?? 'Pick one or more materials to invoice.'} />
      ) : (
        <View style={styles.list}>
          {fields.map((f, i) => {
            const bad = !!formState.errors.items?.[i];
            return (
              <PressableScale key={f.id} onPress={() => setEditing(i)} style={[styles.line, i > 0 && styles.divider, bad && styles.bad]} scaleTo={0.99} accessibilityLabel={`Edit ${f.name}`}>
                <View style={styles.flex}>
                  <Text variant="label" numberOfLines={1}>
                    {f.name}
                  </Text>
                  <Text variant="caption" color={bad ? t.colors.danger : t.colors.textMuted} numberOfLines={1}>
                    {bad ? 'Check quantity and rate' : `${formatQty(f.quantity, f.unit)} × ${formatMoney(f.rate)}${f.discount ? ` · ${f.discount}% off` : ''}${f.taxCodes.length ? ` · ${f.taxCodes.join(', ')}` : ''}`}
                  </Text>
                </View>
                <Text variant="label" weight="bold" style={styles.amount}>
                  {formatMoney(lineValue(f))}
                </Text>
                <Ionicons name="create-outline" size={18} color={t.colors.textFaint} />
              </PressableScale>
            );
          })}
          <View style={[styles.line, styles.divider]}>
            <Text variant="label" color={t.colors.textMuted} style={styles.flex}>
              {fields.length} item{fields.length === 1 ? '' : 's'}
            </Text>
            <Text variant="heading">{formatMoney(total)}</Text>
          </View>
        </View>
      )}
      <Button title={adding ? 'Adding' : fields.length ? 'Add more items' : 'Add items'} icon="add-circle-outline" variant="ghost" loading={adding} onPress={() => setPicking(true)} />
      <MaterialPickerSheet visible={picking} items={materialItems} onConfirm={(picks) => void addMany(picks)} onClose={() => setPicking(false)} />
      <ItemEditorSheet
        item={editing === null ? null : (fields[editing] ?? null)}
        onClose={() => setEditing(null)}
        onSave={(item) => {
          if (editing !== null) update(editing, item);
          void trigger('items');
        }}
        onRemove={() => editing !== null && remove(editing)}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: 12 },
  list: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, paddingHorizontal: 14, ...t.shadow.card },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: t.colors.divider },
  bad: { backgroundColor: t.colors.dangerSoft, marginHorizontal: -14, paddingHorizontal: 14 },
  flex: { flex: 1, gap: 2 },
  amount: { fontVariant: ['tabular-nums'] },
}));
