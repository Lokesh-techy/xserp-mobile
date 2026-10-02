/** @author Lokesh */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles } from '@/core/theme';

import { CollapsingSearch } from './collapsing-search';
import { usePullToSync } from './pull-to-sync';
import { ScreenHeader, type HeaderAction } from './screen-header';

export type ScrollHost = ReturnType<typeof usePullToSync>;

type Register = (fn: () => Promise<unknown>) => void;
const RefreshContext = createContext<Register>(() => undefined);

type SearchApi = { query: string; setQuery: (q: string) => void; register: (placeholder: string | null) => void };
const SearchContext = createContext<SearchApi>({ query: '', setQuery: () => undefined, register: () => undefined });

/**
 * Turns on the screen's pinned search bar and returns what the user typed. The bar lives under the
 * header (not in the list), so it stays reachable — and slims down — however far the list scrolls.
 */
export function useScreenSearch(placeholder: string): string {
  const { query, register } = useContext(SearchContext);
  useEffect(() => {
    register(placeholder);
    return () => register(null);
  }, [placeholder, register]);
  return query;
}

type Props = {
  title: string;
  subtitle?: string;
  actions?: HeaderAction[];
  /** A compact control at the right of the bar (e.g. a filter menu). */
  headerRight?: ReactNode;
  tabs?: ReactNode;
  back?: boolean;
  children: (host: ScrollHost) => ReactElement;
};

/** Gradient header + one PullToSync shared by whichever tab is showing (the tab registers its refetch). */
export function ModuleScreen({ title, subtitle, actions, headerRight, tabs, back, children }: Props) {
  const styles = useStyles();
  const refresh = useRef<() => Promise<unknown>>(() => Promise.resolve());
  const runRefresh = useCallback(() => refresh.current(), []);
  const register = useCallback<Register>((fn) => {
    refresh.current = fn;
  }, []);
  const pull = usePullToSync(runRefresh);
  const [placeholder, setPlaceholder] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const registerSearch = useCallback((p: string | null) => {
    setPlaceholder(p);
    if (p === null) setQuery('');
  }, []);
  const search = useMemo(() => ({ query, setQuery, register: registerSearch }), [query, registerSearch]);
  return (
    <RefreshContext.Provider value={register}>
      <SearchContext.Provider value={search}>
        <View style={styles.root}>
          <ScreenHeader
            title={title}
            subtitle={subtitle}
            actions={actions}
            right={headerRight}
            tabs={tabs}
            back={back}
            pull={pull.indicator}
          />
          {placeholder !== null && (
            <CollapsingSearch value={query} onChangeText={setQuery} placeholder={placeholder} scrollY={pull.scrollY} />
          )}
          <View style={styles.body}>{children(pull)}</View>
        </View>
      </SearchContext.Provider>
    </RefreshContext.Provider>
  );
}

/** Tabs call this so the header's pull-to-refresh syncs what is on screen. */
export function useHostRefresh(_host: ScrollHost, fn: () => Promise<unknown>) {
  const register = useContext(RefreshContext);
  useEffect(() => register(fn), [register, fn]);
}

const useStyles = makeStyles((t) => ({ root: { flex: 1, backgroundColor: t.colors.bg }, body: { flex: 1 } }));

/** Wraps a non-list state (loading, empty, error) so it can still be pulled to refresh. */
export function pullable(host: ScrollHost, node: ReactNode): ReactElement {
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={{ flexGrow: 1, padding: 18 }}>
      {node}
    </Animated.ScrollView>,
  );
}
