/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/core/auth';
import { can } from '@/core/permissions';
import { makeStyles, useTheme } from '@/core/theme';
import { openDocumentViewer, Popover, PressableScale, Text, type Anchor, type IconName } from '@/ui';

import { actionTone, type ActionTone } from './card-tone';
import { CountdownButton } from './countdown-button';
import { RemarksSheet } from './remarks-sheet';
import { erase, visibleActions, type ApprovalAction, type ApprovalConfig } from './types';
import { UNDO_MS } from './action-queue';
import { useApprovalActions } from './use-approval-action';

export { actionTone } from './card-tone';

export type CardAction = {
  key: string;
  label: string;
  icon: IconName;
  tone: ActionTone;
  onPress: () => void;
  a11y: string;
  /** Set while this action is scheduled: the button becomes a timer that cancels on tap. */
  countdown?: { ms: number; onCancel: () => void };
};

/** On a card the decisive actions use the plainest glyphs: a check to approve, a cross to reject. */
const glyph = (a: CardAction): IconName =>
  a.tone === 'success' ? 'checkmark' : a.tone === 'danger' ? 'close' : a.icon;

/** Solid fills for the main action, from the app's gradients; ghost actions stay soft. */
const SOLID: Partial<Record<ActionTone, 'success' | 'danger' | 'accent'>> = {
  success: 'success',
  danger: 'danger',
  primary: 'accent',
};

/** Round icon buttons beside the main action; beyond this, the rest go behind "•••". */
export const MAX_ICONS = 2;
const RANK: Record<ActionTone, number> = { success: 0, danger: 1, primary: 2, ghost: 3 };

/**
 * A compact strip: the main action (approve, when allowed) as the only labelled button, the next ones
 * (reject first) as round icons, and "•••" holding the rest once there are more than two.
 */
export function splitActions(actions: CardAction[]) {
  const [main, ...rest] = [...actions].sort((a, b) => RANK[a.tone] - RANK[b.tone]);
  if (rest.length <= MAX_ICONS) return { main, icons: rest, more: [] as CardAction[] };
  return { main, icons: rest.slice(0, MAX_ICONS - 1), more: rest.slice(MAX_ICONS - 1) };
}

/** Actions that go straight to a countdown on the card: positive ones that don't need a reason. */
export const isInstant = (a: Pick<ApprovalAction<unknown>, 'tone' | 'remarks'>) =>
  a.tone === 'success' && a.remarks !== 'required';

/**
 * The detail screen's actions, on the list card itself. Approve starts at once as a timer on its button
 * (tap again to cancel); actions that take a reason, like reject, ask for it in the remarks sheet, whose
 * button then counts down the same way. Either way it is sent when the time runs out.
 */
export function CardActions<T, D>({
  config,
  item,
  leading,
}: {
  config: ApprovalConfig<T, D>;
  item: T;
  /** Left side of the footer bar, e.g. the document date. */
  leading?: ReactNode;
}) {
  const session = useSession();
  const [picked, setPicked] = useState<ApprovalAction<T> | null>(null);
  // The action counting down on the card's own button (approve), if any.
  const [counting, setCounting] = useState<string | null>(null);
  const { start, cancel, isBusy } = useApprovalActions();
  const busy = isBusy(erase(config), item);
  // Done, failed or cancelled elsewhere: the button goes back to normal.
  if (counting && !busy) setCounting(null);
  const actions = can(session, config.permission, 'approve') ? visibleActions(config, item, { session }) : [];
  const doc = config.document?.(item);
  if (actions.length === 0 && !doc) return leading ? <CardActionRow actions={[]} leading={leading} /> : null;
  const code = config.summary(item).code;
  const run = (a: ApprovalAction<T>, remarks: string) =>
    start(erase(config), item, a as ApprovalAction<unknown>, remarks, { quiet: true });
  const stop = (a: ApprovalAction<T>) => cancel(erase(config), item, a as ApprovalAction<unknown>);
  const items: CardAction[] = actions.map((a) => ({
    key: a.id,
    label: a.label,
    icon: a.icon,
    tone: a.tone,
    onPress: () => {
      if (!isInstant(a)) return setPicked(a);
      if (run(a, '')) setCounting(a.id);
    },
    a11y: `${a.label} ${config.noun} ${code}`,
    countdown:
      counting === a.id
        ? {
            ms: UNDO_MS,
            onCancel: () => {
              stop(a);
              setCounting(null);
            },
          }
        : undefined,
  }));
  if (doc) {
    items.push({
      key: 'pdf',
      label: 'View PDF',
      icon: 'document-text-outline',
      tone: 'ghost',
      onPress: () => openDocumentViewer(doc),
      a11y: `View ${config.noun} ${code} PDF`,
    });
  }
  return (
    <>
      <CardActionRow actions={items} leading={leading} disabled={busy} />
      <RemarksSheet
        action={picked}
        onClose={() => setPicked(null)}
        onConfirm={(remarks) => (picked ? run(picked, remarks) : false)}
        countdownMs={UNDO_MS}
        onCancel={() => picked && stop(picked)}
      />
    </>
  );
}

