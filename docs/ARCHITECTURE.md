# Architecture

## Layers

```
app/  ──►  modules/  ──►  features/<module>  ──►  ui/  ──►  core/
routes     registries     schemas·api·hooks·     design     api·auth·query·theme·
                          screens·approvals      system     permissions·utils·erp
```

- `core` has no UI dependencies beyond React/RN and owns all I/O.
- `ui` is feature-agnostic: it never imports a feature.
- A feature imports another feature only via its `index.ts` (e.g. Audit reuses the Stores receipt schema).
- `modules` composes features: the home tile registry and the approvals-inbox registry.

ESLint (`no-restricted-imports` per folder) fails the build when a layer reaches upward.

## Request flow

```
screen ─► hook (useQuery/useMutation, keys.ts) ─► api.ts function ─► core/api post()
      ◄── typed domain object ◄── zod schema parse ◄── envelope check ◄── fetch (form-encoded POST)
```

`post()` (`src/core/api/client.ts`):

1. Builds a form body. Objects are sent as JSON strings (`invoice_data`, `expense_data`).
2. Adds `token`, `user_id` and `enterprise_id` from the session, plus a double-submit CSRF token
   (field, header and cookie) and `Referer`. `credentials: 'omit'`.
3. Reads the body as text (xserp's Content-Type header is malformed) and maps HTML pages to errors
   (CSRF, session expired, inactive account).
4. Checks the envelope: success only when `response_code === 200`. Per-endpoint `emptyCodes` (e.g. 109
   on an empty ICD queue) map to an empty result. "Session Timeout" signs the user out once.
5. Validates with the endpoint's zod schema. Every schema is a `looseObject` built from coercing helpers,
   so `"1,234.50"`, `""` and `null` become safe numbers and strings.

Errors are `ApiError` with a `kind` (`network | timeout | session | server | validation | csrf | config`);
`errorMessage()` turns any error into user-facing copy, and `QueryState` renders loading, error, empty
and data states consistently.

## Session lifecycle

- **Login** — `user/json/login_api/` returns the user, permission map, ICD flags, pending counts and the
  token. Credentials go to SecureStore; the rest of the session goes to the SQLite key-value store
  (keeps SecureStore values small).
- **Refresh** — `auth/json/user_settings/` runs on entering the app and on foreground (if more than
  5 minutes old), and after every approval. It updates permissions, counts and subscription.
- **Idle sign-out** — every touch marks activity; after 30 idle minutes (checked every 30 s and on
  foreground) the app signs out and shows a notice. This exists because the server never expires the token.
- **Sign-out** — clears credentials, the query cache, the master-data cache and per-session stores.

## Keeping data fresh

| Trigger | What refetches |
| --- | --- |
| App returns to foreground / network reconnects | Every active query (TanStack `focusManager` / `onlineManager`) |
| Screen regains focus | That screen's queries (`useFocusRefetch`) |
| Every 60 s while the app is open | Approval queues, notification list |
| Pull down (PullToSync) | The tab on screen (`useHostRefresh`); on Home: session, all master lists, approval queues, notifications, with the last-synced time shown |
| After approve/reject/save | The affected queue, dashboards, searches and session counts |
| Launch / foreground, if older than 12 h | Master lists: parties, materials, ledgers, projects, taxes |

Master lists are cached per server and company, and Settings shows each list's age with "Sync now".

## Approval engine (`features/approvals/engine`)

A module describes a flow once with `defineApproval({...})`: its queue, summary, line items, extra
sections, document and actions. The engine provides:

- `QueueList`: a searchable, sortable, virtualised pending list for a module tab.
- `ApprovalPagerScreen`: swipe between documents, with a hero summary, line items (optionally tappable),
  sections, the PDF button and a sticky action bar filtered by status and permission.
- **Action lifecycle**: remarks sheet (required or optional) → server precheck (e.g. "PO already has
  receipts") → 4-second undo toast → request → success toast and haptic → item leaves the pager → caches
  and counts refresh. `createActionRunner` guarantees one request per (document, action), so double taps
  and repeated presses never double-approve.
- **Waiting for you** (Home): `modules/approval-feed.ts` merges every queue the user can approve, newest first;
  tapping a card opens `ReviewPager` over that mixed feed, so all approvals are cleared in one flow.
  Positive actions are press-and-hold (`ui/HoldButton`), so there is no extra confirmation step.

## Theming

Despack's palettes (`core/theme/palettes.ts`) exist in light and dark versions. `ThemeProvider` resolves
System, Light or Dark live, and `makeStyles((t) => …)` builds styles once per theme, so switching never
restarts the app. Gradient headers keep a light status bar in both schemes. The brand mark (`ui/brand`)
reuses the original XSERP petal paths; `npm run icons` renders every icon and the splash from them.
