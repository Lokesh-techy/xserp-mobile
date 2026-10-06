/** @author Lokesh */
import { isSameDay, subDays } from 'date-fns';
import type { z } from 'zod';

import { post, postOk, ERP } from '@/core/api';
import { formatDate, parseServerDate } from '@/core/utils';

import { notificationsSchema } from './schemas';

export type AppNotification = { id: string; createdOn: string | null; read: boolean; message: string };

export const toNotifications = (r: z.infer<typeof notificationsSchema>): AppNotification[] =>
  r.notification_list.map((n) => ({ id: n.id, createdOn: n.created_on, read: n.is_read, message: n.message }));

export const countUnread = (list: AppNotification[]) => list.filter((n) => !n.read).length;

/** "Today", "Yesterday" or the date — the heading a notification sits under. */
export function dayTitle(d: Date | null, now = new Date()): string {
  if (!d) return 'Earlier';
  if (isSameDay(d, now)) return 'Today';
  if (isSameDay(d, subDays(now, 1))) return 'Yesterday';
  return formatDate(d, 'd MMM yyyy');
}

/** Consecutive runs of items under the same heading (the list is already newest first). */
export function groupRuns<T>(list: T[], titleOf: (x: T) => string) {
  const groups: { title: string; data: T[] }[] = [];
  for (const x of list) {
    const title = titleOf(x);
    const last = groups[groups.length - 1];
    if (last?.title === title) last.data.push(x);
    else groups.push({ title, data: [x] });
  }
  return groups;
}

export const groupByDay = (list: AppNotification[], now = new Date()) =>
  groupRuns(list, (n) => dayTitle(parseServerDate(n.createdOn), now));

export const fetchNotifications = async () =>
  toNotifications(await post(ERP.commons.notifications, {}, { schema: notificationsSchema }));
export const deleteNotifications = async (ids: string[]) => {
  await postOk(ERP.commons.deleteNotifications, { notification_ids: ids.join(',') });
};
