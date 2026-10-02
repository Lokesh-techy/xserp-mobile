/** @author Lokesh */
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

import { errorMessage, isApiError } from '@/core/api';

import type { IconName } from './button';
import { ListSkeleton } from './skeleton';
import { StateView } from './state-view';

type Props<T> = {
  query: UseQueryResult<T>;
  isEmpty?: (data: T) => boolean;
  empty?: { icon?: IconName; title: string; message?: string };
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
  /** On list screens: keeps loading/empty/error states pull-to-refresh-able. */
  wrap?: (node: ReactNode) => ReactElement;
};

/** Loading → skeleton, error → retry card, empty → friendly state, else children(data). */
export function QueryState<T>({ query, isEmpty, empty, skeleton, children, wrap = (n) => <>{n}</> }: Props<T>) {
  if (query.status === 'pending') return wrap(skeleton ?? <ListSkeleton rows={4} />);
  if (query.status === 'error') {
    const offline = isApiError(query.error) && query.error.kind === 'network';
    return wrap(
      <Centered>
        <StateView
          icon={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
          title={offline ? 'You are offline' : "Couldn't load this"}
          message={errorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      </Centered>,
    );
  }
  if (isEmpty?.(query.data)) {
    return (
      <Centered>
        <StateView
          icon={empty?.icon ?? 'checkmark-done-outline'}
          title={empty?.title ?? 'Nothing here yet'}
          message={empty?.message}
        />
      </Centered>
    );
  }
  return <>{children(query.data)}</>;
}

/** Empty and error states sit in the middle of the space they're given, not pinned to the top. */
function Centered({ children }: { children: ReactNode }) {
  return <View style={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }}>{children}</View>;
}
