/** @author Lokesh */
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

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
};

/** Loading → skeleton, error → retry card, empty → friendly state, else children(data). */
export function QueryState<T>({ query, isEmpty, empty, skeleton, children }: Props<T>) {
  if (query.status === 'pending') return <>{skeleton ?? <ListSkeleton rows={4} />}</>;
  if (query.status === 'error') {
    const offline = isApiError(query.error) && query.error.kind === 'network';
    return (
      <StateView
        icon={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
        title={offline ? 'You are offline' : "Couldn't load this"}
        message={errorMessage(query.error)}
        action={{ label: 'Try again', onPress: () => void query.refetch() }}
      />
    );
  }
  if (isEmpty?.(query.data)) {
    return <StateView icon={empty?.icon ?? 'checkmark-done-outline'} title={empty?.title ?? 'Nothing here yet'} message={empty?.message} />;
  }
  return <>{children(query.data)}</>;
}
