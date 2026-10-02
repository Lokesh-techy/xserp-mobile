/** @author Lokesh */
import { createContext, useCallback, useContext, useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/core/theme';

import { usePullToSync } from './pull-to-sync';
import { ScreenHeader, type HeaderAction } from './screen-header';

export type ScrollHost = ReturnType<typeof usePullToSync>;

type Register = (fn: () => Promise<unknown>) => void;
const RefreshContext = createContext<Register>(() => undefined);

type Props = { title: string; subtitle?: string; actions?: HeaderAction[]; tabs?: ReactNode; back?: boolean; children: (host: ScrollHost) => ReactElement };

/** Gradient header + one PullToSync shared by whichever tab is showing (the tab registers its refetch). */
export function ModuleScreen({ title, subtitle, actions, tabs, back, children }: Props) {
  const styles = useStyles();
  const refresh = useRef<() => Promise<unknown>>(() => Promise.resolve());
  const runRefresh = useCallback(() => refresh.current(), []);
  const register = useCallback<Register>((fn) => {
    refresh.current = fn;
  }, []);
  const pull = usePullToSync(runRefresh);
  return (
    <RefreshContext.Provider value={register}>
      <View style={styles.root}>
        <ScreenHeader title={title} subtitle={subtitle} actions={actions} tabs={tabs} back={back} pull={pull.indicator} />
        <View style={styles.body}>{children(pull)}</View>
      </View>
    </RefreshContext.Provider>
  );
}

/** Tabs call this so the header's pull-to-refresh syncs what is on screen. */
export function useHostRefresh(_host: ScrollHost, fn: () => Promise<unknown>) {
  const register = useContext(RefreshContext);
  useEffect(() => register(fn), [register, fn]);
}

const useStyles = makeStyles((t) => ({ root: { flex: 1, backgroundColor: t.colors.bg }, body: { flex: 1 } }));