/**
 * The card's footer bar, shared by every list card: optional `leading` content (the date) on the left,
 * the actions on the right with the main one last. A hairline separates it from the card's content.
 */
export function CardActionRow({
  actions,
  disabled,
  leading,
}: {
  actions: CardAction[];
  disabled?: boolean;
  leading?: ReactNode;
}) {
  const t = useTheme();
  const styles = useStyles();
  const { main, icons, more } = splitActions(actions);
  if (!main && !leading) return null;
  if (!main) return <View style={[styles.row, styles.footer, styles.start]}>{leading}</View>;
  const c = actionTone(t, main.tone);
  const solid = SOLID[main.tone];
  return (
    <View style={[styles.row, !!leading && styles.footer]}>
      {!!leading && <View style={styles.leading}>{leading}</View>}
      {more.length > 0 && <MoreButton actions={more} disabled={disabled} />}
      {icons.map((a) => {
        const tone = actionTone(t, a.tone);
        const off = disabled && a.key !== 'pdf';
        return (
          <PressableScale
            key={a.key}
            onPress={a.onPress}
            disabled={off}
            scaleTo={0.9}
            hitSlop={4}
            style={[styles.round, styles.outlined, { borderColor: `${tone.fg}55` }, off && styles.busy]}
            accessibilityRole="button"
            accessibilityLabel={a.a11y}>
            <Ionicons name={glyph(a)} size={a.tone === 'danger' ? 19 : 17} color={tone.fg} />
          </PressableScale>
        );
      })}
      {main.countdown ? (
        <CountdownButton
          label={main.label}
          ms={main.countdown.ms}
          tone={c}
          size="pill"
          onCancel={main.countdown.onCancel}
          a11y={main.a11y}
        />
      ) : (
        <PressableScale
          onPress={main.onPress}
          disabled={disabled && main.key !== 'pdf'}
          scaleTo={0.95}
          style={[
            styles.mainWrap,
            solid && { shadowColor: t.gradients[solid][1] },
            !solid && { backgroundColor: c.bg },
            disabled && main.key !== 'pdf' && styles.busy,
          ]}
          accessibilityRole="button"
          accessibilityLabel={main.a11y}>
          {solid && (
            <LinearGradient
              colors={t.gradients[solid]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.mainFill]}
            />
          )}
          <Ionicons name={glyph(main)} size={17} color={solid ? t.colors.white : c.fg} />
          <Text variant="label" weight="bold" color={solid ? t.colors.white : c.fg} numberOfLines={1}>
            {main.label}
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

/** "•••" that opens the remaining actions in the app's anchored menu. */
function MoreButton({ actions, disabled }: { actions: CardAction[]; disabled?: boolean }) {
  const t = useTheme();
  const styles = useStyles();
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  return (
    <>
      <View ref={trigger} collapsable={false}>
        <PressableScale
          onPress={() => trigger.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }))}
          scaleTo={0.92}
          style={[styles.round, styles.outlined, { borderColor: t.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="More actions">
          <Ionicons name="ellipsis-horizontal" size={17} color={t.colors.textMuted} />
        </PressableScale>
      </View>
      <Popover anchor={anchor} onClose={() => setAnchor(null)} width={220}>
        {actions.map((a, i) => {
          const off = disabled && a.key !== 'pdf';
          const fg = a.tone === 'danger' ? t.colors.dangerText : t.colors.text;
          return (
            <View key={a.key}>
              {i > 0 && <View style={styles.sep} />}
              <PressableScale
                onPress={() => {
                  setAnchor(null);
                  a.onPress();
                }}
                disabled={off}
                scaleTo={0.98}
                style={[styles.menuRow, off && styles.busy]}
                accessibilityRole="button"
                accessibilityLabel={a.a11y}>
                <Text variant="label" color={fg} style={styles.flex}>
                  {a.label}
                </Text>
                <Ionicons name={a.icon} size={18} color={fg} />
              </PressableScale>
            </View>
          );
        })}
      </Popover>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border,
  },
  leading: { flex: 1, minWidth: 0 },
  start: { justifyContent: 'flex-start' },
  // The main action: a solid pill with a soft glow in its own colour.
  mainWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingLeft: 14,
    paddingRight: 18,
    borderRadius: t.radius.pill,
    shadowOpacity: t.dark ? 0.35 : 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  // Rounded on the gradient itself (not by clipping the pill), so the glow isn't cut off on iOS.
  mainFill: { borderRadius: t.radius.pill },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  // Secondary actions: a clean ring in their colour on the card's surface.
  outlined: { backgroundColor: t.colors.surface, borderWidth: 1.2 },
  busy: { opacity: 0.5 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 16 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.divider, marginHorizontal: 16 },
  flex: { flex: 1 },
}));
