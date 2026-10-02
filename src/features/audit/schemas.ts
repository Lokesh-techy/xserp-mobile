/** @author Lokesh */
import { z } from 'zod';

import { zId, zList, zNum, zStr } from '@/core/api';

export const grnMaterialsSchema = z.looseObject({
  materials: zList(z.looseObject({ item_id: zId, make_id: zId, name: zStr, drawing_no: zStr, received_qty: zNum, accepted_qty: zNum, quantity: zNum, rate: zNum, price: zNum, unit: zStr })),
});
