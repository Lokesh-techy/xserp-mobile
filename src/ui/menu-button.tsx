/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { usePlacement } from './header-slot';
import { PickerSheet } from './picker-sheet';
import { Popover, type Anchor } from './popover';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

const LONG_LIST = 10;

/** `short` is what a compact button shows ("30 days"); the menu always lists `label`. */
export type MenuOption = { key: string; label: string; short?: string; detail?: string; dot?: string };

type Single = { multiple?: false; value: string; onChange: (key: string) => void };
type Multi = { multiple: true; values: string[]; onChangeMany: (keys: string[]) => void; allLabel: string };
type Props = (Single | Multi) & {
  title: string;
  options: MenuOption[];
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** `header` sits on the gradient bar; `compact` beside the tabs. Defaults from where it is placed. */
  appearance?: 'field' | 'header' | 'compact';
};

/**
 * "Last 30 days ⌄" — shows the current choice; tapping it grows a small menu out of the button itself.
 * The natural alternative to a row of pills for picking a range, a sort, a status or a set of types.
 */
export function MenuButton(props: Props) {
  const t = useTheme();
  const styles = useStyles();
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const placement = usePlacement();
  const {
    title,
    options,
    icon,
    appearance = placement === 'bar' ? 'header' : placement === 'tabs' ? 'compact' : 'field',
  } = props;
  const header = appearance === 'header';
  const compact = appearance === 'compact';
  const allOn = !!props.multiple && (props.values.length === 0 || props.values.length === options.length);
  const summary = props.multiple
    ? allOn
      ? props.allLabel
      : options
          .filter((o) => props.values.includes(o.key))
          .map((o) => o.label)
          .join(', ')
    : (() => {
        const o = options.find((x) => x.key === props.value);
        return (header || compact ? (o?.short ?? o?.label) : o?.label) ?? title;
      })();
  const changed = props.multiple ? !allOn : false;

  // A long single-choice list (suppliers, parties) gets the searchable sheet instead of a popover.
  const long = !props.multiple && options.length > LONG_LIST;
  const [sheet, setSheet] = useState(false);
  const open = () => {
    Haptics.selectionAsync().catch(() => {});
    if (long) return setSheet(true);
    trigger.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  };
  // Multi-select applies as you tick (like a native menu), so there is no Done step.
  const toggle = (key: string) => {
    if (!props.multiple) return;
    Haptics.selectionAsync().catch(() => {});
    const cur = allOn ? [] : props.values;
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
    props.onChangeMany(next.length === options.length ? [] : next);
  };

  const fg = header ? t.alpha.onGradient : changed ? t.colors.onPrimarySoft : t.colors.text;
  const faint = header ? t.alpha.onGradientMuted : t.colors.textMuted;
  return (
    <>
      <View ref={trigger} collapsable={false}>
        <PressableScale
          onPress={open}
          scaleTo={0.96}
          style={[
            styles.button,
            header ? styles.header : compact ? [styles.compact, changed && styles.changed] : changed && styles.changed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${summary}`}>
          {icon && <Ionicons name={icon} size={14} color={changed && !header ? t.colors.onPrimarySoft : faint} />}
          <Text variant="label" weight="semibold" color={fg} numberOfLines={1} style={styles.label}>
            {summary}
          </Text>
          <Ionicons name="chevron-down" size={13} color={faint} />
        </PressableScale>
      </View>
      {long && !props.multiple && (
        <PickerSheet
          visible={sheet}
          title={title}
          items={options.map((o) => ({ id: o.key, label: o.label, sublabel: o.detail }))}
          selectedId={props.value}
          allowClear={false}
          onSelect={(i) => i && props.onChange(i.id)}
          onClose={() => setSheet(false)}
        />
      )}
      <Popover anchor={anchor} onClose={() => setAnchor(null)}>
        <Text variant="caption" weight="bold" color={t.colors.textFaint} style={styles.heading}>
          {title.toUpperCase()}
        </Text>
        {props.multiple && <Row label={props.allLabel} on={allOn} onPress={() => props.onChangeMany([])} />}
        {props.multiple && <View style={styles.sep} />}
        {options.map((o) => (
          <Row
            key={o.key}
            label={o.label}
            detail={o.detail}
            dot={o.dot}
            multiple={props.multiple}
            on={props.multiple ? !allOn && props.values.includes(o.key) : o.key === props.value}
            onPress={() => {
              if (props.multiple) toggle(o.key);
              else {
                Haptics.selectionAsync().catch(() => {});
                props.onChange(o.key);
                setAnchor(null);
              }
            }}
          />
        ))}
      </Popover>
    </>
  );
}

function Row({
  label,
  detail,
  dot,
  on,
  multiple,
  onPress,
}: {
  label: string;
  detail?: string;
  dot?: string;
  on: boolean;
  multiple?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      style={styles.row}
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: on }}>
      {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      <Text variant="label" weight={on ? 'bold' : 'medium'} style={styles.flex}>
        {label}
      </Text>
      {!!detail && (
        <Text variant="caption" color={t.colors.textMuted}>
          {detail}
        </Text>
      )}
      <Ionicons name="checkmark" size={18} color={on ? t.colors.accent : 'transparent'} />
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: t.colors.fill,
    maxWidth: 220,
  },
  changed: { backgroundColor: t.colors.primarySoft },
  label: { flexShrink: 1 },
  compact: { height: 30, maxWidth: 130, paddingHorizontal: 10, borderRadius: 15 },
  header: { backgroundColor: t.alpha.glassButton, height: 32, maxWidth: 170, paddingHorizontal: 11, borderRadius: 16 },
  heading: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, letterSpacing: 0.6 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.divider, marginHorizontal: 16, marginVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
}));
