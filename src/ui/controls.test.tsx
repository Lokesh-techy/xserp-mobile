/** @author Lokesh */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ThemeProvider } from '@/core/theme';

import { HeaderRight } from './header-slot';
import { MenuButton } from './menu-button';
import { ModuleScreen, useScreenSearch } from './module-screen';
import { PickerSheet } from './picker-sheet';
import { SegmentedControl } from './segmented-control';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }));

const wrap = (ui: React.ReactNode) => render(<ThemeProvider initialPreference="light">{ui}</ThemeProvider>);

test('segmented control selects an option', async () => {
  const onChange = jest.fn();
  await wrap(
    <SegmentedControl
      options={[
        { key: 'inv', label: 'Invoices' },
        { key: 'oa', label: 'Order acks' },
      ]}
      value="inv"
      onChange={onChange}
    />,
  );
  await fireEvent.press(screen.getByText('Order acks'));
  expect(onChange).toHaveBeenCalledWith('oa');
});

test('menu button shows the current choice and picks from a popover anchored to it', async () => {
  const onChange = jest.fn();
  await wrap(
    <MenuButton
      title="Date"
      options={[
        { key: '7d', label: 'Last 7 days' },
        { key: '30d', label: 'Last 30 days' },
      ]}
      value="30d"
      onChange={onChange}
    />,
  );
  expect(screen.getByText('Last 30 days')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Date: Last 30 days'));
  await fireEvent.press(screen.getByText('Last 7 days'));
  expect(onChange).toHaveBeenCalledWith('7d');
});

test('multi-select menu summarises the selection', async () => {
  await wrap(
    <MenuButton
      title="Types"
      multiple
      allLabel="All types"
      options={[
        { key: 'po', label: 'PO' },
        { key: 'grn', label: 'GRN' },
        { key: 'oa', label: 'OA' },
      ]}
      values={['po', 'grn']}
      onChangeMany={jest.fn()}
    />,
  );
  expect(screen.getByText('PO, GRN')).toBeTruthy();
});

test('multi-select menu applies each tick immediately', async () => {
  const onChangeMany = jest.fn();
  await wrap(
    <MenuButton
      title="Types"
      multiple
      allLabel="All types"
      options={[
        { key: 'po', label: 'PO' },
        { key: 'grn', label: 'GRN' },
        { key: 'oa', label: 'OA' },
      ]}
      values={[]}
      onChangeMany={onChangeMany}
    />,
  );
  await fireEvent.press(screen.getByLabelText('Types: All types'));
  await fireEvent.press(screen.getByText('GRN'));
  expect(onChangeMany).toHaveBeenLastCalledWith(['grn']);
});

function SearchingTab() {
  const query = useScreenSearch('Search orders');
  return <Text>{`query:${query}`}</Text>;
}

test('a tab registers the screen search and receives what is typed', async () => {
  await wrap(<ModuleScreen title="Purchase">{() => <SearchingTab />}</ModuleScreen>);
  await fireEvent.changeText(screen.getByPlaceholderText('Search orders'), 'acme');
  expect(screen.getByText('query:acme')).toBeTruthy();
});

function TabWithControl() {
  return (
    <HeaderRight>
      <MenuButton title="Sort" options={[{ key: 'd', label: 'Default order', short: 'Sort' }]} value="d" onChange={jest.fn()} />
    </HeaderRight>
  );
}

test('a tab can place its single control in the screen header (compact label)', async () => {
  await wrap(<ModuleScreen title="Audit" tabs={<Text>tabs</Text>}>{() => <TabWithControl />}</ModuleScreen>);
  expect(screen.getByLabelText('Sort: Sort')).toBeTruthy();
});

test('dropdown rows keep the unit in its own column, out of the detail line', async () => {
  await wrap(
    <PickerSheet visible title="Material" items={[{ id: '1', label: 'Copper cable 4 sq mm', sublabel: 'DRG-12 · Polycab', trailing: 'mtr' }]} onSelect={jest.fn()} onClose={jest.fn()} />,
  );
  expect(screen.getByText('DRG-12 · Polycab')).toBeTruthy();
  expect(screen.getByText('MTR')).toBeTruthy();
  expect(screen.getByPlaceholderText('Search material')).toBeTruthy();
});
