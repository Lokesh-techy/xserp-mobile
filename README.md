# XSERP Mobile

The XSERP Schnell ERP on your phone: approvals, dashboards and lookups for Finance, Audit, Purchase, Sales,
Stores, Masters and Expenses. It replaces the legacy **XSManager** Android app (same package id
`com.schnell.xsmanager`, so it installs as an update) and talks only to the existing XSERP JSON endpoints.

Built with Expo SDK 57 / React Native 0.86 / TypeScript. Look and feel follow Despack, with live light and
dark themes.

## Quick start

```bash
npm install
npm start            # dev server against https://dev.xserp.in (scan with Expo Go or run a dev build)
npm run android      # build + install the debug app (com.schnell.xsmanager.dev) on a device/emulator
```

Prerequisites: Node 22, and for native builds Android Studio (SDK + NDK) / Xcode.

| Command | What it does |
| --- | --- |
| `npm start` / `npm run start:qa` / `npm run start:prod` | Dev server against dev / qa / schnell.xserp.in |
| `npm run verify` | Typecheck + lint + tests (what CI runs) |
| `npm test` | Jest unit and component tests |
| `npm run icons` | Re-render app icon, adaptive icon layers and splash from the X mark |

### Environments

Environments live in one place: `app.config.ts` (`APP_ENV` = `dev` | `qa` | `prod`). Each builds a
separately installable app (`XSERP Dev`, `XSERP QA`, `XSERP`). To point a dev build at another server,
create `.env.local` with `EXPO_PUBLIC_SERVER_URL=...` (see `.env.example`).

## Architecture in one minute

```
src/app/        routes only (expo-router) — thin files that render feature screens
src/modules/    the home-tile registry and the approvals-inbox registry
src/features/   one folder per ERP module: schemas → api → keys → hooks → screens
src/ui/         design system (Despack-derived), PullToSync, brand, charts
src/core/       API client, auth/session, query client, theme, permissions, utils
```

Imports only flow downward (`app → modules → features → ui → core`); ESLint enforces it. Features talk to
each other only through their `index.ts`. See `docs/ARCHITECTURE.md` for the data flow, session lifecycle,
auto-refresh rules and the approval engine.

## Adding a module

1. **Registry** — add an entry to `src/modules/registry.ts` (title, icon, tint, permission code, route,
   `status: 'live'`). The Home tile, lock state and badge come from this entry.
2. **Feature folder** — `src/features/<name>/` with
   - `schemas.ts`: zod schemas using the coercing helpers from `@/core/api` (`zNum`, `zStr`, `zList`, …);
   - `api.ts`: typed functions that call `post(path, params, { schema })` and map to domain types;
   - `keys.ts` + `hooks.ts`: TanStack Query keys and hooks;
   - `screens/` + `components/`, and an `index.ts` exporting what other layers use.
3. **Approvals (optional)** — describe the flow with `defineApproval(...)` in `approvals.tsx` (queue,
   summary, lines, sections, document, actions) and register it with `erase(...)` in
   `src/modules/approval-registry.ts`. The engine supplies the list, swipe pager, remarks sheet, undo
   window and cache invalidation.
4. **Route** — `src/app/(app)/<name>/index.tsx` exporting the screen.
5. **Test** — record a real response into `__fixtures__/<name>/` and assert it parses and maps.

## Releasing

| Profile | Command | Output |
| --- | --- | --- |
| Internal test (dev server) | `eas build -p android --profile preview` | APK |
| QA | `eas build -p android --profile qa` | APK |
| Play Store | `eas build -p android --profile production` | AAB, signed with the XSManager keystore |

- Production signing uses the existing Play keystore through a **gitignored** `credentials.json`
  (copy `credentials.json.example`; the passwords live with the legacy project, never in this repo).
- Bump `android.versionCode` (≥ 66) and `version` in `app.config.ts` for every store release.
- JavaScript-only fixes can ship over the air: `eas update --channel production`.

## Notes

- xserp's mobile token never expires server-side, so the app signs out after 30 idle minutes
  (`EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES`).
- Not in v1: push notifications, expense bill attachments, sign-up, in-app payments. Production, HR and
  Reports show a "coming soon" tile that opens XSERP web.
