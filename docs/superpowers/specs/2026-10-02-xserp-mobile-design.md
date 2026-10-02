# XSERP Mobile — Design Spec

**Date:** 2026-10-02 · **Status:** Draft for review · **Repo:** `code/xserp-mobile`

## 1. Intent

Replace the legacy native XSManager Android app (`code/Schnell-Xserp`, Kotlin, v2.16.5) with a
React Native app for XSERP Schnell that:

- talks only to **existing** XSERP JSON endpoints (`https://dev.xserp.in/erp` for dev) — **no backend changes**;
- reaches **feature parity** with XSManager (every endpoint/feature it uses) and adds a few
  improvements built on endpoints that already exist;
- looks and feels like **Despack** (`code/despack-rn`) — same palette, typography, motion,
  components — with **live native light/dark themes**;
- presents every web-app module as a **tile** on the home screen;
- has an industry-standard, organised, strictly-typed codebase that is easy to maintain and extend.

### Decisions taken during brainstorming

| Topic | Decision |
|---|---|
| Backend | Mobile-only. Use existing endpoints as-is. Modules without an API get a "Soon" tile. |
| Firebase | Not in v1: no FCM push, no expense bill attachments. In-app notification list only. |
| Identity | **Replaces XSManager**: Android package `com.schnell.xsmanager`, existing Play keystore, `versionCode ≥ 66`. |
| Architecture | Approach A: Expo + expo-router, feature modules, TanStack Query, Zustand, zod, module registry, generic approval engine, live theming. |
| Refresh | Cached data auto-syncs (focus / foreground / reconnect / interval) + custom branded pull-to-refresh everywhere. |
| Brand | Keep the existing four-petal XSERP "X" (`xserp-schnell/site_media/images/xs-logo.svg`); enhance, don't redesign. |

### Success criteria

1. A user with XSManager installed updates to the new app from the Play Store and can sign in.
2. Every screen/flow in the XSManager inventory (Appendix A) works against dev.xserp.in.
3. Light/dark switches live (system or manual) with no restart; every screen is legible in both.
4. `pnpm typecheck && pnpm lint && pnpm test` pass; no `any`, no file > ~250 lines.
5. Adding a new module tile = one registry entry + a feature folder; documented in the README.

## 2. Backend facts the design depends on

Verified by reading `xserp-schnell` (Django 1.6 / Python 2.7):

- All JSON endpoints are **POST, `application/x-www-form-urlencoded`**. Complex payloads are a JSON
  string inside one form field (`invoice_data`, `expense_data`, …). GET params are ignored by most.
- **Envelope:** data keys at the top level beside `response_code` / `response_message` /
  `custom_message`. HTTP status is ~always 200 — success is `response_code === 200`.
  Codes seen: 200, 400 (Failure / Parameter Missing / Session Timeout), 500, 109 (Database error;
  `auditing/json/pendingGrn` returns 109 for an empty list — treat as empty).
- **Content-Type header is malformed** (`content-type=text/json`): read `res.text()` and `JSON.parse`.
- **Auth:** `POST erp/user/json/login_api/` (`user_email`, `password`, `fcm_id`) returns user,
  `permissions` map, `fy_start_day`, pending counts and a JWT `token`. Subsequent requests send
  `token`, `user_id`, `enterprise_id` as **POST fields**. The server **never checks token expiry**,
  so the app enforces its own idle timeout.
- **CSRF** is enforced on every POST: double-submit (`csrftoken` cookie == `csrfmiddlewaretoken`
  field / `X-CSRFToken` header) + `Referer` on HTTPS. Any random 32-hex value works (proven in
  `despack-rn/src/lib/api.ts`). Use `credentials: 'omit'` (iOS cookie-store bug).
- Session-only endpoints (e.g. `commons/json/get_badge_count`, many reports) **do not work** with the
  token and are out of scope. Pending counts come from `login_api` / `auth/json/user_settings/` and
  from queue lengths.
