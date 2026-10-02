/** @author Lokesh */
import { defineApproval, visibleActions } from './types';

type Item = { id: string; status: number };

const config = defineApproval<Item>({
  type: 'po',
  title: 'Purchase orders',
  noun: 'PO',
  permission: 'PURCHASE',
  tint: 'purchase',
  queueKey: ['q'],
  queue: async () => [],
  id: (i) => i.id,
  summary: (i) => ({ code: i.id, party: '', status: { label: String(i.status), tone: 'info' } }),
  actions: [
    {
      id: 'approve',
      label: 'Approve',
      icon: 'checkmark',
      tone: 'success',
      remarks: 'optional',
      visible: (i) => i.status === 0,
      run: async () => {},
      done: 'Approved',
    },
    {
      id: 'reject',
      label: 'Reject',
      icon: 'close',
      tone: 'danger',
      remarks: 'required',
      visible: () => true,
      run: async () => {},
      done: 'Rejected',
    },
  ],
});

test('visibleActions filters by item state', () => {
  const ctx = { session: {} as never };
  expect(visibleActions(config, { id: '1', status: 0 }, ctx).map((a) => a.id)).toEqual(['approve', 'reject']);
  expect(visibleActions(config, { id: '1', status: 2 }, ctx).map((a) => a.id)).toEqual(['reject']);
});
