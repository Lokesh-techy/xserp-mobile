/** @author Lokesh */
import { notificationAction } from './intent';

const all = () => true;

test('pending counters open the matching review queue', () => {
  expect(notificationAction('5 Purchase orders are pending for approval', all)).toEqual({
    kind: 'review',
    label: 'Review 5',
    href: { pathname: '/approvals/review', params: { types: 'po' } },
  });
  expect(notificationAction('1 Order acknowledgement is pending for approval', all)?.href).toMatchObject({
    params: { types: 'oa' },
  });
  expect(notificationAction('3 Invoices are pending for approval', all)?.href).toMatchObject({
    params: { types: 'invoice' },
  });
  expect(notificationAction('2 Notes are pending for approval', all)?.href).toMatchObject({ params: { types: 'icd' } });
  expect(notificationAction('4 profiled prices are pending for approval', all)?.href).toMatchObject({
    params: { types: 'rate' },
  });
});

test('no Review button for queues the user cannot approve, or that the app has no queue for', () => {
  expect(notificationAction('5 Purchase orders are pending for approval', () => false)).toBeNull();
  expect(notificationAction('2 Vouchers are pending for approval', all)).toBeNull();
});

test('document events open their module', () => {
  expect(notificationAction('OA No. 25-26/OA/0012 to Acme for 1,20,000 has been approved', all)?.href).toBe('/sales');
  expect(notificationAction('PO No. 25-26/PO/0090 to Steel Co for 40,000 has been rejected', all)?.href).toBe(
    '/purchase',
  );
  expect(notificationAction('Receipt No. GRN/0042 to Acme for 9,000 has been approved', all)?.href).toBe('/stores');
  expect(notificationAction('Expense 1200 by Ravi for amount 1200.00 with Exp No: EXP/7', all)?.href).toBe('/expenses');
  expect(notificationAction('Receipt note RN/3 by Ravi with code N/9', all)?.href).toBe('/audit');
  expect(notificationAction('Financial statements for the period … has been finalised', all)).toBeNull();
});
