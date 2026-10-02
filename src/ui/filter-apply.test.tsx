/** @author Lokesh */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/core/theme';

import { FilterSheet, type FilterField } from './filter-sheet';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const fields: FilterField[] = [{ kind: 'select', key: 'status', label: 'Status', options: [{ value: '100', label: 'All' }, { value: '2', label: 'Approved' }] }];

test('Apply hands the edited filters back and closes the sheet', async () => {
  const onApply = jest.fn();
  const onClose = jest.fn();
  await render(
    <ThemeProvider initialPreference="light">
      <FilterSheet visible fields={fields} value={{ status: '100' }} defaults={{ status: '100' }} onApply={onApply} onClose={onClose} />
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByText('Approved'));
  await fireEvent.press(screen.getByText('Apply'));
  expect(onApply).toHaveBeenCalledWith({ status: '2' });
  expect(onClose).toHaveBeenCalled();
});
