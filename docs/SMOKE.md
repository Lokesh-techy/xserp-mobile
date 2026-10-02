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
- [ ] After login (Android and iOS) Home is the first screen; Back/Close on Profile returns to Home.
- [ ] The header shows only the date, greeting, name and "Synced … ago"; no enterprise name.
- [ ] "Waiting for you" shows the newest pending documents from every module; "Review all" and tapping a card open the focus review; with nothing pending it reads "All clear".
- [ ] Module tiles (7) overlap the header; tiles without permission show a lock; no coming-soon tiles.
- [ ] Pulling down syncs everything (X animation), then the sync line updates.
- [ ] Scrolling down fades the big header into a compact bar with the name, bell and avatar.

## Approvals (each: Purchase PO, Sales Invoice, Sales OA, Stores GRN, Audit ICD, Masters Rate)
- [ ] The pending list loads; search and sort work; an empty queue shows "All caught up".
- [ ] Opening an item shows the pager "1 of N"; swiping changes documents; line items and sections load.
- [ ] Approve is press-and-hold (releasing early cancels), then the undo toast; Undo cancels; letting it run sends one request, shows a success toast, removes the item and lowers the badge.
- [ ] Reject without remarks is blocked; a server precheck failure (PO with receipts, OA with invoices) shows the server message.
- [ ] View PDF opens the system viewer/share sheet; long-press offers Regenerate.
- [ ] The Home focus review moves across modules (PO → Invoice → GRN …) in one flow.

## Modules
- [ ] **Finance**: dashboard stats and chart for the selected range; Ageing buckets drill into ledgers → ledger vouchers and open bills.
- [ ] **Purchase**: dashboard; PO Lookup filters (date, status, FY, supplier, project, material) with a badge count; tapping a material shows supplier prices, stock and outstanding.
- [ ] **Sales**: dashboard charts; Invoice/OA lookup toggle; Create invoice (Party → Items → Charges → Transport → Review) saves a draft in dev, and leaving mid-way asks before discarding.
- [ ] **Stores**: stock statement and charts; indent counts; GRN status and approvals; Stock check for a material, with the Faulty / Exclude drafts toggles.
- [ ] **Audit**: pending notes with GRN / invoice / note documents; Verify and Return move items into the session's Verified / Returned tabs.
- [ ] **Masters**: party detail (call, email, copy GSTIN); material detail (prices, stock, price history, BOM, taxes); rate approvals.
- [ ] **Expenses**: tabs with counts; create a draft, add lines, Save draft, Confirm; an approver sees Hold to approve; an auditor sees Check / Verify.

## Profile & notifications
- [ ] System / Light / Dark switch the whole app instantly (no restart).
- [ ] Notifications: grouped by day; tapping marks one read; swipe deletes; Delete all asks first.
- [ ] Change password signs you out with a notice; Sign out returns to login.

## Offline
- [ ] With airplane mode on, cached lists still show; actions show "Unable to reach the server" and nothing crashes.
