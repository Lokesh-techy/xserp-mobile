/** @author Lokesh */
import { z } from 'zod';

import { zBool, zId, zList, zStr, zStrOrNull } from '@/core/api';

export const notificationsSchema = z.looseObject({
  notification_list: zList(z.looseObject({ id: zId, created_on: zStrOrNull, is_read: zBool, message: zStr })),
});
