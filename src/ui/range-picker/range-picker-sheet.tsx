/** @author Lokesh */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { makeStyles } from '@/core/theme';
import type { DateRange } from '@/core/utils';

import { BottomSheet } from '../bottom-sheet';
import { Button } from '../button';
import { rangeDays } from './logic';
import { RangePicker, type RangePreset } from './range-picker';

type Props = {
  visible: boolean;
  value: DateRange;
  presets: RangePreset[];
  onApply: (r: DateRange) => void;
  onClose: () => void;
};

/** The range picker in a sheet: pick freely, nothing reloads until Apply. */
export function RangePickerSheet({ visible, value, presets, onApply, onClose }: Props) {
  const styles = useStyles();
  const [draft, setDraft] = useState(value);
  // Re-seed the draft each time the sheet opens (state adjusted during render, not in an effect).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(value);
  }
  const days = rangeDays(draft);
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Date range"
      maxHeightRatio={0.94}
      footer={
        <View style={styles.footer}>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={styles.cancel} />
          <Button
            title={`Show ${days} ${days === 1 ? 'day' : 'days'}`}
            icon="checkmark"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            style={styles.apply}
          />
        </View>
      }>
      <ScrollView contentContainerStyle={styles.body} bounces={false}>
        <RangePicker value={draft} onChange={setDraft} presets={presets} />
      </ScrollView>
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  body: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 },
  footer: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 1 },
  apply: { flex: 2 },
}));
