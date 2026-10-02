/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { formatMoney, formatQty } from '@/core/utils';
import { Button, Card, StateView, Text } from '@/ui';

import { AddMaterialSheet } from './add-material-sheet';
import type { InvoiceForm } from './schema';

export function ItemsStep() {
  const t = useTheme();
  const styles = useStyles();
  const { control, formState, trigger } = useFormContext<InvoiceForm>();
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const partyId = useWatch({ control, name: 'partyId' });
  const [adding, setAdding] = useState(false);
  return (
    <View style={styles.root}>
      {fields.length === 0 ? (
        <StateView icon="cube-outline" title="No items yet" message={formState.errors.items?.message ?? 'Add the materials you are invoicing.'} />
      ) : (
        fields.map((f, i) => (
          <Card key={f.id} style={styles.card}>
            <View style={styles.flex}>
              <Text variant="label">{f.name}</Text>
              <Text variant="caption" color={t.colors.textMuted}>
                {formatQty(f.quantity, f.unit)} × {formatMoney(f.rate)}
                {f.discount ? ` · ${f.discount}% off` : ''}
                {f.taxCodes.length ? ` · ${f.taxCodes.join(', ')}` : ''}
              </Text>
            </View>
            <Text variant="label" weight="bold">
              {formatMoney(f.quantity * f.rate * (1 - f.discount / 100))}
            </Text>
            <Pressable hitSlop={10} onPress={() => remove(i)} accessibilityLabel={`Remove ${f.name}`}>
              <Ionicons name="trash-outline" size={18} color={t.colors.danger} />
            </Pressable>
          </Card>
        ))
      )}
      <Button title="Add item" icon="add-circle-outline" variant="ghost" onPress={() => setAdding(true)} />
      <AddMaterialSheet
        visible={adding}
        partyId={partyId}
        onClose={() => setAdding(false)}
        onAdd={(item) => {
          append(item);
          void trigger('items');
        }}
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({ root: { gap: 12 }, card: { flexDirection: 'row', alignItems: 'center', gap: 12 }, flex: { flex: 1, gap: 2 } }));
