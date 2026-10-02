/** @author Lokesh */
import type { UseQueryResult } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ApiError } from '@/core/api';
import { ThemeProvider } from '@/core/theme';

import { Badge, Button, QueryState, StatusPill, Text } from './index';

const wrap = (ui: ReactNode) => render(<ThemeProvider initialPreference="light">{ui}</ThemeProvider>);
const q = <T,>(p: Partial<UseQueryResult<T>>) => ({ refetch: jest.fn(), ...p }) as unknown as UseQueryResult<T>;

test('overline text is upper-cased in the string itself', async () => {
  await wrap(<Text variant="overline">documents</Text>);
  expect(screen.getByText('DOCUMENTS')).toBeTruthy();
});

test('Badge hides zero and caps at 99+', async () => {
  const { rerender } = await wrap(<Badge count={0} />);
  expect(screen.queryByText('0')).toBeNull();
  await rerender(
    <ThemeProvider initialPreference="light">
      <Badge count={120} />
    </ThemeProvider>,
  );
  expect(screen.getByText('99+')).toBeTruthy();
});

test('StatusPill shows its label', async () => {
  await wrap(<StatusPill label="Approved" tone="success" />);
  expect(screen.getByText('Approved')).toBeTruthy();
});

test('Button calls onPress', async () => {
  const onPress = jest.fn();
  await wrap(<Button title="Approve" onPress={onPress} />);
  await fireEvent.press(screen.getByText('Approve'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('QueryState renders error with retry, empty state, and data', async () => {
  const refetch = jest.fn();
  const { rerender } = await wrap(
    <QueryState query={q<string[]>({ status: 'error', error: new ApiError('network', 'x'), refetch })}>
      {() => <Text>data</Text>}
    </QueryState>,
  );
  expect(screen.getByText('Unable to reach the server. Check your connection.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Try again'));
  expect(refetch).toHaveBeenCalled();

  await rerender(
    <ThemeProvider initialPreference="light">
      <QueryState
        query={q<string[]>({ status: 'success', data: [] })}
        isEmpty={(d) => d.length === 0}
        empty={{ title: 'All caught up' }}>
        {() => <Text>data</Text>}
      </QueryState>
    </ThemeProvider>,
  );
  expect(screen.getByText('All caught up')).toBeTruthy();

  await rerender(
    <ThemeProvider initialPreference="light">
      <QueryState query={q<string[]>({ status: 'success', data: ['a'] })}>
        {(d) => <Text>{d.join(',')}</Text>}
      </QueryState>
    </ThemeProvider>,
  );
  expect(screen.getByText('a')).toBeTruthy();
});
