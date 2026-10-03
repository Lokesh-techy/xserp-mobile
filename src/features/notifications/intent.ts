/** @author Lokesh */
import type { Href } from 'expo-router';

/** What a notification lets you do right there: open the queue it counts, or the module it's about. */
export type NotificationAction = { label: string; href: Href; kind: 'review' | 'open' };

// "5 Purchase orders are pending for approval" → the pending queue of that type.
const PENDING: { re: RegExp; type: string }[] = [
  { re: /purchase orders?|\bPOs?\b/i, type: 'po' },
  { re: /order acknowledge?ments?/i, type: 'oa' },
  { re: /\binvoices?\b/i, type: 'invoice' },
  { re: /\bGRNs?\b|goods receipts?|\breceipts?\b/i, type: 'grn' },
  { re: /\bnotes?\b/i, type: 'icd' },
  { re: /profiled prices?|supplier prices?/i, type: 'rate' },
];

// "OA No. … has been approved" → the module where that document lives.
const ABOUT: { re: RegExp; href: Href; label: string }[] = [
  { re: /^(Exp(ense)?s?\b)|Exp No/i, href: '/expenses', label: 'Open expenses' },
  { re: /^(PO|JO|Purchase|Job)\b|PO code|purchase order/i, href: '/purchase', label: 'Open purchase' },
  { re: /^(Inv|OA|Dc|Sales)\b|Invoice|OA code/i, href: '/sales', label: 'Open sales' },
  { re: /^Note\b|Note code|Receipt note/i, href: '/audit', label: 'Open audit' },
  { re: /^(Receipt|GRN|Raised indent|Issue)\b|Receipt code|Indent code/i, href: '/stores', label: 'Open stores' },
  { re: /price|material/i, href: '/masters', label: 'Open masters' },
];

/** Reads the server's message templates (erp/notifications.py and the "pending for approval" counters). */
export function notificationAction(message: string, canReview: (type: string) => boolean): NotificationAction | null {
  const pending = message.match(/^\s*(\d+)\s+(.+?)\s+(?:is|are)\s+pending for approval/i);
  if (pending) {
    const [, count, what] = pending;
    const hit = PENDING.find((p) => p.re.test(what ?? ''));
    if (hit && canReview(hit.type)) {
      return {
        kind: 'review',
        label: `Review ${count}`,
        href: { pathname: '/approvals/review', params: { types: hit.type } },
      };
    }
    return null;
  }
  const about = ABOUT.find((a) => a.re.test(message));
  return about ? { kind: 'open', label: about.label, href: about.href } : null;
}