- No pagination anywhere — lists are bounded by date range/filters. Lists are virtualised client-side.
- Documents (`*_doc`) with `response_data_type=data` return base64 `data:application/pdf;base64,…`
  plus `filename`; otherwise the response is a binary file with `Content-Disposition`.

## 3. Architecture

### 3.1 Stack

| Concern | Choice |
|---|---|
| Runtime | Expo SDK 57 (CNG, `android/`/`ios/` generated), RN 0.86, React 19, React Compiler on |
| Language | TypeScript strict, `noUncheckedIndexedAccess`, path alias `@/*` → `src/*` |
| Routing | `expo-router` (typed routes), `Stack.Protected` auth guard |
| Server state | `@tanstack/react-query` v5 (+ `persistQueryClient` for master data) |
| Client state | `zustand` (session, preferences) |
| Validation | `zod` schemas per endpoint response |
| Storage | `expo-secure-store` (session), `expo-sqlite/kv-store` (prefs, query persistence, master cache) — Expo Go compatible |
| UI | Custom design system (from Despack), `expo-linear-gradient`, `react-native-svg`, `expo-blur`, `expo-image`, Ionicons |
| Motion | `react-native-reanimated` 4, `react-native-gesture-handler`, `expo-haptics` |
| Charts | `react-native-gifted-charts` behind themed wrappers in `ui/charts/` |
| Files | `expo-file-system` + `expo-sharing` (open/share PDFs) |
| Network state | `@react-native-community/netinfo` |
| Quality | ESLint (expo config + import order + no-restricted-imports for feature boundaries), Prettier, Jest + RNTL |
| Package mgr | pnpm |

### 3.2 Folder structure

```
xserp-mobile/
  app.config.ts            # dynamic config: name/package/scheme per APP_ENV
  eas.json  .env.dev  .env.qa  .env.prod  .env.example
  assets/brand/src/icon.svg  assets/brand/generate-icons.js  assets/fonts/ ...
  src/
    app/                   # routes only — thin, compose feature screens
      _layout.tsx          # fonts, providers, launch animation, auth guard
      login.tsx  forgot-password.tsx
      (app)/_layout.tsx    # authenticated stack, starts sync scheduler
      (app)/index.tsx      # Home
      (app)/finance/…  audit/…  purchase/…  sales/…  stores/…  masters/…  expenses/…
      (app)/approvals/index.tsx  approvals/[type]/[id].tsx
      (app)/notifications.tsx  profile.tsx  settings.tsx  soon/[module].tsx
    core/
      api/        client.ts  errors.ts  envelope.ts  form.ts  documents.ts
      auth/       session-store.ts  use-session.ts  idle-timeout.ts  auth-api.ts
      config/     env.ts
      query/      query-client.ts  keys.ts  sync-scheduler.ts  persistence.ts
      theme/      tokens.ts  palettes.ts  theme-provider.tsx  use-theme.ts  make-styles.ts  motion.ts
      permissions/ permissions.ts  use-can.ts
      utils/      date.ts  money.ts  format.ts
    ui/           Text Button Input Card Tile StatusPill Badge Skeleton BottomSheet
                  ScreenHeader SegmentedTabs StateView Toast SearchField Chip FilterSheet
                  PullToSync DatePickerField Picker(sheet, searchable) charts/ brand/
    features/
      auth/  home/  finance/  audit/  purchase/  sales/  stores/  masters/
      expenses/  approvals/  notifications/  settings/  master-data/
        └ each: api.ts  schemas.ts  hooks.ts  types.ts  screens/  components/  index.ts
    modules/registry.ts
  docs/
```

**Boundaries (lint-enforced):** `app/` → `features/`, `ui/`, `core/`. `features/X` → `ui/`, `core/`,
and only another feature's public `index.ts` (needed by `approvals` and `master-data`). `ui/` → `core/theme`
only. `core/` imports nothing above it. No file > ~250 lines; split subcomponents out.

