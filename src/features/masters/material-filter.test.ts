/** @author Lokesh */
import { filterItems } from '@/core/utils';
import type { MaterialName } from '@/features/master-data';

import { filterMaterials, materialSearchFields, stockCounts } from './material-filter';

const m = (itemId: string, over: Partial<MaterialName> = {}): MaterialName => ({
  itemId,
  drawingNo: `DRG-${itemId}`,
  name: `Item ${itemId}`,
  makeId: '0',
  makeName: '-NA-',
  unit: 'NOS',
  hsnCode: '',
  isStocked: true,
  isFaulty: false,
  ...over,
});

const rows = [
  m('1'),
  m('2', { isStocked: false }),
  m('3', { isFaulty: true }),
  m('4', { isStocked: false, isFaulty: true }),
];

test('filters by stock state', () => {
  const ids = (f: Parameters<typeof filterMaterials>[1]) => filterMaterials(rows, f).map((r) => r.itemId);
  expect(ids('all')).toEqual(['1', '2', '3', '4']);
  expect(ids('stocked')).toEqual(['1', '3']);
  expect(ids('nonstock')).toEqual(['2', '4']);
  expect(ids('faulty')).toEqual(['3', '4']);
});

test('counts every filter in one pass', () => {
  expect(stockCounts(rows)).toEqual({ all: 4, stocked: 2, nonstock: 2, faulty: 2 });
  expect(stockCounts([])).toEqual({ all: 0, stocked: 0, nonstock: 0, faulty: 0 });
});

test('search matches name, drawing no, make and HSN, but not the -NA- placeholder', () => {
  const list = [
    m('1', { name: 'Copper busbar', hsnCode: '7407' }),
    m('2', { name: 'Relay', makeName: 'Siemens', drawingNo: 'RL-220' }),
  ];
  const find = (q: string) => filterItems(list, q, materialSearchFields).map((r) => r.itemId);
  expect(find('copper')).toEqual(['1']);
  expect(find('7407')).toEqual(['1']);
  expect(find('siemens')).toEqual(['2']);
  expect(find('rl-220')).toEqual(['2']);
  expect(find('-NA-')).toEqual([]);
});
