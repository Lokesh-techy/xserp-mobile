/** @author Lokesh */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { makeStyles } from '@/core/theme';

import { CollapsingSearch } from './collapsing-search';
import { useDeferredMount } from './deferred-mount';
import { createHeaderSlot, HeaderSlotContext } from './header-slot';
import { usePullToSync } from './pull-to-sync';
import { ScreenHeader, type HeaderAction } from './screen-header';
import { ListSkeleton } from './skeleton';

export type ScrollHost = ReturnType<typeof usePullToSync>;

type Register = (fn: () => Promise<unknown>, status: string | null) => void;
const RefreshContext = createContext<Register>(() => undefined);

/** The pull caption a tab asked for while its refresh runs (e.g. "Computing ageing…"); null = the generic phrases. */
function createPullStatus() {
  let value: string | null = null;
  const subs = new Set<() => void>();
  const subscribe = (fn: () => void) => {
    subs.add(fn);
    return () => void subs.delete(fn);
  };
  const get = () => value;
  function usePullStatus() {
    return useSyncExternalStore(subscribe, get, get);
  }
  return {
    set: (next: string | null) => {
      value = next;
      subs.forEach((fn) => fn());
    },
    usePullStatus,
  };
}

type SearchApi = { query: string; setQuery: (q: string) => void; register: (placeholder: string | null) => void };
const SearchContext = createContext<SearchApi>({ query: '', setQuery: () => undefined, register: () => undefined });

/**
 * Turns on the screen's pinned search bar and returns what the user typed. The bar lives under the
 * header (not in the list), so it stays reachable — and slims down — however far the list scrolls.
 */
export function useScreenSearch(placeholder: string | null): string {
  const { query, register } = useContext(SearchContext);
  useEffect(() => {
    if (placeholder === null) return;
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
  const [pullStatus] = useState(createPullStatus);
  const register = useCallback<Register>(
    (fn, status) => {
      refresh.current = fn;
      pullStatus.set(status);
    },
    [pullStatus],
  );
  const pull = usePullToSync(runRefresh, true, pullStatus.usePullStatus);
  const [placeholder, setPlaceholder] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const registerSearch = useCallback((p: string | null) => {
    setPlaceholder(p);
    if (p === null) setQuery('');
  }, []);
  const search = useMemo(() => ({ query, setQuery, register: registerSearch }), [query, registerSearch]);
  const [slot] = useState(createHeaderSlot);
  // Shell first: the header and a skeleton paint on the first frame, so opening any page feels instant;
  // the page's content (lists, charts) mounts a frame later instead of holding up the transition.
  const ready = useDeferredMount();
  return (
    <RefreshContext.Provider value={register}>
      <SearchContext.Provider value={search}>
        <HeaderSlotContext.Provider value={slot}>
          <View style={styles.root}>
            <ScreenHeader
              title={title}
              subtitle={subtitle}
              actions={actions}
              right={headerRight}
              slot={slot}
              tabs={tabs}
              back={back}
              pull={pull.indicator}
            />
            {placeholder !== null && (
              <CollapsingSearch
                value={query}
                onChangeText={setQuery}
                placeholder={placeholder}
                scrollY={pull.scrollY}
              />
            )}
            <View style={styles.body}>
              {ready ? (
                children(pull)
              ) : (
                <View style={styles.shell}>
                  <ListSkeleton rows={5} />
                </View>
              )}
            </View>
          </View>
        </HeaderSlotContext.Provider>
      </SearchContext.Provider>
    </RefreshContext.Provider>
  );
}

/**
 * Tabs call this so the header's pull-to-refresh syncs what is on screen. `status`: what the pull caption says
 * while it runs, when the refresh does something more specific than fetching.
 */
export function useHostRefresh(host: ScrollHost, fn: () => Promise<unknown>, status: string | null = null) {
  const register = useContext(RefreshContext);
  useEffect(() => register(fn, status), [register, fn, status]);
  // The scroll offset is shared by every tab and only updates on scroll events. A tab that mounts (or one
  // that leaves) must reset it, or a short tab that never scrolls inherits the last tab's offset and the
  // pull, which only arms at the top, never arms again.
  const scrollY = host.scrollY;
  useEffect(() => {
    scrollY.set(0);
    return () => scrollY.set(0);
  }, [scrollY]);
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  body: { flex: 1 },
  shell: { padding: t.space.gutter },
}));

/** Wraps a non-list state (loading, empty, error) so it can still be pulled to refresh. */
export function pullable(host: ScrollHost, node: ReactNode): ReactElement {
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={{ flexGrow: 1, padding: 18 }}>
      {node}
    </Animated.ScrollView>,
  );
}