### 3.3 API client (`core/api`)

`post<T>(path, params, { schema, auth = true, timeoutMs = 30_000, raw })`:

1. Builds a form body: `params` (objects → `JSON.stringify` for JSON-in-field params), CSRF token,
   and when `auth`, `token`/`user_id`/`enterprise_id` from the session store.
2. Headers: `X-CSRFToken`, `Cookie: csrftoken=…`, `Referer: <origin>/`, `Accept`; `credentials: 'omit'`;
   `AbortController` timeout.
3. Parses `res.text()` → JSON. HTML responses are mapped (403 → CSRF, "session has expired" → session,
   "inactive" → inactive account).
4. Envelope: `Session Timeout` → `ApiError{kind:'session'}` + global `onSessionExpired`;
   `response_code !== 200` → `ApiError{kind:'server', code, message: custom_message ?? response_message}`;
   per-endpoint `emptyCodes` (e.g. `[109]`) map to an empty result.
5. Validates with the zod `schema` → `ApiError{kind:'validation'}` on mismatch (logged with path in dev).

`ApiError.kind`: `network | timeout | session | server | validation | csrf`. Every feature `api.ts`
exposes typed functions only (`searchPurchaseOrders(filters): Promise<PurchaseOrder[]>`); screens never
call `post` directly. Schemas use `.passthrough()` and coerce loosely-typed fields (numbers as strings,
`""` dates) in one place (`core/api/form.ts` helpers: `zNum`, `zDate`, `zBool`).

`core/api/documents.ts`: `openDocument(request)` → calls a `*_doc` endpoint with
`response_data_type=data`, writes base64 to cache dir as `filename`, opens via `expo-sharing`. Binary
fallback uses `FileSystem.downloadAsync` with the same form body. Cached per document id; "Regenerate"
passes `document_regenerate=true`.

### 3.4 Auth & session (`core/auth`, `features/auth`)

- **Launch:** fonts + session hydrate from SecureStore while the launch animation plays →
  `commons/version_info/` check (force update dialog / once-a-day optional dialog).
- **Login:** `user/json/login_api/` (`auth:false`). Store `Session { userId, enterpriseId, token,
  user: {name, email, isSuper, enterpriseName}, permissions, fyStartDay, counts }` in SecureStore key
  `xserp.session`. Failure shakes the card + error haptic (Despack behaviour).
- **Refresh:** `auth/json/user_settings/` on login, app launch and foreground (≥5 min since last) →
  updates permissions, ICD flags (`icd_enabled`, `icd_ignore_credit_note`, `icd_auto_gen_voucher`),
  counts, subscription info (`shall_enable_expiry_timer`, `is_expired`, `expired_on`, `plan`).
- **Subscription expired:** blocking info sheet with "Request extension" (`admin/mail_request/`, `reason`).
- **Idle timeout:** `EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES` (default 30). Root `onTouchStart` marks activity;
  interval + AppState check signs out and shows a notice on login.
- **Logout:** `user/json/logout_api/` (best effort) → clear SecureStore, query cache, master cache.
- **Forgot / change password:** `auth/json/forget_password/`, `auth/json/change_password/`.
- **Deep link** `cp_token` (`?u=`) from the reset email opens a set-new-password screen (scheme +
  Android intent filter for `https://schnell.xserp.in/erp`), matching XSManager.

### 3.5 Permissions (`core/permissions`)

`permissions[CODE] = {view, edit, delete, approve, alert}` from the session. `can(code, action)` and
`useCan(code, action)`. Codes used: `ACCOUNTS, ICD, PURCHASE, SALES, STORES, MASTERS, EXPENSES`.
`ICD` additionally requires `icd_enabled`. Superusers pass everything. All action buttons
(approve/reject/create/edit) are gated; tiles without `view` render locked.

### 3.6 Data freshness & sync (`core/query`)

