# Manual smoke checklist

Run against **dev.xserp.in** on an Android phone, once in **light** and once in **dark** mode
(Settings → Appearance, or the phone's system setting). Tick each item and note anything odd.

## App shell
- [ ] Cold start: the native splash (X on navy) hands off to the launch animation; the petals breathe, glow and "XSERP" fades in.
- [ ] Wrong password: the card shakes and "Incorrect Username/Password" appears.
- [ ] Correct login lands on Home; killing and reopening the app keeps you signed in.
- [ ] Leaving the app idle for more than 30 minutes signs you out, with a notice on the login screen.
- [ ] Forgot password sends the email; the emailed link opens "New password" in the app.
- [ ] An older app version shows "Update available" (or a blocking "Update required").

## Home
- [ ] 12 tiles in two columns overlap the gradient header; tiles without permission show a lock.
- [ ] Production, HR and Reports show "SOON" and open XSERP web.
- [ ] Badges match the pending counts; pulling down shows the X petals, "RELEASE TO SYNC", a spinning X, then "UP TO DATE".
- [ ] The bell badge shows unread notifications; the avatar opens Profile.

## Approvals (each: Purchase PO, Sales Invoice, Sales OA, Stores GRN, Audit ICD, Masters Rate)
- [ ] The pending list loads; search and sort work; an empty queue shows "All caught up".
- [ ] Opening an item shows the pager "1 of N"; swiping changes documents; line items and sections load.
- [ ] Approve opens the remarks sheet, then the undo toast; Undo cancels; letting it run sends one request, shows a success toast, removes the item and lowers the badge.
- [ ] Reject without remarks is blocked; a server precheck failure (PO with receipts, OA with invoices) shows the server message.
- [ ] View PDF opens the system viewer/share sheet; long-press offers Regenerate.
- [ ] Approvals inbox lists every queue you can approve, plus Expense claims.

## Modules
- [ ] **Finance**: dashboard stats and chart for the selected range; Ageing buckets drill into ledgers → ledger vouchers and open bills.
- [ ] **Purchase**: dashboard; PO Lookup filters (date, status, FY, supplier, project, material) with a badge count; tapping a material shows supplier prices, stock and outstanding.
- [ ] **Sales**: dashboard charts; Invoice/OA lookup toggle; Create invoice (Party → Items → Charges → Transport → Review) saves a draft in dev, and leaving mid-way asks before discarding.
- [ ] **Stores**: stock statement and charts; indent counts; GRN status and approvals; Stock check for a material, with the Faulty / Exclude drafts toggles.
- [ ] **Audit**: pending notes with GRN / invoice / note documents; Verify and Return move items into the session's Verified / Returned tabs.
- [ ] **Masters**: party detail (call, email, copy GSTIN); material detail (prices, stock, price history, BOM, taxes); rate approvals.
- [ ] **Expenses**: tabs with counts; create a draft, add lines, Save draft, Confirm; an approver sees Approve / Return; an auditor sees Check / Verify.

## Settings & notifications
- [ ] System / Light / Dark switch the whole app instantly (no restart).
- [ ] Offline data shows each master list's count and age; Sync now refreshes them.
- [ ] Notifications: grouped by day; tapping marks one read; swipe deletes; Delete all asks first.
- [ ] Change password signs you out with a notice; Sign out returns to login.

## Offline
- [ ] With airplane mode on, cached lists still show; actions show "Unable to reach the server" and nothing crashes.
