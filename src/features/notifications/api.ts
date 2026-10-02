/** @author Lokesh */
import { isSameDay, subDays } from 'date-fns';
import type { z } from 'zod';

import { post, postOk } from '@/core/api';
import { formatDate, parseServerDate } from '@/core/utils';

import { notificationsSchema } from './schemas';

export type AppNotification = { id: string; createdOn: string | null; read: boolean; message: string };

export const toNotifications = (r: z.infer<typeof notificationsSchema>): AppNotification[] =>
  r.notification_list.map((n) => ({ id: n.id, createdOn: n.created_on, read: n.is_read, message: n.message }));

export const countUnread = (list: AppNotification[]) => list.filter((n) => !n.read).length;

export function groupByDay(list: AppNotification[], now = new Date()) {
  const groups: { title: string; data: AppNotification[] }[] = [];
  for (const n of list) {
    const d = parseServerDate(n.createdOn);
    const title = !d ? 'Earlier' : isSameDay(d, now) ? 'Today' : isSameDay(d, subDays(now, 1)) ? 'Yesterday' : formatDate(d, 'd MMM yyyy');
    const last = groups[groups.length - 1];
    if (last?.title === title) last.data.push(n);
    else groups.push({ title, data: [n] });
  }
  return groups;
}

export const fetchNotifications = async () => toNotifications(await post('commons/json/nm_list/', {}, { schema: notificationsSchema }));
export const deleteNotifications = async (ids: string[]) => {
  await postOk('commons/json/del_nm/', { notification_ids: ids.join(',') });
};
export const markRead = async (id: string) => {
  await postOk('commons/json/up_nm_read/', { notification_id: id });
};