- Query keys from a factory (`keys.purchase.search(filters)`), one place per feature.
- Defaults: `staleTime` 30 s, `gcTime` 30 min, `retry` 2 (not for `session`/`validation` errors),
  `refetchOnWindowFocus` wired to AppState via `focusManager`, `onlineManager` wired to NetInfo, so
  data **auto-refetches on screen focus, app foreground and network reconnect**.
- Approval queues + notification count: `refetchInterval` 60 s while foregrounded.
- Mutations (approve/reject/save) invalidate the affected queue, detail, dashboard and the session
  counts (`user_settings`).
- **Master data** (`features/master-data`): parties, materials, ledgers, projects, taxes fetched from
  `masters/json/partyNames/`, `materialNames/`, `accounts/json/ledger_names/`, `masters/json/projects/`,
  `masters/json/loadTaxList/`; persisted in the kv-store with `syncedAt`. Auto-resync at launch/foreground when
  older than 12 h; per-list "Sync now" in Settings with last-synced time. Pickers search locally
  (diacritic/case-insensitive, code + name).
- Offline: cached reads render with an "Offline · showing data from <time>" banner; writes are blocked
  with a clear message (no offline queue).

### 3.7 Error handling

- Every data screen uses `<QueryState>` → skeleton (loading), `StateView` empty / error with Retry,
  and stale-data banner.
