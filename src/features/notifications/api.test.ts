/** @author Lokesh */
import list from '../../../__fixtures__/notifications/nm_list.json';
import * as client from '@/core/api/client';

import { countUnread, deleteNotifications, groupByDay, toNotifications } from './api';
import { notificationsSchema } from './schemas';

const rows = toNotifications(notificationsSchema.parse(list));

test('maps and counts unread', () => {
  expect(rows[0]).toMatchObject({ id: '11', read: false, message: '3 POs waiting for approval' });
  expect(countUnread(rows)).toBe(1);
});

test('groups by day with friendly labels', () => {
  const groups = groupByDay(rows, new Date(2026, 9, 2, 12));
  expect(groups.map((g) => g.title)).toEqual(['Today', 'Yesterday']);
});

test('delete sends CSV ids', async () => {
  const spy = jest.spyOn(client, 'postOk').mockResolvedValue({ response_code: 200 });
  await deleteNotifications(['11', '12']);
  expect(spy).toHaveBeenCalledWith('commons/json/del_nm/', { notification_ids: '11,12' });
});