- Mutations: confirm sheet with remarks → 4 s undo toast (replaces XSManager's snackbar undo) → call
  → success toast + success haptic, or error toast with the server's `custom_message`.
- Session errors route to login with a notice; validation errors show "Unexpected server response"
  plus a "Copy details" action for bug reports.
- An app-level error boundary shows a recoverable screen instead of a crash.

## 4. UI & brand

### 4.1 Theme (`core/theme`)

- Palettes copied from `despack-rn/src/theme/index.ts` (light + dark, brand colours, gradients,
  fonts Plus Jakarta Sans 400–800, radius, space, shadows, motion) — values identical.
- Additions: module tints (Finance `#004195`, Audit `#6A5ACD`, Purchase `#E59A1A`, Sales `#1D9D74`,
  Stores `#209BE1`, Masters `#0E7C86`, Expenses `#D9534F`, Approvals `#1C75ED`, Soon tiles `textFaint`),
  chart series colours per theme, `overlay`/`onGradient` alpha tokens (no inline rgba in components).
- **Live theming:** `ThemeProvider` resolves `preference ('system'|'light'|'dark')` +
  `useColorScheme()`; preference persisted in the kv-store. Components use
  `const styles = useStyles(makeStyles)` where `makeStyles = (t: Theme) => StyleSheet.create(...)`
  (memoised per theme). Status bar style is set per screen via `ScreenHeader`. No restart on change.

### 4.2 Brand assets

- Source of truth: existing `xs-logo.svg` four-petal X (navy `#09459D`, blue `#1C75ED`). **Geometry
  kept**; enhancements: per-petal two-tone gradients (navy `#00265A→#09459D`, blue `#1C75ED→#209BE1`),
  soft sky glow at the crossing, cleaned path precision.
- App icon: white/blue X on a deep navy squircle with the Despack brand gradient
  (`#001A3D→#004195→#1579C8`). Android adaptive (foreground / background / monochrome), iOS icon,
  splash (bg `#001A3D`). Generated by `assets/brand/generate-icons.js` from `icon.svg`.
- Launch animation (`ui/brand/LaunchAnimation`): petals fly in from the four corners, meet with a glow
  pulse, wordmark "XSERP" + "BY SCHNELL ENERGY" fades up; hands off seamlessly from the native splash.
- `ui/brand/XLogo` component (SVG, animatable petals) reused by login, launch and PullToSync.

### 4.3 PullToSync (`ui/PullToSync`)

`usePullToSync(onRefresh)` → `{ indicator, scrollProps }`, used by every list and dashboard.
Pull: the four petals separate in proportion to drag distance. Past trigger (92 pt): petals snap
together + haptic. Refreshing: X rotates slowly with a shimmer sweep, minimum 900 ms. Done: green check
+ "UP TO DATE", collapse. Labels: PULL TO REFRESH → RELEASE TO SYNC → SYNCING… → UP TO DATE
(upper-cased strings, not `textTransform`). Respects reduced motion.

### 4.4 Screens & navigation

- **Login:** Despack layout — ambient brand gradient with drifting orbs, enhanced X + "XSERP", "by
  Schnell Energy", "Welcome back", white card (email, password with eye toggle, notices, Sign in),
  footer with server host dot and app version; "Forgot password?" link.
- **Home:** gradient header (date overline, greeting, first name, enterprise glass pill, bell with
  unread count, avatar → Profile), then a 2-column tile grid overlapping the header. Tile: tinted icon
  tile, title, subtitle, pending badge, arrow button; locked state (no `view`); "Soon" ribbon.
  Order: Finance, Audit, Purchase, Sales, Stores, Masters, Expenses, Approvals, Production (Soon),
  HR (Soon), Reports (Soon), Settings. Staggered enter animation.
- **Module screens:** slim gradient `ScreenHeader` (back, title, search/filter actions with count
  badge) + `SegmentedTabs`. Tabs are route segments (deep-linkable).
- **Approval pager:** horizontal pager of queue items; summary hero card (code, party, value, status
  pill, dates, project), line items, party outstanding/overdue, document button; sticky action bar
  (Approve / Review / Reject as permitted) → remarks bottom sheet → undo toast.
- **Filter sheet:** date range, status, financial year, party/supplier/customer, project, material —
  each feature declares which fields it uses.
- **Soon screen:** module illustration, "Available on XSERP web", button opening `<APP_URL>/erp/`.

## 5. Module registry (`modules/registry.ts`)

```ts
type ModuleDef = {
  id: 'finance' | 'audit' | 'purchase' | 'sales' | 'stores' | 'masters' | 'expenses'
     | 'approvals' | 'production' | 'hr' | 'reports' | 'settings';
  title: string; subtitle: string; icon: IoniconName; tint: ModuleTint;
  permission?: PermissionCode | PermissionCode[];   // any-of for view
  requires?: (s: Session) => boolean;               // e.g. icd_enabled
  badge?: (s: Session) => number;                   // from session counts
  href: Href;                                       // or soon/<id>
  status: 'live' | 'soon';
};
```

Home, permission gating, badges and the Approvals inbox read only from this registry.

## 6. Generic approval engine (`features/approvals`)

```ts
type ApprovalConfig<TItem, TDetail> = {
  type: 'po' | 'invoice' | 'oa' | 'grn' | 'icd' | 'rate' | 'expense';
  title: string; module: ModuleId; permission: PermissionCode;
  queue: () => Promise<TItem[]>;                 // pending list
  id: (item: TItem) => string;
  summary: (item: TItem) => ApprovalSummary;     // code, party, amount, date, status, project
  detail?: (item: TItem) => Promise<TDetail>;    // line items etc.
  sections?: ApprovalSection<TItem, TDetail>[];  // extra cards (overdue, supplier profile, stock)
  document?: (item: TItem) => DocumentRequest;
  actions: ApprovalAction<TItem>[];              // approve/review/reject/verify/return
};
type ApprovalAction<TItem> = {
  id: string; label: string; tone: 'primary' | 'ghost' | 'danger';
  visible: (item: TItem, ctx: Ctx) => boolean;   // status + permission
  remarks: 'none' | 'optional' | 'required';
  precheck?: (item: TItem) => Promise<void>;     // e.g. po/checkpogrn, checkoainvoice_qty
  run: (item: TItem, remarks: string, ctx: Ctx) => Promise<void>;
};
```

Each module's `features/<m>/approvals.ts` exports its config; the engine supplies the queue list,
pager, detail layout, action bar, remarks sheet, undo toast and cache invalidation. The Approvals
inbox aggregates every config the user can approve.

## 7. Feature map

All paths are relative to `<APP_URL>/erp/`, POST, with the common params. ✚ = new vs XSManager,
using an existing endpoint.

### 7.1 Finance (ACCOUNTS) — tabs: Dashboard · Ageing · Ledgers
- Dashboard: `accounts/json/dashboard_api/` (bank, cash, receivable/payable + top lists, tax liability,
  sales revenue), `accounts/json/tax_liability/` (`since`,`till`), `accounts/json/income_and_expenses/`
  (bar chart). Sync time shown.
- Ageing: `accounts/json/aging/` receivable/payable buckets → bucket ledgers
  `accounts/json/aging_ledgers/` (`is_receivable`, `option`, `is_advance`, `start_days`, `end_days`).
- Ledgers: search cached ledgers → `accounts/json/ledger_data/` (`ledger_id`,`since`,`till`) vouchers +
  `accounts/json/ledger_aging/`; ✚ bills via `accounts/json/load_ledger_bills/` (`ledger_id`,`is_receivable`).

### 7.2 Audit (ICD, requires `icd_enabled`) — tabs: Pending · Verified · Returned
- Queue `auditing/json/pendingGrn/` (109 = empty). Verified/Returned tabs list items actioned this
  session (as XSManager).
- Detail `auditing/json/grnMaterials/` (`receipt_no`,`grn_number`). Documents
  `auditing/json/downloadDoc/` (`receipt_no`,`grn_code`,`doc_type` receipt|invoice|note, `note_id`).
- Verify `auditing/json/verifyNote/` (`receipt_no`,`grn_number`,`note_id`,`project_code`,`project_id`,
  `icd_remarks`); Return `auditing/json/returnGrn/` (`grn_number`,`receipt_no`,`audit_remarks`,
  `return_status`, `note_id`; remarks required).
- Sort: name, receipt date, invoice date, invoice amount, note amount.

### 7.3 Purchase — tabs: Dashboard · Lookup · Pending
- Dashboard `purchase/json/dashboard/` (indent + PO status, `performance` bar chart).
- Lookup `purchase/json/poSearch/` (`po_no`,`supplierId`,`project_code`,`item_id`,`status`
  100/0/1/2/3, `since`,`till`,`finance_year`); FY list `purchase/json/finance_year/`. Local
  multi-select filters (pending, part supplied, supplied, rejected, on track, on time, delayed).
  ✚ "Find by PO code" via `purchase/json/po/lookup/`.
- Pending queue `purchase/json/po_draft/`. Detail `purchase/json/poDraftDetails/` (`po_id`).
  Sections: supplier profile `purchase/json/poMaterialDetail/`, overdue `purchase/json/poMaterial_overDue/`
  (only if ACCOUNTS.view), stock `stores/json/material_stock/`.
- Actions (PURCHASE.approve): Draft → Approve, Review, Reject/Discard; Reviewed/Approved → Update,
  Reject. Approve `purchase/json/po/approve/` (`po_id`,`project_code`,`project_id`,`remarks`); Review
  `purchase/json/po/review/` (`po_id`,`remarks`); Reject: precheck `purchase/json/po/checkpogrn/` then
  `purchase/json/po/reject/` (`po_id`,`remarks`).
- PDF `purchase/json/po_doc/` (`po_id`,`po_type`,`source=mobile`, `document_regenerate`).

### 7.4 Sales — tabs: Dashboard · Lookup · Pending Invoices · Pending OA
- Dashboard `sales/json/dashboard/`, `sales/json/salesDetail/` (`from_date`,`to_date`),
  `sales/json/oa_status/` (`since`,`till`), `accounts/json/aging/` (receivable) — bar charts.
- Lookup: Invoice `sales/json/invoiceSearch/` (`invoiceNo`,`customerId`,`project_code`,`item_id`,
  `status` 100/1/0/-1, `since`,`till`,`finance_year`) / OA toggle `sales/json/oa_search/` (`oa_no`,
  `supplier_id`, …). FY lists `sales/json/finance_year/`, `sales/json/oa_finance_year/`.
- Invoice queue `sales/json/draft_invoice_fetch/`; detail `sales/json/invoice_material/`
  (`invoice_id`); overdue `sales/json/invoice_material_overdue/` (`party_id`). Approve
  `sales/invoice/approve/` (`invoice_id`); Reject `sales/invoice/reject/` (`invoice_id`,`remarks`).
  PDF `sales/json/inv_doc/` (`invoice_id`,`inv_type`).
- OA queue `sales/json/draft_oa/`; detail `sales/json/oa_material/` (`oa_id`). Approve/Update
  `sales/oa/approve/` (`oa_id`,`project_code`,`project_id`); Reject: precheck
  `sales/json/oa/checkoainvoice_qty/` then `sales/oa/reject/` (`oa_id`,`remarks`). PDF
  `sales/json/oa_doc/`; attachment `commons/json/document/` (`document_uri`).
- **Create Invoice** (SALES.edit): type (GST, TRADING, Service, BoS, EXCISE), party + project pickers
  (cache + `masters/json/fetch_frequently_used_partyAndProjects/`), last used details
  `stores/json/invoiceLastUsedSupplierDetails/`, sales account (ledger cache), materials (picker →
  rate `sales/json/invoice/loadPartyRate/` + stock `stores/json/stockCheck/`), packing/transport
  charges, payment terms, taxes (tax cache), transport fields, notes. Save
  `sales/json/save_invoice_page/` (`invoice_data` JSON; `status` 0 draft / 1 with approval).
  Form state with `react-hook-form` + zod; split into step sections (Party · Items · Charges & Tax ·
  Transport · Review).

### 7.5 Stores — tabs: Stock · Indent · GRN · Stock Check
- Stock `stores/json/dashboard_data/` (stock mix pie, monthly closing bar) +
  `stores/json/list_stock_statement/` (opening/closing/issues/receipts).
- Indent `stores/json/indentStatus/` (`from_date`,`to_date`).
- GRN `stores/json/grnStatus/` (`from_date`,`to_date`) + queue `stores/json/grn_draft/` (supplier filter,
  sort). Approve `stores/json/grn/approve/` (`receipt_no`,`fy_start_day`,`icd`,`icd_auto_gen_voucher`,
  `icd_ignore_credit_note`,`remarks`); Reject `stores/json/grn/reject/` (`receipt_no`,`remarks`,
  `is_flag=true`). STORES.approve.
- Stock Check `stores/json/stockCheck/` (`item_id`,`make_id`,`is_faulty`,`exclude_drafts`,
  `from_date`,`to_date`) → opening/closing + movements.

### 7.6 Masters — tabs: Parties · Materials · Rate Approval
- Parties from cache → `masters/json/party/detail/` (`party_id`); tap to call / email / copy GSTIN.
- Materials from cache → `masters/json/material/detail/` (`item_id`,`make_id`): BOM, makes, supplier
  prices, price history line chart, taxes; stock `stores/json/material_stock/`.
- Rate approval queue `masters/json/material/supplierPrices/`; Approve
  `masters/json/material/approveRate/` (`item_id`,`effect_since`,`updated_since`,`effect_till`,
  `updated_till`,`supplier_id`,`price`,`remarks`,`make_id`,`rate_approval_id`); Reject
  `masters/json/material/rejectRate/` (same + `is_approved=false`,`reject_remarks`).

### 7.7 Expenses — tabs: Draft · Confirmed · Approved · Checked · Verified
- Counts `expenses/json/expense_group_list/`; per tab `expenses/json/expense_list/`
  (`status` 0–4, `since`,`till`).
- Editor: heads `expenses/json/head_ledgers/` (`type`), load `expenses/json/get_expense/`
  (`expense_id`), save/advance `expenses/json/save_expense/` (`expense_data` JSON: claim head,
  description, status, particulars with expense head, date, description, amount, approver/audit debit,
  bill available, remarks). Workflow Draft→Confirmed→Approved→Checked→Verified; Verify needs isSuper or
  ICD.approve. **No bill attachments in v1** (existing `document` fields are preserved untouched on save).

### 7.8 Approvals inbox ✚
Aggregates queues from 7.2–7.7 configs the user may approve; grouped with counts; opens the same pager.

### 7.9 Notifications (bell)
`commons/json/nm_list/`; swipe delete / delete all `commons/json/del_nm/` (`notification_ids` CSV);
✚ mark read on open `commons/json/up_nm_read/` (`notification_id`). Count shown on the bell.

### 7.10 Settings / Profile
Profile (name, email, enterprise + logo from `auth/enterprise_logo/`, plan/expiry), change password, appearance (System/Light/Dark, live),
master data sync status + Sync now, server host, app version + OTA update id, terms/privacy links
(`<DOMAIN>/erp/public/terms/`, `/privacy/`), logout.

### 7.11 Soon tiles
Production, HR, Reports → `soon/[module]` explainer + "Open XSERP web".

### Out of scope (v1)
FCM push; expense bill attachments (Firebase Storage); enterprise sign-up; PayU payments; any
session-only endpoint; offline writes; iPad-specific layouts.

## 8. Testing

- **Unit (Jest):** API client (form encoding, CSRF, auth params, envelope/HTML mapping, 109-as-empty,
  timeouts), session store + idle timeout, permissions, date/money formatters, zod schemas against
  recorded sample responses in `__fixtures__/`, approval engine (visibility, precheck, invalidation).
- **Component (RNTL):** Button/PressableScale (promise loading), Input, Tile states, QueryState,
  approval action bar + remarks sheet, theme switching renders both palettes.
- **CI:** GitHub Actions — `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- **Manual smoke checklist** (`docs/SMOKE.md`) per module against dev.xserp.in with a test account
  provided by the user; run on Android (primary) and iOS simulator.

## 9. Build & release

- `APP_ENV` = dev | qa | prod → `.env.*` (`EXPO_PUBLIC_APP_URL`, `EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES`).
  Hosts: dev.xserp.in, qa.xserp.in, schnell.xserp.in.
- `app.config.ts`: prod = name "XSERP", Android package **`com.schnell.xsmanager`**; dev/qa append
  `.dev`/`.qa` and "XSERP Dev/QA" so they install side by side. iOS bundle `com.schnell.xsmanager` (+suffix).
- EAS profiles: development (dev client), preview (APK), qa, production (AAB). Production signing uses
  the existing Play keystore (`Schnell-Xserp/xserp/docs/schnell-xsmanager-keystore.jks`) via a
  gitignored `credentials.json`; `versionCode` starts at **66**, versionName **3.0.0**.
- EAS Update channels per profile for OTA JS updates.
- README: setup, envs, scripts, architecture, "add a module" guide, release steps. No secrets in git.
- Expo Go works for day-to-day development: only Expo SDK modules are used (no custom native code).

## Appendix A — XSManager parity checklist

Login · forgot/change password · version check · user_settings refresh · subscription dialog +
extension request · logout · master sync (ledger, material, party, project, tax) · notifications
list/delete · Finance dashboard/ageing/bucket ledgers/ledger detail · Audit pending/verify/return/docs ·
Purchase dashboard/lookup/pending/approve/review/reject/PDF/material dialog · Sales dashboard/lookup
(invoice+OA)/pending invoice+OA/approve/reject/PDF/OA attachment/create invoice/add material ·
Stores stock/indent/GRN status/GRN approve+reject/stock check · Masters party detail/material
detail/rate approval · Expenses 5 tabs/editor/workflow · enterprise name + logo · terms/privacy.
Excluded per decisions: FCM push, Firebase attachments, sign-up, PayU.
