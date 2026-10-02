# XSERP Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `code/xserp-mobile`, an Expo/React Native replacement for the XSManager Android app that uses only existing XSERP JSON endpoints, looks like Despack with live light/dark themes, and shows every ERP module as a home tile.

**Architecture:** Layered `src/` — `core/` (API client, auth/session, query, theme, permissions, utils) → `ui/` (design system, brand, PullToSync) → `features/<module>/` (api + zod schemas, hooks, screens) → `modules/` (tile registry, approval-inbox registry) → `app/` (thin expo-router routes). Server state via TanStack Query with auto-refetch; a generic approval engine renders every approve/reject flow from per-module configs.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19, TypeScript strict, expo-router, @tanstack/react-query 5, zustand 5, zod 4, react-native-reanimated 4, react-native-gesture-handler, react-native-svg, expo-linear-gradient, react-native-gifted-charts, date-fns, react-hook-form, Jest (jest-expo) + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-10-02-xserp-mobile-design.md` (read it before starting any task).

## Global Constraints

- Project root: `/home/lokesh/code/xserp-mobile`. Package manager: **npm** (pnpm is not installed on this machine; spec said pnpm — npm is the approved substitute).
- Expo SDK `~57.0.25`, `react-native 0.86.3`, `react 19.2.3`, `react-native-reanimated 4.5.1`, `react-native-worklets 0.10.1` — same versions as `code/despack-rn/package.json`. Add any Expo-managed module with `npx expo install <pkg>` so it resolves to the SDK 57 version.
- TypeScript `strict` + `noUncheckedIndexedAccess`. **No `any`** (ESLint `@typescript-eslint/no-explicit-any: error`). Path alias `@/*` → `src/*`.
- No source file over ~250 lines; extract subcomponents.
- Every file starts with `/** @author Lokesh */` (house style from despack-rn).
- Layer rules (ESLint-enforced, Task 1): `core` imports nothing from `ui|features|modules|app`; `ui` imports only `core`; `features/X` imports `core`, `ui`, `@/features/approvals` (engine) and other features **only via `@/features/<name>`** (their `index.ts`); `modules` may import features; `app` imports anything. Within a feature use relative imports.
- All requests: `POST`, form-encoded, to `${serverUrl}/erp/<path>`; success iff `response_code === 200`; parse `res.text()` with `JSON.parse` (server's Content-Type is malformed).
- Auth fields `token`, `user_id`, `enterprise_id` are POST fields added by the client; CSRF double-submit token + `Referer`; `credentials: 'omit'`.
- Environments (single source: `app.config.ts`): dev → `https://dev.xserp.in`, qa → `https://qa.xserp.in`, prod → `https://schnell.xserp.in`. `EXPO_PUBLIC_SERVER_URL` in `.env.local` may override for local testing. (Refinement of spec §9: env values live in `app.config.ts` `extra` keyed by `APP_ENV`, avoiding three `.env` files that Expo CLI would not load by name.)
- Idle timeout default **30 minutes** (`EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES` override).
- Android prod package **`com.schnell.xsmanager`**, `versionCode` **66**, `version` **3.0.0**; dev/qa suffix `.dev`/`.qa`.
- Despack palette values are copied **verbatim** (spec §4.1); brand "X" petal geometry from `xserp-schnell/site_media/images/xs-logo.svg` is **not altered**.
- Out of scope: FCM push, expense bill attachments, sign-up, PayU, session-only endpoints, offline writes.
- Dates sent to the server as `yyyy-MM-dd`. Money shown with `en-IN` grouping.
- Commit after every task with Conventional Commit messages ending in:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. **Loosely-typed server values** — numbers arrive as strings (`"1,234.50"`), `""`, or `null`; ids as numbers or strings. Expect: screens never crash or show `NaN`; values coerce to `0`/`''`. Pinned by `core/api/schema.test.ts` (Task 3) and each feature's fixture test.
2. **Empty queues** — `auditing/json/pendingGrn/` returns `response_code 109` and other lists return `[]`/missing keys when nothing is pending. Expect: an "All caught up" empty state, not an error. Pinned by `client.test.ts` (emptyCodes, Task 3) and `audit/api.test.ts` (Task 19).
3. **Session dies mid-action** — the user approves after the server dropped the token (or the idle limit passed while the sheet was open). Expect: one sign-out with a notice on the login screen, no duplicate request, no crash. Pinned by `client.test.ts` (session handler called once) and `session-store.test.ts` (Task 4).
4. **Double submit** — rapid double-tap on Approve, or Approve tapped while the undo toast is still pending. Expect: exactly one approve request. Pinned by `features/approvals/engine/use-approval-action.test.ts` (Task 14).
5. **Large unpaginated lists** — invoice/PO search over a financial year can return 2 000+ rows. Expect: virtualised `FlatList`, default date range of 30 days, and local search stays responsive. Pinned by `core/utils/search.test.ts` (Task 12) and default-range test in `core/utils/date.test.ts` (Task 3).

---

## File Structure (locked in)

```
xserp-mobile/
  app.config.ts  eas.json  package.json  tsconfig.json  eslint.config.js  .prettierrc
  jest.config.js  jest.setup.ts  babel.config.js  .gitignore  .env.example  README.md
  assets/brand/xmark.js            # petal paths shared by script (CommonJS)
  assets/brand/generate-icons.js   # renders assets/images/* from SVG
  assets/images/                   # generated icons + splash
  docs/SMOKE.md  docs/ARCHITECTURE.md
  .github/workflows/ci.yml
  src/
    app/ _layout.tsx login.tsx forgot-password.tsx reset-password.tsx
         (app)/_layout.tsx (app)/index.tsx (app)/profile.tsx (app)/settings.tsx
         (app)/notifications.tsx (app)/soon/[module].tsx
         (app)/approvals/index.tsx (app)/approvals/[type].tsx
         (app)/finance/index.tsx (app)/finance/ledger/[id].tsx (app)/finance/aging/[bucket].tsx
         (app)/audit/index.tsx (app)/purchase/index.tsx (app)/sales/index.tsx
         (app)/sales/invoice/new.tsx (app)/stores/index.tsx (app)/masters/index.tsx
         (app)/masters/party/[id].tsx (app)/masters/material/[id].tsx
         (app)/expenses/index.tsx (app)/expenses/[id].tsx
    core/
      config/env.ts
      storage/kv.ts  storage/secure.ts
      api/errors.ts api/form.ts api/schema.ts api/envelope.ts api/client.ts api/documents.ts api/index.ts
      auth/types.ts auth/session-mapper.ts auth/session-store.ts auth/idle-timeout.ts
           auth/auth-api.ts auth/use-idle-sign-out.ts auth/bootstrap.ts auth/index.ts
      permissions/permissions.ts permissions/index.ts
      query/query-client.ts query/managers.ts query/use-focus-refetch.ts query/index.ts
      theme/palettes.ts theme/tokens.ts theme/theme.ts theme/theme-provider.tsx
            theme/make-styles.ts theme/motion.ts theme/index.ts
      utils/date.ts utils/money.ts utils/search.ts utils/feedback.ts utils/index.ts
    ui/
      text.tsx pressable-scale.tsx button.tsx input.tsx card.tsx status-pill.tsx badge.tsx
      skeleton.tsx state-view.tsx query-state.tsx toast.tsx screen-header.tsx
      segmented-tabs.tsx bottom-sheet.tsx search-field.tsx chip.tsx picker-sheet.tsx
      date-field.tsx filter-sheet.tsx key-value.tsx stat-card.tsx section.tsx glass.tsx
      charts/bar-chart-card.tsx charts/pie-chart-card.tsx charts/line-chart-card.tsx charts/index.ts
      brand/xmark-paths.ts brand/xmark.tsx brand/ambient-background.tsx brand/launch-animation.tsx
      pull-to-sync/pull-to-sync.tsx pull-to-sync/phases.ts
      index.ts
    features/
      auth/        screens/login-screen.tsx screens/forgot-password-screen.tsx
                   screens/reset-password-screen.tsx components/version-gate.tsx
                   components/subscription-sheet.tsx index.ts
      home/        screens/home-screen.tsx components/module-tile.tsx components/home-header.tsx index.ts
      master-data/ api.ts schemas.ts store.ts use-master-sync.ts index.ts
      approvals/   engine/types.ts engine/pager-store.ts engine/use-approval-action.ts
                   engine/approval-pager-screen.tsx engine/approval-page.tsx
                   engine/action-bar.tsx engine/remarks-sheet.tsx engine/queue-list.tsx
                   engine/index.ts index.ts
      finance/ purchase/ sales/ stores/ audit/ masters/ expenses/ notifications/ settings/
        each: api.ts schemas.ts keys.ts hooks.ts screens/*.tsx components/*.tsx index.ts
              (+ approvals.tsx where the module has approvals)
    modules/ registry.ts approval-registry.ts
  __fixtures__/  <endpoint>.json   (sample responses for schema tests)
```

Every `index.ts` is the feature's public API: it re-exports screens used by `app/` routes and anything another layer needs (approval configs, hooks).

---
### Task 1: Project scaffold, tooling and quality gates

**Files:**
- Create: `package.json`, `app.config.ts`, `tsconfig.json`, `babel.config.js`, `eslint.config.js`, `.prettierrc`, `jest.config.js`, `jest.setup.ts`, `.gitignore`, `.env.example`, `eas.json`, `expo-env.d.ts`, `src/app/_layout.tsx` (temporary), `src/app/index.tsx` (temporary), `src/core/smoke.test.ts`

**Interfaces:**
- Produces: npm scripts `start`, `android`, `ios`, `lint`, `typecheck`, `test`, `verify`, `icons`; `Constants.expoConfig.extra` = `{ appEnv: 'dev'|'qa'|'prod', serverUrl: string, idleTimeoutMinutes: number, eas: { projectId?: string } }`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "xserp-mobile",
  "main": "expo-router/entry",
  "version": "3.0.0",
  "private": true,
  "scripts": {
    "start": "expo start",
    "start:qa": "APP_ENV=qa expo start -c",
    "start:prod": "APP_ENV=prod expo start -c",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "icons": "node assets/brand/generate-icons.js",
    "verify": "npm run typecheck && npm run lint && npm test -- --ci"
  },
  "jest": { "preset": "jest-expo" }
}
```

(The `jest` key is replaced by `jest.config.js` in Step 6; leave it out if `jest.config.js` exists.)

- [ ] **Step 2: Install dependencies**

```bash
cd /home/lokesh/code/xserp-mobile
npm install expo@~57.0.25 react@19.2.3 react-dom@19.2.3 react-native@0.86.3
npx expo install expo-router expo-font @expo-google-fonts/plus-jakarta-sans @expo/vector-icons \
  expo-linear-gradient expo-blur expo-glass-effect expo-image expo-haptics expo-secure-store \
  expo-sqlite expo-splash-screen expo-status-bar expo-system-ui expo-constants expo-linking \
  expo-web-browser expo-file-system expo-sharing expo-clipboard expo-application expo-updates expo-asset \
  react-native-gesture-handler react-native-reanimated react-native-worklets \
  react-native-safe-area-context react-native-screens react-native-svg react-native-web \
  @react-native-community/datetimepicker @react-native-community/netinfo
npm install @tanstack/react-query@^5 zustand@^5 zod@^4 date-fns@^4 react-hook-form@^7 \
  @hookform/resolvers@^5 react-native-gifted-charts
npx expo install -- --save-dev jest-expo jest @types/jest @testing-library/react-native \
  typescript @types/react eslint eslint-config-expo prettier @resvg/resvg-js
```

Expected: install completes; `npx expo-doctor` reports no SDK version mismatches (`npx expo-doctor`).

- [ ] **Step 3: Write `app.config.ts`**

```ts
/** @author Lokesh */
import type { ExpoConfig } from 'expo/config';

type AppEnv = 'dev' | 'qa' | 'prod';

const APP_ENV = (process.env.APP_ENV ?? 'dev') as AppEnv;

const environments: Record<AppEnv, { name: string; suffix: string; serverUrl: string }> = {
  dev: { name: 'XSERP Dev', suffix: '.dev', serverUrl: 'https://dev.xserp.in' },
  qa: { name: 'XSERP QA', suffix: '.qa', serverUrl: 'https://qa.xserp.in' },
  prod: { name: 'XSERP', suffix: '', serverUrl: 'https://schnell.xserp.in' },
};

const target = environments[APP_ENV];
const appId = `com.schnell.xsmanager${target.suffix}`;

const config: ExpoConfig = {
  name: target.name,
  slug: 'xserp-mobile',
  version: '3.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'xserp',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: appId,
    buildNumber: '66',
    supportsTablet: false,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: appId,
    versionCode: 66,
    adaptiveIcon: {
      backgroundColor: '#001A3D',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: false,
        data: [{ scheme: 'https', host: new URL(target.serverUrl).host, pathPrefix: '/erp' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { backgroundColor: '#001A3D', image: './assets/images/splash-icon.png', imageWidth: 160 }],
    'expo-secure-store',
    'expo-sqlite',
    '@react-native-community/datetimepicker',
    'expo-asset',
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    appEnv: APP_ENV,
    serverUrl: target.serverUrl,
    idleTimeoutMinutes: 30,
    router: {},
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
  updates: process.env.EAS_PROJECT_ID ? { url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID}` } : undefined,
  runtimeVersion: { policy: 'appVersion' },
};

export default config;
```

- [ ] **Step 4: Write `tsconfig.json`, `babel.config.js`, `expo-env.d.ts`, `.prettierrc`, `.gitignore`, `.env.example`**

`tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "paths": { "@/*": ["./src/*"], "@/assets/*": ["./assets/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules", "android", "ios", "assets/brand/*.js"]
}
```

`babel.config.js`:
```js
/** @author Lokesh */
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

`expo-env.d.ts`:
```ts
/// <reference types="expo/types" />
```

`.prettierrc`:
```json
{ "singleQuote": true, "printWidth": 120, "trailingComma": "all", "bracketSameLine": true }
```

`.gitignore`:
```
node_modules/
.expo/
dist/
android/
ios/
*.apk
*.aab
*.jks
*.keystore
credentials.json
google-services.json
.env.local
coverage/
```

`.env.example`:
```
# Optional local overrides (copy to .env.local)
# EXPO_PUBLIC_SERVER_URL=http://192.168.2.57:8113
# EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES=30
```

- [ ] **Step 5: Write `eslint.config.js` with layer boundaries**

```js
/** @author Lokesh */
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const restrict = (patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*', 'assets/brand/*.js', 'coverage/*'] },
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
  {
    files: ['src/core/**'],
    rules: restrict([
      { group: ['@/ui', '@/ui/*', '@/features', '@/features/*', '@/modules', '@/modules/*', '@/app/*'], message: 'core must not depend on higher layers.' },
    ]),
  },
  {
    files: ['src/ui/**'],
    rules: restrict([
      { group: ['@/features', '@/features/*', '@/modules', '@/modules/*', '@/app/*'], message: 'ui must stay feature-agnostic.' },
    ]),
  },
  {
    files: ['src/features/**'],
    rules: restrict([
      { group: ['@/modules', '@/modules/*', '@/app/*'], message: 'features must not import modules/ or app/.' },
      { group: ['@/features/*/*', '!@/features/approvals/engine'], message: 'Import another feature only through its index (@/features/<name>). Use relative imports inside a feature.' },
    ]),
  },
]);
```

- [ ] **Step 6: Write `jest.config.js` and `jest.setup.ts`**

`jest.config.js`:
```js
/** @author Lokesh */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|react-native-gifted-charts|gifted-charts-core|zustand|@tanstack/.*))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
```

`jest.setup.ts`:
```ts
/** @author Lokesh */
// In-memory replacements for native storage so core logic is testable in Node.
const kvMemory = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (k: string) => kvMemory.get(k) ?? null,
    setItemSync: (k: string, v: string) => void kvMemory.set(k, v),
    removeItemSync: (k: string) => void kvMemory.delete(k),
    clearSync: () => kvMemory.clear(),
  },
}));

const secureMemory = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => secureMemory.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void secureMemory.set(k, v),
  deleteItemAsync: async (k: string) => void secureMemory.delete(k),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  performAndroidHapticsAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  AndroidHaptics: { Virtual_Key: 'virtual_key' },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({ isConnected: true })),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { appEnv: 'dev', serverUrl: 'https://dev.xserp.in', idleTimeoutMinutes: 30 } } },
}));

beforeEach(() => {
  kvMemory.clear();
  secureMemory.clear();
});
```

- [ ] **Step 7: Write `eas.json`**

```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "local" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "env": { "APP_ENV": "dev" }, "channel": "development" },
    "preview": { "distribution": "internal", "android": { "buildType": "apk" }, "env": { "APP_ENV": "dev" }, "channel": "preview" },
    "qa": { "distribution": "internal", "android": { "buildType": "apk" }, "env": { "APP_ENV": "qa" }, "channel": "qa" },
    "production": { "distribution": "store", "credentialsSource": "local", "env": { "APP_ENV": "prod" }, "channel": "production" }
  },
  "submit": { "production": {} }
}
```

- [ ] **Step 8: Temporary routes + smoke test**

`src/app/_layout.tsx`:
```tsx
/** @author Lokesh */
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`src/app/index.tsx`:
```tsx
/** @author Lokesh */
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>XSERP</Text>
    </View>
  );
}
```

`src/core/smoke.test.ts`:
```ts
/** @author Lokesh */
import Constants from 'expo-constants';

test('expo config extra is available to the app', () => {
  expect(Constants.expoConfig?.extra?.serverUrl).toBe('https://dev.xserp.in');
});
```

- [ ] **Step 9: Run the gates**

Run: `npm run verify`
Expected: `tsc` exits 0, lint 0 problems, `1 passed`.

Run: `npx expo start --offline` then press `a` (Android emulator) or scan in Expo Go.
Expected: a white screen with "XSERP". Stop the server.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo SDK 57 app with tooling and layer rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Storage wrappers and live theme system

**Files:**
- Create: `src/core/storage/kv.ts`, `src/core/storage/secure.ts`, `src/core/theme/palettes.ts`, `src/core/theme/tokens.ts`, `src/core/theme/theme.ts`, `src/core/theme/theme-provider.tsx`, `src/core/theme/make-styles.ts`, `src/core/theme/motion.ts`, `src/core/theme/index.ts`
- Test: `src/core/theme/theme.test.ts`, `src/core/theme/make-styles.test.tsx`

**Interfaces:**
- Produces:
  - `kv.getString(key): string | null`, `kv.setString(key, value): void`, `kv.remove(key): void`, `kv.getJSON<T>(key): T | null`, `kv.setJSON(key, value: unknown): void`
  - `secure.get(key): Promise<string|null>`, `secure.set(key, value): Promise<void>`, `secure.remove(key): Promise<void>`
  - `type Scheme = 'light' | 'dark'`, `type ThemePreference = 'system' | 'light' | 'dark'`
  - `type Theme = { scheme: Scheme; dark: boolean; colors: Palette; gradients: Gradients; fonts: Fonts; radius: Radius; space: Space; shadow: Shadows; tints: ModuleTints; chart: string[]; alpha: Alpha }`
  - `themes: Record<Scheme, Theme>` (stable identities), `resolveScheme(pref, system): Scheme`
  - `ThemeProvider`, `useTheme(): Theme`, `useThemePreference(): { preference, setPreference }`
  - `makeStyles(factory: (t: Theme) => T): () => T`
  - `type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'violet'`, `toneColors(t: Theme, tone: Tone): { bg: string; fg: string }`
  - `type ModuleTint = keyof ModuleTints`
  - motion: `easeOut`, `ease`, `springs`, `enter(delay)`, `fadeIn(delay)`, `fadeOut`, `layout`

- [ ] **Step 1: Write the failing tests**

`src/core/theme/theme.test.ts`:
```ts
/** @author Lokesh */
import { resolveScheme, themes, toneColors } from './theme';

describe('resolveScheme', () => {
  it('follows the system when preference is system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('light');
  });
  it('honours an explicit preference over the system', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });
});

describe('themes', () => {
  it('keeps Despack brand colours identical in both schemes', () => {
    expect(themes.light.colors.primary).toBe('#004195');
    expect(themes.dark.colors.primary).toBe('#004195');
    expect(themes.light.gradients.header).toEqual(themes.dark.gradients.header);
  });
  it('switches neutrals per scheme', () => {
    expect(themes.light.colors.bg).toBe('#F4F7FB');
    expect(themes.dark.colors.bg).toBe('#0A111D');
    expect(themes.dark.dark).toBe(true);
  });
  it('maps tones to palette colours', () => {
    expect(toneColors(themes.light, 'success')).toEqual({ bg: '#E4F5EF', fg: '#1D9D74' });
    expect(toneColors(themes.dark, 'warning')).toEqual({ bg: '#33270F', fg: '#F2B84B' });
  });
});
```

`src/core/theme/make-styles.test.tsx`:
```tsx
/** @author Lokesh */
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { makeStyles } from './make-styles';
import { ThemeProvider } from './theme-provider';

const useStyles = makeStyles((t) => ({ root: { backgroundColor: t.colors.bg } }));
const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider initialPreference="dark">{children}</ThemeProvider>;

test('builds styles from the active theme and memoises them', () => {
  const { result, rerender } = renderHook(() => useStyles(), { wrapper });
  expect(result.current.root.backgroundColor).toBe('#0A111D');
  const first = result.current;
  rerender({});
  expect(result.current).toBe(first);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/core/theme`
Expected: FAIL — `Cannot find module './theme'`.

- [ ] **Step 3: Write storage wrappers**

`src/core/storage/kv.ts`:
```ts
/** @author Lokesh */
import Storage from 'expo-sqlite/kv-store';

/** Synchronous key-value store (SQLite-backed). Never throws: storage failures degrade to "no value". */
export const kv = {
  getString(key: string): string | null {
    try {
      return Storage.getItemSync(key);
    } catch {
      return null;
    }
  },
  setString(key: string, value: string): void {
    try {
      Storage.setItemSync(key, value);
    } catch {
      // A failed preference write must never crash the UI.
    }
  },
  remove(key: string): void {
    try {
      Storage.removeItemSync(key);
    } catch {
      // ignore
    }
  },
  getJSON<T>(key: string): T | null {
    const raw = kv.getString(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJSON(key: string, value: unknown): void {
    kv.setString(key, JSON.stringify(value));
  },
};
```

`src/core/storage/secure.ts`:
```ts
/** @author Lokesh */
import * as SecureStore from 'expo-secure-store';

/** Keychain/Keystore-backed storage for credentials only (values must stay small, < 2 KB). */
export const secure = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
```

- [ ] **Step 4: Write palettes and tokens (values verbatim from despack-rn)**

`src/core/theme/palettes.ts`:
```ts
/** @author Lokesh */
// Brand values come from xserp's erp_default.css via Despack (despack-rn/src/theme/index.ts). Do not edit casually.
export const brand = {
  navy900: '#001A3D',
  navy800: '#00265A',
  navy700: '#003378',
  primary: '#004195',
  accent: '#209BE1',
  success: '#1D9D74',
  warning: '#E59A1A',
  danger: '#D9534F',
  violet: '#6A5ACD',
  white: '#FFFFFF',
} as const;

export const light = {
  ...brand,
  accentSoft: '#E6F4FC',
  primarySoft: '#E8EEF8',
  successSoft: '#E4F5EF',
  warningSoft: '#FDF3E1',
  dangerSoft: '#FBEAEA',
  violetSoft: '#EEEBFA',
  bg: '#F4F7FB',
  surface: '#FFFFFF',
  border: '#E3E9F2',
  divider: '#EEF2F7',
  fill: '#F1F4F9',
  fillSubtle: '#F7F9FC',
  chipBorder: '#D3DEF0',
  bone: '#E9EEF5',
  shimmer: 'rgba(255,255,255,0.75)',
  handle: '#D5DDE8',
  text: '#0B1A33',
  textMuted: '#5B6B82',
  textFaint: '#94A3B8',
  onPrimarySoft: '#004195',
  warningText: '#B87408',
  infoText: '#1478B3',
};

export type Palette = { [K in keyof typeof light]: string };

export const dark: Palette = {
  ...brand,
  accentSoft: '#0E2A3D',
  primarySoft: '#16264A',
  successSoft: '#0F2E26',
  warningSoft: '#33270F',
  dangerSoft: '#3A1A1C',
  violetSoft: '#231E3D',
  bg: '#0A111D',
  surface: '#131C2B',
  border: '#24324A',
  divider: '#1C2739',
  fill: '#1B2638',
  fillSubtle: '#172131',
  chipBorder: '#2A3B5A',
  bone: '#1E293B',
  shimmer: 'rgba(255,255,255,0.07)',
  handle: '#334155',
  text: '#E8EEF7',
  textMuted: '#9AA8BD',
  textFaint: '#66758C',
  onPrimarySoft: '#8FB8FF',
  warningText: '#F2B84B',
  infoText: '#6CC4F5',
};
```

`src/core/theme/tokens.ts`:
```ts
/** @author Lokesh */
export const gradients = {
  brand: ['#001A3D', '#004195', '#1579C8'] as const,
  header: ['#00265A', '#004195'] as const,
  accent: ['#004195', '#209BE1'] as const,
  success: ['#178463', '#1D9D74'] as const,
  danger: ['#B8403C', '#D9534F'] as const,
};
export type Gradients = typeof gradients;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;
export type Fonts = typeof fonts;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export type Radius = typeof radius;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, gutter: 18 } as const;
export type Space = typeof space;

export const shadow = {
  card: { shadowColor: '#0B2A5B', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  lifted: { shadowColor: '#001A3D', shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  button: { shadowColor: '#004195', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
} as const;
export type Shadows = typeof shadow;

/** Colours used on top of the dark gradients — identical in both schemes. */
export const alpha = {
  onGradient: '#FFFFFF',
  onGradientMuted: 'rgba(255,255,255,0.72)',
  onGradientFaint: 'rgba(255,255,255,0.55)',
  glassFill: 'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.18)',
  glassButton: 'rgba(255,255,255,0.16)',
  orb: 'rgba(32,155,225,0.25)',
  orbSoft: 'rgba(255,255,255,0.07)',
  orbGreen: 'rgba(29,157,116,0.14)',
  backdrop: 'rgba(0,18,45,0.55)',
  liveDot: '#35D39A',
  successOnGradient: '#7FE0B8',
} as const;
export type Alpha = typeof alpha;

export const moduleTints = {
  finance: '#004195',
  audit: '#6A5ACD',
  purchase: '#E59A1A',
  sales: '#1D9D74',
  stores: '#209BE1',
  masters: '#0E7C86',
  expenses: '#D9534F',
  approvals: '#1C75ED',
  production: '#94A3B8',
  hr: '#94A3B8',
  reports: '#94A3B8',
  settings: '#5B6B82',
} as const;
export type ModuleTints = typeof moduleTints;
export type ModuleTint = keyof ModuleTints;

export const chartSeries = {
  light: ['#004195', '#209BE1', '#1D9D74', '#E59A1A', '#6A5ACD', '#D9534F', '#0E7C86'],
  dark: ['#5B9BFF', '#6CC4F5', '#3CC79A', '#F2B84B', '#9B8CFF', '#F07B77', '#3FB8C2'],
} as const;
```

- [ ] **Step 5: Write theme model**

`src/core/theme/theme.ts`:
```ts
/** @author Lokesh */
import { dark, light, type Palette } from './palettes';
import {
  alpha,
  chartSeries,
  fonts,
  gradients,
  moduleTints,
  radius,
  shadow,
  space,
  type Alpha,
  type Fonts,
  type Gradients,
  type ModuleTints,
  type Radius,
  type Shadows,
  type Space,
} from './tokens';

export type Scheme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'violet';

export type Theme = {
  scheme: Scheme;
  dark: boolean;
  colors: Palette;
  gradients: Gradients;
  fonts: Fonts;
  radius: Radius;
  space: Space;
  shadow: Shadows;
  tints: ModuleTints;
  chart: readonly string[];
  alpha: Alpha;
};

function build(scheme: Scheme): Theme {
  return {
    scheme,
    dark: scheme === 'dark',
    colors: scheme === 'dark' ? dark : light,
    gradients,
    fonts,
    radius,
    space,
    shadow,
    tints: moduleTints,
    chart: chartSeries[scheme],
    alpha,
  };
}

/** One object per scheme so styles can be memoised by identity. */
export const themes: Record<Scheme, Theme> = { light: build('light'), dark: build('dark') };

export function resolveScheme(preference: ThemePreference, system: string | null | undefined): Scheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function toneColors(t: Theme, tone: Tone): { bg: string; fg: string } {
  const c = t.colors;
  switch (tone) {
    case 'info':
      return { bg: c.accentSoft, fg: c.infoText };
    case 'success':
      return { bg: c.successSoft, fg: c.success };
    case 'warning':
      return { bg: c.warningSoft, fg: c.warningText };
    case 'danger':
      return { bg: c.dangerSoft, fg: c.danger };
    case 'violet':
      return { bg: c.violetSoft, fg: c.violet };
    default:
      return { bg: c.divider, fg: c.textMuted };
  }
}
```

- [ ] **Step 6: Write provider, makeStyles, motion, index**

`src/core/theme/theme-provider.tsx`:
```tsx
/** @author Lokesh */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { kv } from '../storage/kv';
import { resolveScheme, themes, type Theme, type ThemePreference } from './theme';

const PREF_KEY = 'xserp.theme';

type ThemeContextValue = { theme: Theme; preference: ThemePreference; setPreference: (p: ThemePreference) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  const saved = kv.getString(PREF_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

/** Live light/dark: follows the OS unless the user picked a scheme; switching never restarts the app. */
export function ThemeProvider({ children, initialPreference }: { children: ReactNode; initialPreference?: ThemePreference }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>(() => initialPreference ?? readPreference());

  const setPreference = useCallback((next: ThemePreference) => {
    kv.setString(PREF_KEY, next);
    // Keeps native UI (date pickers, alerts, keyboards) in step with the app.
    Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
    setPref(next);
  }, []);

  const scheme = resolveScheme(preference, system);
  const value = useMemo(() => ({ theme: themes[scheme], preference, setPreference }), [scheme, preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export const useTheme = (): Theme => useThemeContext().theme;

export function useThemePreference() {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}

/** Apply a saved explicit preference to native UI at startup (call once from the root layout). */
export function applySavedAppearance() {
  const pref = readPreference();
  if (pref !== 'system') Appearance.setColorScheme(pref);
}
```

`src/core/theme/make-styles.ts`:
```ts
/** @author Lokesh */
import { StyleSheet } from 'react-native';

import type { Theme } from './theme';
import { useTheme } from './theme-provider';

/**
 * Declares theme-aware styles once at module level:
 *   const useStyles = makeStyles((t) => ({ root: { backgroundColor: t.colors.bg } }));
 *   const styles = useStyles();
 * Styles are created once per theme and reused (themes have stable identities).
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (t: Theme) => T): () => T {
  const cache = new WeakMap<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
```

`src/core/theme/motion.ts`: copy `despack-rn/src/theme/motion.ts` verbatim (shown below for completeness).
```ts
/** @author Lokesh */
import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

export const easeOut = Easing.bezier(0.2, 0.8, 0.2, 1);
export const ease = Easing.bezier(0.25, 0.1, 0.25, 1);

export const springs = {
  gentle: { dampingRatio: 0.82, duration: 480 },
  snappy: { dampingRatio: 0.8, duration: 300 },
};

export const enter = (delay = 0) =>
  FadeInDown.springify(520)
    .dampingRatio(0.8)
    .delay(delay)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });

export const fadeIn = (delay = 0) => FadeIn.duration(240).delay(delay);
export const fadeOut = FadeOut.duration(160);
export const layout = LinearTransition.springify(420).dampingRatio(0.85);
```

`src/core/theme/index.ts`:
```ts
/** @author Lokesh */
export * from './theme';
export * from './tokens';
export type { Palette } from './palettes';
export { ThemeProvider, useTheme, useThemePreference, applySavedAppearance } from './theme-provider';
export { makeStyles } from './make-styles';
export * from './motion';
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx jest src/core/theme && npm run typecheck`
Expected: PASS (5 tests), tsc 0 errors.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(core): add storage wrappers and live light/dark theme system

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Config, API client, schema helpers, date & money utils

**Files:**
- Create: `src/core/config/env.ts`, `src/core/api/errors.ts`, `src/core/api/form.ts`, `src/core/api/schema.ts`, `src/core/api/envelope.ts`, `src/core/api/client.ts`, `src/core/api/index.ts`, `src/core/utils/date.ts`, `src/core/utils/money.ts`, `src/core/utils/feedback.ts`, `src/core/utils/index.ts`
- Test: `src/core/api/client.test.ts`, `src/core/api/schema.test.ts`, `src/core/api/form.test.ts`, `src/core/utils/date.test.ts`, `src/core/utils/money.test.ts`

**Interfaces:**
- Produces:
  - `env: { appEnv: 'dev'|'qa'|'prod'; serverUrl: string; idleTimeoutMinutes: number }`, `erpUrl(path: string): string`, `serverHost: string`
  - `type ApiErrorKind = 'network'|'timeout'|'session'|'server'|'validation'|'csrf'|'config'`
  - `class ApiError extends Error { kind; code?: number; path?: string; details?: string }`, `isApiError(e)`, `errorMessage(e, fallback?)`
  - `type FormParams = Record<string, FormValue>`; `encodeForm(params): string`
  - zod helpers: `zNum`, `zNumOrNull`, `zStr`, `zStrOrNull`, `zBool`, `zId`, `zList(item)`, `zRecordOf(item)`
  - `configureApi({ getAuth, onSessionExpired })`, `type AuthParams = { token: string; userId: number; enterpriseId: number }`
  - `post<S extends z.ZodType>(path, params, { schema, auth?, timeoutMs?, emptyCodes? }): Promise<z.infer<S>>`
  - `postOk(path, params, opts?)` — for actions whose response body is irrelevant; returns `Envelope`
  - `type Envelope = { response_code: number; response_message?: string; custom_message?: string }` plus passthrough keys
  - date: `toApiDate(d: Date): string`, `parseServerDate(s): Date | null`, `formatDate(s | Date | null, pattern?): string`, `type DateRange = { since: Date; till: Date }`, `lastDays(n): DateRange`, `thisMonth(): DateRange`, `financialYear(fyStartDay?: string | null, at?: Date): DateRange`, `rangeParams(r, keys?: ['since','till'] | ['from_date','to_date']): Record<string,string>`, `DEFAULT_RANGE_DAYS = 30`
  - money: `formatMoney(v: number, symbol?: string): string`, `formatCompact(v: number, symbol?: string): string`, `formatQty(v: number, unit?: string | null): string`
  - feedback: `tapFeedback()`, `successFeedback()`, `errorFeedback()`

- [ ] **Step 1: Write the failing tests**

`src/core/api/form.test.ts`:
```ts
/** @author Lokesh */
import { encodeForm } from './form';

test('encodes scalars, skips nullish and JSON-encodes objects', () => {
  const body = encodeForm({ a: 'x y', b: 2, c: true, d: null, e: undefined, f: { k: [1] } });
  expect(body).toBe('a=x%20y&b=2&c=true&f=%7B%22k%22%3A%5B1%5D%7D');
});
```

`src/core/api/schema.test.ts`:
```ts
/** @author Lokesh */
import { z } from 'zod';

import { zBool, zId, zList, zNum, zNumOrNull, zStr, zStrOrNull } from './schema';

test('zNum coerces server numbers', () => {
  expect(zNum.parse('1,234.50')).toBe(1234.5);
  expect(zNum.parse('')).toBe(0);
  expect(zNum.parse(null)).toBe(0);
  expect(zNum.parse(undefined)).toBe(0);
  expect(zNum.parse('abc')).toBe(0);
  expect(zNum.parse(7)).toBe(7);
});

test('zNumOrNull keeps missing values distinct', () => {
  expect(zNumOrNull.parse(null)).toBeNull();
  expect(zNumOrNull.parse('')).toBeNull();
  expect(zNumOrNull.parse('3')).toBe(3);
});

test('string helpers', () => {
  expect(zStr.parse(null)).toBe('');
  expect(zStr.parse(12)).toBe('12');
  expect(zStrOrNull.parse('')).toBeNull();
  expect(zId.parse(42)).toBe('42');
});

test('zBool understands Django and JSON booleans', () => {
  for (const v of [true, 1, '1', 'true', 'True']) expect(zBool.parse(v)).toBe(true);
  for (const v of [false, 0, '0', 'false', null, undefined, '']) expect(zBool.parse(v)).toBe(false);
});

test('zList treats missing or non-array as empty', () => {
  const s = z.object({ items: zList(z.object({ id: zId })) });
  expect(s.parse({}).items).toEqual([]);
  expect(s.parse({ items: null }).items).toEqual([]);
  expect(s.parse({ items: [{ id: 1 }] }).items).toEqual([{ id: '1' }]);
});
```

`src/core/api/client.test.ts`:
```ts
/** @author Lokesh */
import { z } from 'zod';

import { configureApi, post, postOk } from './client';
import { ApiError } from './errors';
import { zList, zNum } from './schema';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const respond = (body: string, status = 200) =>
  fetchMock.mockResolvedValueOnce({ status, text: async () => body } as Response);

const onSessionExpired = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  onSessionExpired.mockReset();
  configureApi({ getAuth: () => ({ token: 'jwt', userId: 7, enterpriseId: 102 }), onSessionExpired });
});

const listSchema = z.looseObject({ po_list: zList(z.looseObject({ po_value: zNum })) });

test('posts form-encoded body with auth, CSRF and referer to /erp/<path>', async () => {
  respond(JSON.stringify({ response_code: 200, po_list: [] }));
  await post('purchase/json/po_draft/', { status: 0 }, { schema: listSchema });
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe('https://dev.xserp.in/erp/purchase/json/po_draft/');
  expect(init.method).toBe('POST');
  expect(init.credentials).toBe('omit');
  const headers = init.headers as Record<string, string>;
  expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  expect(headers.Referer).toBe('https://dev.xserp.in/');
  const csrf = headers['X-CSRFToken'];
  expect(csrf).toMatch(/^[0-9a-f]{32}$/);
  expect(headers.Cookie).toBe(`csrftoken=${csrf}`);
  const body = String(init.body);
  expect(body).toContain('status=0');
  expect(body).toContain('token=jwt');
  expect(body).toContain('user_id=7');
  expect(body).toContain('enterprise_id=102');
  expect(body).toContain(`csrfmiddlewaretoken=${csrf}`);
});

test('omits auth fields when auth is false', async () => {
  respond(JSON.stringify({ response_code: 200 }));
  await postOk('user/json/login_api/', { user_email: 'a@b.c' }, { auth: false });
  expect(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)).not.toContain('token=');
});

test('coerces string numbers through the schema', async () => {
  respond(JSON.stringify({ response_code: 200, po_list: [{ po_value: '1,200.5' }] }));
  const res = await post('purchase/json/po_draft/', {}, { schema: listSchema });
  expect(res.po_list[0]?.po_value).toBe(1200.5);
});

test('non-200 response_code becomes a server error with the custom message', async () => {
  respond(JSON.stringify({ response_code: 400, response_message: 'Failure', custom_message: 'PO already approved' }));
  await expect(postOk('purchase/json/po/approve/', {})).rejects.toMatchObject({ kind: 'server', code: 400, message: 'PO already approved' });
});

test('emptyCodes map to an empty, schema-defaulted result', async () => {
  respond(JSON.stringify({ response_code: 109, response_message: 'Database error' }));
  const s = z.looseObject({ grn_list: zList(z.looseObject({})) });
  await expect(post('auditing/json/pendingGrn/', {}, { schema: s, emptyCodes: [109] })).resolves.toMatchObject({ grn_list: [] });
});

test('Session Timeout envelope calls the expiry handler once and throws a session error', async () => {
  respond(JSON.stringify({ response_code: 400, response_message: 'Session Timeout', custom_message: 'Session Timeout. Please login again!' }));
  await expect(postOk('sales/json/draft_oa/', {})).rejects.toMatchObject({ kind: 'session' });
  expect(onSessionExpired).toHaveBeenCalledTimes(1);
});

test('HTML session page is a session error', async () => {
  respond('<html><body>Your session has expired</body></html>');
  await expect(postOk('sales/json/draft_oa/', {})).rejects.toMatchObject({ kind: 'session' });
  expect(onSessionExpired).toHaveBeenCalledTimes(1);
});

test('HTML 403 is a CSRF error', async () => {
  respond('<html>CSRF verification failed</html>', 403);
  await expect(postOk('x/', {})).rejects.toMatchObject({ kind: 'csrf' });
});

test('network failure is a network error', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(postOk('x/', {})).rejects.toMatchObject({ kind: 'network' });
});

test('abort is a timeout error', async () => {
  fetchMock.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));
  await expect(postOk('x/', {})).rejects.toMatchObject({ kind: 'timeout' });
});

test('schema mismatch is a validation error that names the path', async () => {
  respond(JSON.stringify({ response_code: 200, po_list: 'nope' }));
  const strict = z.object({ po_list: z.array(z.object({ id: z.number() })) });
  const err = await post('purchase/json/po_draft/', {}, { schema: strict }).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ kind: 'validation', path: 'purchase/json/po_draft/' });
});

test('signed-out authed request fails fast without calling fetch', async () => {
  configureApi({ getAuth: () => null });
  await expect(postOk('x/', {})).rejects.toMatchObject({ kind: 'session' });
  expect(fetchMock).not.toHaveBeenCalled();
  expect(onSessionExpired).not.toHaveBeenCalled();
});
```

`src/core/utils/date.test.ts`:
```ts
/** @author Lokesh */
import { DEFAULT_RANGE_DAYS, financialYear, formatDate, lastDays, parseServerDate, rangeParams, toApiDate } from './date';

test('toApiDate', () => expect(toApiDate(new Date(2026, 0, 5))).toBe('2026-01-05'));

test('parseServerDate accepts the formats xserp emits', () => {
  expect(parseServerDate('2026-03-31')?.getDate()).toBe(31);
  expect(parseServerDate('2026-03-31 14:05:00')?.getHours()).toBe(14);
  expect(parseServerDate('31-03-2026')?.getMonth()).toBe(2);
  expect(parseServerDate('Mar 31, 2026')?.getFullYear()).toBe(2026);
  expect(parseServerDate('')).toBeNull();
  expect(parseServerDate(null)).toBeNull();
  expect(parseServerDate('garbage')).toBeNull();
});

test('formatDate falls back to a dash', () => {
  expect(formatDate('2026-03-31')).toBe('31 Mar 2026');
  expect(formatDate(null)).toBe('—');
});

test('default range is 30 days ending today', () => {
  const now = new Date(2026, 9, 2);
  const r = lastDays(DEFAULT_RANGE_DAYS, now);
  expect(toApiDate(r.till)).toBe('2026-10-02');
  expect(toApiDate(r.since)).toBe('2026-09-03');
});

test('financial year defaults to April and honours fy_start_day', () => {
  const fy = financialYear(null, new Date(2026, 1, 10));
  expect(toApiDate(fy.since)).toBe('2025-04-01');
  expect(toApiDate(fy.till)).toBe('2026-03-31');
  const jan = financialYear('01/01', new Date(2026, 1, 10));
  expect(toApiDate(jan.since)).toBe('2026-01-01');
});

test('rangeParams uses the requested key names', () => {
  const r = { since: new Date(2026, 0, 1), till: new Date(2026, 0, 31) };
  expect(rangeParams(r)).toEqual({ since: '2026-01-01', till: '2026-01-31' });
  expect(rangeParams(r, ['from_date', 'to_date'])).toEqual({ from_date: '2026-01-01', to_date: '2026-01-31' });
});
```

`src/core/utils/money.test.ts`:
```ts
/** @author Lokesh */
import { formatCompact, formatMoney, formatQty } from './money';

test('formatMoney uses Indian grouping', () => {
  expect(formatMoney(1234567.5)).toBe('₹12,34,567.50');
  expect(formatMoney(0, '$')).toBe('$0.00');
  expect(formatMoney(-50)).toBe('-₹50.00');
});

test('formatCompact uses lakh/crore', () => {
  expect(formatCompact(25_000_000)).toBe('₹2.5 Cr');
  expect(formatCompact(350_000)).toBe('₹3.5 L');
  expect(formatCompact(12_500)).toBe('₹12.5 K');
  expect(formatCompact(999)).toBe('₹999');
});

test('formatQty', () => {
  expect(formatQty(12, 'Nos')).toBe('12 Nos');
  expect(formatQty(2.5)).toBe('2.5');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/core/api src/core/utils`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement config and errors**

`src/core/config/env.ts`:
```ts
/** @author Lokesh */
import Constants from 'expo-constants';

type Extra = { appEnv: 'dev' | 'qa' | 'prod'; serverUrl: string; idleTimeoutMinutes: number };
const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

const serverUrl = (process.env.EXPO_PUBLIC_SERVER_URL || extra.serverUrl || 'https://dev.xserp.in').replace(/\/+$/, '');

export const env = {
  appEnv: extra.appEnv ?? 'dev',
  serverUrl,
  idleTimeoutMinutes: Number(process.env.EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES || extra.idleTimeoutMinutes || 30),
} as const;

/** `erpUrl('sales/json/draft_oa/')` → `https://dev.xserp.in/erp/sales/json/draft_oa/` */
export const erpUrl = (path: string) => `${env.serverUrl}/erp/${path.replace(/^\/+/, '')}`;

export const serverHost = serverUrl.replace(/^https?:\/\//, '');
```

`src/core/api/errors.ts`:
```ts
/** @author Lokesh */
export type ApiErrorKind = 'network' | 'timeout' | 'session' | 'server' | 'validation' | 'csrf' | 'config';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly code?: number;
  readonly path?: string;
  readonly details?: string;

  constructor(kind: ApiErrorKind, message: string, opts: { code?: number; path?: string; details?: string } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.code = opts.code;
    this.path = opts.path;
    this.details = opts.details;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

const FRIENDLY: Partial<Record<ApiErrorKind, string>> = {
  network: 'Unable to reach the server. Check your connection.',
  timeout: 'The server took too long to respond.',
  csrf: 'The server rejected the request. Please try again.',
  validation: 'Unexpected server response.',
};

/** A message safe to show to the user. */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (isApiError(e)) return FRIENDLY[e.kind] ?? e.message ?? fallback;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
```

- [ ] **Step 4: Implement form encoding and schema helpers**

`src/core/api/form.ts`:
```ts
/** @author Lokesh */
export type FormValue = string | number | boolean | null | undefined | object;
export type FormParams = Record<string, FormValue>;

/** x-www-form-urlencoded body. Objects/arrays are JSON strings (xserp reads e.g. `invoice_data` that way). */
export function encodeForm(params: FormParams): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      const value = typeof v === 'object' ? JSON.stringify(v) : String(v);
      return `${encodeURIComponent(k)}=${encodeURIComponent(value)}`;
    })
    .join('&');
}
```

`src/core/api/schema.ts`:
```ts
/** @author Lokesh */
import { z } from 'zod';

// xserp serialises loosely: numbers as "1,234.50", "", null; ids as ints or strings; booleans as 1/"true"/"True".
// Every response schema builds on these so screens can trust the types.

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

export const zNum = z.preprocess((v) => toNumber(v) ?? 0, z.number());
export const zNumOrNull = z.preprocess((v) => toNumber(v), z.number().nullable());
export const zStr = z.preprocess((v) => (v === null || v === undefined ? '' : String(v)), z.string());
export const zStrOrNull = z.preprocess((v) => (v === null || v === undefined || v === '' ? null : String(v)), z.string().nullable());
export const zId = zStr;
export const zBool = z.preprocess((v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'True', z.boolean());

export const zList = <T extends z.ZodType>(item: T) => z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(item));

export const zRecordOf = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}), z.record(z.string(), item));
```

- [ ] **Step 5: Implement envelope and client**

`src/core/api/envelope.ts`:
```ts
/** @author Lokesh */
import { ApiError } from './errors';

export type Envelope = { response_code: number; response_message?: string; custom_message?: string; [key: string]: unknown };

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Validates xserp's `{response_code, response_message, custom_message, ...data}` envelope. */
export function checkEnvelope(data: unknown, path: string, emptyCodes: readonly number[] = []): Envelope {
  if (!isRecord(data)) throw new ApiError('validation', 'Unexpected server response', { path, details: 'Body is not an object' });
  if (data.response_message === 'Session Timeout') {
    throw new ApiError('session', 'Your session has ended. Please sign in again.', { path, code: 400 });
  }
  const hasCode = 'response_code' in data;
  const code = hasCode ? Number(data.response_code) : 200;
  if (code !== 200) {
    if (emptyCodes.includes(code)) return { response_code: 200 };
    const msg = [data.custom_message, data.error, data.message, data.response_message].find((m) => typeof m === 'string' && m.trim());
    throw new ApiError('server', (msg as string | undefined) ?? 'Request failed', { path, code });
  }
  return { ...data, response_code: 200 } as Envelope;
}

/** Maps the HTML pages xserp returns for auth/CSRF failures. */
export function htmlError(text: string, status: number, path: string): ApiError {
  if (status === 403 || /csrf/i.test(text)) return new ApiError('csrf', 'Request rejected by server (CSRF)', { path, code: status });
  if (/session has expired|session timeout|login again/i.test(text)) return new ApiError('session', 'Your session has expired', { path });
  if (/inactive/i.test(text)) return new ApiError('server', 'This account is inactive', { path, code: status });
  return new ApiError('validation', `Unexpected response from server (${status})`, { path, code: status });
}
```

`src/core/api/client.ts`:
```ts
/** @author Lokesh */
import { z } from 'zod';

import { env, erpUrl } from '../config/env';
import { checkEnvelope, htmlError, type Envelope } from './envelope';
import { ApiError } from './errors';
import { encodeForm, type FormParams } from './form';

export type AuthParams = { token: string; userId: number; enterpriseId: number };

type ApiHooks = { getAuth: () => AuthParams | null; onSessionExpired: () => void };
let hooks: ApiHooks = { getAuth: () => null, onSessionExpired: () => {} };

/** Wired once by core/auth/bootstrap so the client never imports the session store (no cycles). */
export function configureApi(next: Partial<ApiHooks>) {
  hooks = { ...hooks, ...next };
}

// Django's CSRF check is double-submit: cookie must equal the field/header, so any 32-hex value works.
const CSRF_TOKEN = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

type RequestOptions = { auth?: boolean; timeoutMs?: number; emptyCodes?: readonly number[] };
export type PostOptions<S extends z.ZodType> = RequestOptions & { schema: S };

async function request(path: string, params: FormParams, { auth = true, timeoutMs = 30_000, emptyCodes = [] }: RequestOptions): Promise<Envelope> {
  const body: FormParams = { ...params, csrfmiddlewaretoken: CSRF_TOKEN };
  if (auth) {
    const a = hooks.getAuth();
    if (!a) throw new ApiError('session', 'Please sign in again.', { path });
    body.token = a.token;
    body.user_id = a.userId;
    body.enterprise_id = a.enterpriseId;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(erpUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': CSRF_TOKEN,
        Cookie: `csrftoken=${CSRF_TOKEN}`,
        Referer: `${env.serverUrl}/`,
      },
      body: encodeForm(body),
      // iOS would otherwise replace our CSRF cookie with stored cookies; auth is via POST fields.
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new ApiError(aborted ? 'timeout' : 'network', aborted ? 'Request timed out' : 'Unable to reach the server', { path });
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    const err = htmlError(text, res.status, path);
    if (err.kind === 'session' && auth) hooks.onSessionExpired();
    throw err;
  }

  try {
    return checkEnvelope(data, path, emptyCodes);
  } catch (e) {
    if (e instanceof ApiError && e.kind === 'session' && auth) hooks.onSessionExpired();
    throw e;
  }
}

/** POST + envelope check + zod validation. Feature api.ts files are the only callers. */
export async function post<S extends z.ZodType>(path: string, params: FormParams, opts: PostOptions<S>): Promise<z.infer<S>> {
  const data = await request(path, params, opts);
  const parsed = opts.schema.safeParse(data);
  if (!parsed.success) {
    const details = z.prettifyError(parsed.error);
    if (__DEV__) console.warn(`[api] ${path} schema mismatch\n${details}`);
    throw new ApiError('validation', 'Unexpected server response', { path, details });
  }
  return parsed.data;
}

/** For actions (approve/reject/save) where only success matters. */
export function postOk(path: string, params: FormParams, opts: RequestOptions = {}): Promise<Envelope> {
  return request(path, params, opts);
}
```

`src/core/api/index.ts`:
```ts
/** @author Lokesh */
export { post, postOk, configureApi, type AuthParams, type PostOptions } from './client';
export { ApiError, isApiError, errorMessage, type ApiErrorKind } from './errors';
export { encodeForm, type FormParams, type FormValue } from './form';
export type { Envelope } from './envelope';
export * from './schema';
```

- [ ] **Step 6: Implement utils**

`src/core/utils/date.ts`:
```ts
/** @author Lokesh */
import { addYears, endOfMonth, format, isValid, parse, startOfDay, startOfMonth, subDays } from 'date-fns';

export type DateRange = { since: Date; till: Date };
export const DEFAULT_RANGE_DAYS = 30;

const SERVER_FORMATS = ['yyyy-MM-dd HH:mm:ss', "yyyy-MM-dd'T'HH:mm:ss", 'yyyy-MM-dd', 'dd-MM-yyyy', 'dd/MM/yyyy', 'MMM d, yyyy', 'MMM dd, yyyy', 'dd MMM yyyy'];

export const toApiDate = (d: Date) => format(d, 'yyyy-MM-dd');

export function parseServerDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const value = s.trim().replace(/\.\d+$/, '');
  for (const f of SERVER_FORMATS) {
    const d = parse(value, f, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

export function formatDate(v: string | Date | null | undefined, pattern = 'dd MMM yyyy'): string {
  const d = v instanceof Date ? v : parseServerDate(v);
  return d ? format(d, pattern) : '—';
}

export function lastDays(n: number, now = new Date()): DateRange {
  return { since: startOfDay(subDays(now, n - 1)), till: startOfDay(now) };
}

export function thisMonth(now = new Date()): DateRange {
  return { since: startOfMonth(now), till: startOfDay(endOfMonth(now)) };
}

/** `fy_start_day` from login looks like "01/04" (dd/MM); defaults to 1 April when absent/unparseable. */
export function financialYear(fyStartDay?: string | null, at = new Date()): DateRange {
  const m = fyStartDay?.match(/^(\d{1,2})[/-](\d{1,2})/);
  const day = m ? Number(m[1]) : 1;
  const month = m ? Number(m[2]) - 1 : 3;
  let since = new Date(at.getFullYear(), month, day);
  if (since > at) since = addYears(since, -1);
  return { since, till: subDays(addYears(since, 1), 1) };
}

export function rangeParams(r: DateRange, keys: readonly [string, string] = ['since', 'till']): Record<string, string> {
  return { [keys[0]]: toApiDate(r.since), [keys[1]]: toApiDate(r.till) };
}
```

`src/core/utils/money.ts`:
```ts
/** @author Lokesh */
const grouped = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export function formatMoney(v: number, symbol = '₹'): string {
  const s = `${symbol}${grouped.format(Math.abs(v))}`;
  return v < 0 ? `-${s}` : s;
}

const trim = (n: number) => String(Math.round(n * 10) / 10);

/** ₹2.5 Cr / ₹3.5 L / ₹12.5 K — for dashboard tiles. */
export function formatCompact(v: number, symbol = '₹'): string {
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1e7) return `${sign}${symbol}${trim(a / 1e7)} Cr`;
  if (a >= 1e5) return `${sign}${symbol}${trim(a / 1e5)} L`;
  if (a >= 1e3) return `${sign}${symbol}${trim(a / 1e3)} K`;
  return `${sign}${symbol}${plain.format(a)}`;
}

export function formatQty(v: number, unit?: string | null): string {
  const n = plain.format(v);
  return unit ? `${n} ${unit}` : n;
}
```

`src/core/utils/feedback.ts`:
```ts
/** @author Lokesh */
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

/** Android haptics are silent when touch vibration is off, so a short vibration is sent alongside. */
export function tapFeedback() {
  if (Platform.OS === 'android') {
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key).catch(() => {});
    Vibration.vibrate(20);
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export const successFeedback = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
export const errorFeedback = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
```

`src/core/utils/index.ts`:
```ts
/** @author Lokesh */
export * from './date';
export * from './money';
export * from './feedback';
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx jest src/core && npm run typecheck`
Expected: PASS (all api/schema/form/date/money tests).

- [ ] **Step 8: Verify against the real server (no auth needed)**

Run:
```bash
curl -s -X POST https://dev.xserp.in/erp/commons/version_info/ -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Cookie: csrftoken=0123456789abcdef0123456789abcdef' -H 'X-CSRFToken: 0123456789abcdef0123456789abcdef' \
  -H 'Referer: https://dev.xserp.in/' -d 'csrfmiddlewaretoken=0123456789abcdef0123456789abcdef' | head -c 300
```
Expected: JSON containing `"version"`. If HTTPS fails, try `http://dev.xserp.in` and record the working scheme in `app.config.ts` `environments.dev.serverUrl`.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(core): add typed API client, schema coercion, date and money utils

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Session model, auth API, idle timeout, permissions

**Files:**
- Create: `src/core/auth/types.ts`, `src/core/auth/session-mapper.ts`, `src/core/auth/session-store.ts`, `src/core/auth/idle-timeout.ts`, `src/core/auth/auth-api.ts`, `src/core/auth/use-idle-sign-out.ts`, `src/core/auth/bootstrap.ts`, `src/core/auth/index.ts`, `src/core/permissions/permissions.ts`, `src/core/permissions/index.ts`, `__fixtures__/login_api.json`
- Test: `src/core/auth/session-mapper.test.ts`, `src/core/auth/session-store.test.ts`, `src/core/auth/idle-timeout.test.ts`, `src/core/permissions/permissions.test.ts`

**Interfaces:**
- Consumes: `post`, `postOk`, `configureApi`, `zNum`, `zStr`, `zBool`, `zRecordOf` (Task 3); `kv`, `secure` (Task 2); `env` (Task 3).
- Produces:
  - `type PermissionAction = 'view'|'edit'|'delete'|'approve'|'alert'`, `type Permission = Record<PermissionAction, boolean>`
  - `type PermissionCode = 'ACCOUNTS'|'ICD'|'PURCHASE'|'SALES'|'STORES'|'MASTERS'|'EXPENSES'`
  - `type PendingCounts = { po: number; invoice: number; oa: number; grn: number; icd: number; rate: number; voucher: number }`
  - `type Session = { token: string; userId: number; enterpriseId: number; user: SessionUser; permissions: Record<string, Permission>; fyStartDay: string | null; icd: { enabled: boolean; ignoreCreditNote: boolean; autoGenVoucher: boolean }; counts: PendingCounts; subscription: Subscription; serverDate: string | null; refreshedAt: number }`
  - `type SessionUser = { id: number; username: string; email: string; firstName: string; lastName: string; isSuper: boolean; enterpriseName: string }`
  - `type Subscription = { plan: string | null; expiredOn: string | null; isExpired: boolean; showExpiry: boolean; canRequestExtension: boolean; extensionRequestedOn: string | null; enterpriseActive: boolean }`
  - `userPayloadSchema`, `toSession(payload, previous?: Session | null): Session`, `displayName(user)`, `initials(user)`
  - `useSessionStore` (zustand): `{ status: 'loading'|'signedOut'|'signedIn'; session: Session | null; notice: string | null; hydrate(): Promise<void>; signIn(s: Session): Promise<void>; update(s: Session): Promise<void>; signOut(notice?: string | null): Promise<void>; clearNotice(): void }`
  - `useSession(): Session` (throws when signed out — only used under the auth guard)
  - auth api: `login(email, password): Promise<Session>`, `refreshSession(current: Session): Promise<Session>`, `logout(session): Promise<void>`, `forgotPassword(email): Promise<string>`, `changePassword(input: { email: string; oldPassword?: string; newPassword: string; cpToken?: string }): Promise<void>`, `fetchVersionInfo(): Promise<{ version: string; forceUpdate: boolean }>`, `requestExtension(reason: string): Promise<void>`
  - idle: `markActive()`, `isIdleExpired(now?)`, `IDLE_NOTICE`, `resetIdle()`; `useIdleSignOut()` hook
  - `bootstrapAuth(): void` (wires `configureApi`)
  - permissions: `can(session, code, action)`, `useCan(code, action)`

- [ ] **Step 1: Capture a real login fixture**

Ask the user for a dev.xserp.in test account (email/password) if you don't have one. Then run:
```bash
CSRF=0123456789abcdef0123456789abcdef
curl -s -X POST https://dev.xserp.in/erp/user/json/login_api/ -H 'Content-Type: application/x-www-form-urlencoded' \
  -H "Cookie: csrftoken=$CSRF" -H "X-CSRFToken: $CSRF" -H 'Referer: https://dev.xserp.in/' \
  --data-urlencode "user_email=$XSERP_EMAIL" --data-urlencode "password=$XSERP_PASSWORD" \
  -d "csrfmiddlewaretoken=$CSRF" | python3 -m json.tool > __fixtures__/login_api.json
```
Then **replace** `token` with `"FIXTURE_TOKEN"`, the email with `"tester@example.com"`, and names with `"Test"`/`"User"` before committing. If no account is available yet, create the fixture by hand with exactly these keys: `response_code, response_message, id, username, user_email, first_name, last_name, is_active, is_super, enterprise_id, enterprise_name, permissions{PURCHASE:{module_code,view,edit,delete,approve,alert}, ...}, fy_start_day, token, pending_po_count_notification, invoice_pending_count, oa_pending_count, receipt_save_count, icd_checked_count, master_material_price, pending_voucher_count` (values like the real server: ints as numbers, counts possibly missing).

- [ ] **Step 2: Write the failing tests**

`src/core/auth/session-mapper.test.ts`:
```ts
/** @author Lokesh */
import fixture from '../../../__fixtures__/login_api.json';
import { displayName, initials, toSession, userPayloadSchema } from './session-mapper';

test('maps the login payload to a Session', () => {
  const s = toSession(userPayloadSchema.parse(fixture));
  expect(s.token).toBe('FIXTURE_TOKEN');
  expect(typeof s.userId).toBe('number');
  expect(typeof s.enterpriseId).toBe('number');
  expect(s.permissions.PURCHASE).toEqual(
    expect.objectContaining({ view: expect.any(Boolean), approve: expect.any(Boolean) }),
  );
  expect(Object.values(s.counts).every((n) => typeof n === 'number')).toBe(true);
});

test('user_settings payload without token keeps the previous token', () => {
  const prev = toSession(userPayloadSchema.parse(fixture));
  const { token: _t, ...noToken } = fixture as Record<string, unknown>;
  const next = toSession(userPayloadSchema.parse({ ...noToken, icd_enabled: true, oa_pending_count: '4' }), prev);
  expect(next.token).toBe('FIXTURE_TOKEN');
  expect(next.icd.enabled).toBe(true);
  expect(next.counts.oa).toBe(4);
});

test('display helpers', () => {
  const user = { id: 1, username: 'u', email: 'e', firstName: 'Asha', lastName: 'Rao', isSuper: false, enterpriseName: 'X' };
  expect(displayName(user)).toBe('Asha Rao');
  expect(initials(user)).toBe('AR');
  expect(initials({ ...user, firstName: '', lastName: '' })).toBe('U');
});
```

`src/core/auth/idle-timeout.test.ts`:
```ts
/** @author Lokesh */
import { isIdleExpired, markActive, resetIdle } from './idle-timeout';

test('expires after the configured idle minutes', () => {
  const t0 = 1_000_000;
  jest.spyOn(Date, 'now').mockReturnValue(t0);
  resetIdle();
  markActive();
  expect(isIdleExpired(t0 + 29 * 60_000)).toBe(false);
  expect(isIdleExpired(t0 + 31 * 60_000)).toBe(true);
});
```

`src/core/auth/session-store.test.ts`:
```ts
/** @author Lokesh */
import fixture from '../../../__fixtures__/login_api.json';
import { toSession, userPayloadSchema } from './session-mapper';
import { useSessionStore } from './session-store';

const session = () => toSession(userPayloadSchema.parse(fixture));

test('signIn persists and hydrate restores', async () => {
  await useSessionStore.getState().signIn(session());
  useSessionStore.setState({ status: 'loading', session: null });
  await useSessionStore.getState().hydrate();
  expect(useSessionStore.getState().status).toBe('signedIn');
  expect(useSessionStore.getState().session?.token).toBe('FIXTURE_TOKEN');
});

test('signOut clears storage and keeps the notice; repeated signOut is harmless', async () => {
  await useSessionStore.getState().signIn(session());
  await Promise.all([useSessionStore.getState().signOut('Expired'), useSessionStore.getState().signOut('Expired')]);
  expect(useSessionStore.getState()).toMatchObject({ status: 'signedOut', session: null, notice: 'Expired' });
  await useSessionStore.getState().hydrate();
  expect(useSessionStore.getState().status).toBe('signedOut');
});
```

`src/core/permissions/permissions.test.ts`:
```ts
/** @author Lokesh */
import fixture from '../../../__fixtures__/login_api.json';
import { toSession, userPayloadSchema } from '../auth/session-mapper';
import { can } from './permissions';

const base = toSession(userPayloadSchema.parse(fixture));
const deny = { view: false, edit: false, delete: false, approve: false, alert: false };

test('reads the permission bit', () => {
  const s = { ...base, user: { ...base.user, isSuper: false }, permissions: { SALES: { ...deny, view: true } } };
  expect(can(s, 'SALES', 'view')).toBe(true);
  expect(can(s, 'SALES', 'approve')).toBe(false);
  expect(can(s, 'PURCHASE', 'view')).toBe(false);
});

test('super users pass everything; ICD also needs icd_enabled', () => {
  const su = { ...base, user: { ...base.user, isSuper: true }, permissions: {} };
  expect(can(su, 'PURCHASE', 'approve')).toBe(true);
  expect(can({ ...su, icd: { ...su.icd, enabled: false } }, 'ICD', 'view')).toBe(false);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest src/core/auth src/core/permissions`
Expected: FAIL — modules not found. (Add `"resolveJsonModule": true` to tsconfig `compilerOptions` if TS complains about the JSON import.)

- [ ] **Step 4: Implement types and mapper**

`src/core/auth/types.ts`:
```ts
/** @author Lokesh */
export type PermissionAction = 'view' | 'edit' | 'delete' | 'approve' | 'alert';
export type Permission = Record<PermissionAction, boolean>;
export type PermissionCode = 'ACCOUNTS' | 'ICD' | 'PURCHASE' | 'SALES' | 'STORES' | 'MASTERS' | 'EXPENSES';

export type PendingCounts = { po: number; invoice: number; oa: number; grn: number; icd: number; rate: number; voucher: number };

export type SessionUser = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuper: boolean;
  enterpriseName: string;
};

export type Subscription = {
  plan: string | null;
  expiredOn: string | null;
  isExpired: boolean;
  showExpiry: boolean;
  canRequestExtension: boolean;
  extensionRequestedOn: string | null;
  enterpriseActive: boolean;
};

export type Session = {
  token: string;
  userId: number;
  enterpriseId: number;
  user: SessionUser;
  permissions: Record<string, Permission>;
  fyStartDay: string | null;
  icd: { enabled: boolean; ignoreCreditNote: boolean; autoGenVoucher: boolean };
  counts: PendingCounts;
  subscription: Subscription;
  serverDate: string | null;
  refreshedAt: number;
};
```

`src/core/auth/session-mapper.ts`:
```ts
/** @author Lokesh */
import { z } from 'zod';

import { zBool, zNum, zRecordOf, zStr, zStrOrNull } from '../api/schema';
import type { Session, SessionUser } from './types';

const permissionSchema = z.looseObject({ view: zBool, edit: zBool, delete: zBool, approve: zBool, alert: zBool });

/** Shared by user/json/login_api/ and auth/json/user_settings/. */
export const userPayloadSchema = z.looseObject({
  id: zNum,
  username: zStr,
  user_email: zStr,
  first_name: zStr,
  last_name: zStr,
  is_super: zBool,
  enterprise_id: zNum,
  enterprise_name: zStr,
  token: zStrOrNull.optional(),
  permissions: zRecordOf(permissionSchema),
  fy_start_day: zStrOrNull.optional(),
  icd_enabled: zBool.optional(),
  icd_ignore_credit_note: zBool.optional(),
  icd_auto_gen_voucher: zBool.optional(),
  pending_po_count_notification: zNum.optional(),
  invoice_pending_count: zNum.optional(),
  oa_pending_count: zNum.optional(),
  receipt_save_count: zNum.optional(),
  icd_checked_count: zNum.optional(),
  master_material_price: zNum.optional(),
  pending_voucher_count: zNum.optional(),
  plan: zStrOrNull.optional(),
  expired_on: zStrOrNull.optional(),
  is_expired: zBool.optional(),
  shall_enable_expiry_timer: zBool.optional(),
  shall_enable_request_extension: zBool.optional(),
  extension_requested_on: zStrOrNull.optional(),
  is_enterprise_active: zBool.optional(),
  server_date: zStrOrNull.optional(),
});
export type UserPayload = z.infer<typeof userPayloadSchema>;

export function toSession(p: UserPayload, previous?: Session | null): Session {
  const token = p.token ?? previous?.token;
  if (!token) throw new Error('Login response did not include a token');
  const pick = <K extends keyof UserPayload>(k: K, fallback: NonNullable<UserPayload[K]>) =>
    (p[k] ?? fallback) as NonNullable<UserPayload[K]>;
  return {
    token,
    userId: p.id,
    enterpriseId: p.enterprise_id,
    user: {
      id: p.id,
      username: p.username,
      email: p.user_email,
      firstName: p.first_name,
      lastName: p.last_name,
      isSuper: p.is_super,
      enterpriseName: p.enterprise_name,
    },
    permissions: Object.fromEntries(
      Object.entries(p.permissions).map(([k, v]) => [k, { view: v.view, edit: v.edit, delete: v.delete, approve: v.approve, alert: v.alert }]),
    ),
    fyStartDay: p.fy_start_day ?? previous?.fyStartDay ?? null,
    icd: {
      enabled: p.icd_enabled ?? previous?.icd.enabled ?? false,
      ignoreCreditNote: p.icd_ignore_credit_note ?? previous?.icd.ignoreCreditNote ?? false,
      autoGenVoucher: p.icd_auto_gen_voucher ?? previous?.icd.autoGenVoucher ?? false,
    },
    counts: {
      po: pick('pending_po_count_notification', 0),
      invoice: pick('invoice_pending_count', 0),
      oa: pick('oa_pending_count', 0),
      grn: pick('receipt_save_count', 0),
      icd: pick('icd_checked_count', 0),
      rate: pick('master_material_price', 0),
      voucher: pick('pending_voucher_count', 0),
    },
    subscription: {
      plan: p.plan ?? null,
      expiredOn: p.expired_on ?? null,
      isExpired: p.is_expired ?? false,
      showExpiry: p.shall_enable_expiry_timer ?? false,
      canRequestExtension: p.shall_enable_request_extension ?? false,
      extensionRequestedOn: p.extension_requested_on ?? null,
      enterpriseActive: p.is_enterprise_active ?? true,
    },
    serverDate: p.server_date ?? null,
    refreshedAt: Date.now(),
  };
}

export function displayName(user: SessionUser | null | undefined): string {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email;
}

export function initials(user: SessionUser | null | undefined): string {
  return displayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
```

- [ ] **Step 5: Implement idle timeout and session store**

`src/core/auth/idle-timeout.ts`:
```ts
/** @author Lokesh */
import { env } from '../config/env';
import { kv } from '../storage/kv';

// xserp never expires the mobile token, so the app enforces its own idle sign-out. Only touches count.
const KEY = 'xserp.lastActive';
export const IDLE_LIMIT_MS = env.idleTimeoutMinutes * 60_000;
export const IDLE_NOTICE = `You were signed out after ${env.idleTimeoutMinutes} minutes of inactivity.`;

let lastActive = Number(kv.getString(KEY)) || Date.now();
let lastPersisted = 0;

export function markActive() {
  lastActive = Date.now();
  if (lastActive - lastPersisted > 60_000) {
    lastPersisted = lastActive;
    kv.setString(KEY, String(lastActive));
  }
}

export function resetIdle() {
  lastPersisted = 0;
  lastActive = Date.now();
  kv.setString(KEY, String(lastActive));
}

export const isIdleExpired = (now = Date.now()) => now - lastActive > IDLE_LIMIT_MS;
```

`src/core/auth/session-store.ts`:
```ts
/** @author Lokesh */
import { create } from 'zustand';

import { kv } from '../storage/kv';
import { secure } from '../storage/secure';
import { IDLE_NOTICE, isIdleExpired, resetIdle } from './idle-timeout';
import type { Session } from './types';

// Credentials go to SecureStore (small); the rest of the session (permissions etc.) to kv to stay under 2 KB.
const CREDENTIALS_KEY = 'xserp.credentials.v1';
const PROFILE_KEY = 'xserp.profile.v1';

type Credentials = Pick<Session, 'token' | 'userId' | 'enterpriseId'>;

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  session: Session | null;
  notice: string | null;
  hydrate: () => Promise<void>;
  signIn: (s: Session) => Promise<void>;
  update: (s: Session) => Promise<void>;
  signOut: (notice?: string | null) => Promise<void>;
  clearNotice: () => void;
};

async function persist(s: Session) {
  const { token, userId, enterpriseId, ...profile } = s;
  await secure.set(CREDENTIALS_KEY, JSON.stringify({ token, userId, enterpriseId } satisfies Credentials));
  kv.setJSON(PROFILE_KEY, profile);
}

async function wipe() {
  await secure.remove(CREDENTIALS_KEY);
  kv.remove(PROFILE_KEY);
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'loading',
  session: null,
  notice: null,

  hydrate: async () => {
    try {
      const raw = await secure.get(CREDENTIALS_KEY);
      const profile = kv.getJSON<Omit<Session, keyof Credentials>>(PROFILE_KEY);
      if (!raw || !profile) return set({ status: 'signedOut', session: null });
      if (isIdleExpired()) {
        await wipe();
        return set({ status: 'signedOut', session: null, notice: IDLE_NOTICE });
      }
      const creds = JSON.parse(raw) as Credentials;
      set({ status: 'signedIn', session: { ...profile, ...creds } });
    } catch {
      await wipe();
      set({ status: 'signedOut', session: null });
    }
  },

  signIn: async (s) => {
    resetIdle();
    await persist(s);
    set({ status: 'signedIn', session: s, notice: null });
  },

  update: async (s) => {
    if (get().status !== 'signedIn') return;
    await persist(s);
    set({ session: s });
  },

  signOut: async (notice = null) => {
    // Idempotent: several failing requests may report the same expiry.
    if (get().status === 'signedOut') return set({ notice: notice ?? get().notice });
    set({ status: 'signedOut', session: null, notice });
    await wipe();
  },

  clearNotice: () => set({ notice: null }),
}));

/** For screens under the auth guard only. */
export function useSession(): Session {
  const s = useSessionStore((st) => st.session);
  if (!s) throw new Error('useSession called while signed out');
  return s;
}
```

- [ ] **Step 6: Implement auth API, idle hook, bootstrap, permissions**

`src/core/auth/auth-api.ts`:
```ts
/** @author Lokesh */
import { z } from 'zod';

import { post, postOk } from '../api/client';
import { ApiError } from '../api/errors';
import { zBool, zStr } from '../api/schema';
import { toSession, userPayloadSchema } from './session-mapper';
import type { Session } from './types';

export async function login(email: string, password: string): Promise<Session> {
  const payload = await post('user/json/login_api/', { user_email: email.trim(), password, fcm_id: '' }, { schema: userPayloadSchema, auth: false });
  return toSession(payload);
}

/** Re-reads permissions, ICD flags, counts and subscription. Keeps the existing token. */
export async function refreshSession(current: Session): Promise<Session> {
  const payload = await post('auth/json/user_settings/', {}, { schema: userPayloadSchema });
  return toSession(payload, current);
}

export async function logout(session: Session): Promise<void> {
  // Best effort: the server only unregisters the push id.
  await postOk(
    'user/json/logout_api/',
    { user_email: session.user.email, user_id: session.userId, enterprise_id: session.enterpriseId, token: session.token, fcm_id: '' },
    { auth: false, timeoutMs: 8_000 },
  ).catch(() => undefined);
}

export async function forgotPassword(email: string): Promise<string> {
  const res = await postOk('auth/json/forget_password/', { user_email: email.trim() }, { auth: false });
  return res.custom_message ?? 'We have emailed you a link to reset your password.';
}

export async function changePassword(input: { email: string; oldPassword?: string; newPassword: string; cpToken?: string }): Promise<void> {
  try {
    await postOk(
      'auth/json/change_password/',
      { user_email: input.email, old_password: input.oldPassword ?? '', new_password: input.newPassword, cp_token: input.cpToken ?? '' },
      { auth: false },
    );
  } catch (e) {
    if (e instanceof ApiError && /old password was wrong/i.test(e.message)) throw new ApiError('server', 'Your current password is incorrect.');
    throw e;
  }
}

const versionSchema = z.looseObject({ version: zStr, force_update: zBool });

export async function fetchVersionInfo(): Promise<{ version: string; forceUpdate: boolean }> {
  const v = await post('commons/version_info/', {}, { schema: versionSchema, auth: false, timeoutMs: 8_000 });
  return { version: v.version, forceUpdate: v.force_update };
}

export async function requestExtension(reason: string): Promise<void> {
  await postOk('admin/mail_request/', { reason });
}
```

`src/core/auth/use-idle-sign-out.ts`:
```ts
/** @author Lokesh */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { IDLE_NOTICE, isIdleExpired } from './idle-timeout';
import { useSessionStore } from './session-store';

/** Checks every 30 s and on foreground; signs out with a notice once the idle limit passes. */
export function useIdleSignOut() {
  const signedIn = useSessionStore((s) => s.status === 'signedIn');
  useEffect(() => {
    if (!signedIn) return;
    const check = () => {
      if (isIdleExpired()) void useSessionStore.getState().signOut(IDLE_NOTICE);
    };
    const timer = setInterval(check, 30_000);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [signedIn]);
}
```

`src/core/auth/bootstrap.ts`:
```ts
/** @author Lokesh */
import { configureApi } from '../api/client';
import { useSessionStore } from './session-store';

export const SESSION_EXPIRED_NOTICE = 'Your session has ended. Please sign in again.';

/** Call once at module load of the root layout. */
export function bootstrapAuth() {
  configureApi({
    getAuth: () => {
      const s = useSessionStore.getState().session;
      return s ? { token: s.token, userId: s.userId, enterpriseId: s.enterpriseId } : null;
    },
    onSessionExpired: () => void useSessionStore.getState().signOut(SESSION_EXPIRED_NOTICE),
  });
}
```

`src/core/auth/index.ts`:
```ts
/** @author Lokesh */
export * from './types';
export { displayName, initials, toSession, userPayloadSchema } from './session-mapper';
export { useSessionStore, useSession } from './session-store';
export { markActive, isIdleExpired, IDLE_NOTICE } from './idle-timeout';
export { useIdleSignOut } from './use-idle-sign-out';
export { bootstrapAuth, SESSION_EXPIRED_NOTICE } from './bootstrap';
export * from './auth-api';
```

`src/core/permissions/permissions.ts`:
```ts
/** @author Lokesh */
import type { PermissionAction, PermissionCode, Session } from '../auth/types';
import { useSessionStore } from '../auth/session-store';

export function can(session: Session | null | undefined, code: PermissionCode, action: PermissionAction): boolean {
  if (!session) return false;
  if (code === 'ICD' && !session.icd.enabled) return false;
  if (session.user.isSuper) return true;
  return session.permissions[code]?.[action] === true;
}

export function useCan(code: PermissionCode, action: PermissionAction): boolean {
  return useSessionStore((s) => can(s.session, code, action));
}
```

`src/core/permissions/index.ts`:
```ts
/** @author Lokesh */
export { can, useCan } from './permissions';
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx jest src/core && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(core): add session store, auth API, idle sign-out and permissions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Query client, auto-refetch managers, focus refetch

**Files:**
- Create: `src/core/query/query-client.ts`, `src/core/query/managers.ts`, `src/core/query/use-focus-refetch.ts`, `src/core/query/index.ts`
- Test: `src/core/query/query-client.test.ts`

**Interfaces:**
- Consumes: `ApiError` (Task 3).
- Produces:
  - `queryClient: QueryClient` (singleton), `shouldRetry(failureCount, error): boolean`
  - `POLL_MS = 60_000`, `STALE_MS = 30_000`
  - `setupQueryManagers(): () => void` — wires AppState → `focusManager`, NetInfo → `onlineManager`
  - `useFocusRefetch(refetch: () => unknown): void` — refetches when a screen regains focus (skips first focus)
  - `useRefreshAll(queries: Array<{ refetch: () => Promise<unknown> }>): () => Promise<void>` — for PullToSync

- [ ] **Step 1: Write the failing test**

`src/core/query/query-client.test.ts`:
```ts
/** @author Lokesh */
import { ApiError } from '../api/errors';
import { shouldRetry } from './query-client';

test('never retries session, validation, csrf or server errors', () => {
  for (const kind of ['session', 'validation', 'csrf', 'server'] as const) {
    expect(shouldRetry(0, new ApiError(kind, 'x'))).toBe(false);
  }
});

test('retries transient network failures twice', () => {
  const e = new ApiError('network', 'x');
  expect(shouldRetry(0, e)).toBe(true);
  expect(shouldRetry(1, e)).toBe(true);
  expect(shouldRetry(2, e)).toBe(false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/core/query` → FAIL (module not found).

- [ ] **Step 3: Implement**

`src/core/query/query-client.ts`:
```ts
/** @author Lokesh */
import { QueryClient } from '@tanstack/react-query';

import { isApiError } from '../api/errors';

export const STALE_MS = 30_000;
export const POLL_MS = 60_000;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.kind !== 'network' && error.kind !== 'timeout') return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_MS,
      gcTime: 30 * 60_000,
      retry: shouldRetry,
      refetchOnWindowFocus: true, // driven by AppState via focusManager
      refetchOnReconnect: true, // driven by NetInfo via onlineManager
    },
    mutations: { retry: false },
  },
});
```

`src/core/query/managers.ts`:
```ts
/** @author Lokesh */
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

/** Makes "window focus" mean "app foregrounded" and "online" mean NetInfo connectivity. */
export function setupQueryManagers(): () => void {
  onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(!!s.isConnected)));
  const sub = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  });
  return () => sub.remove();
}
```

`src/core/query/use-focus-refetch.ts`:
```ts
/** @author Lokesh */
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/** Navigation focus is not window focus: refetch stale data when the user comes back to a screen. */
export function useFocusRefetch(refetch: () => unknown) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
}

/** Combines several queries into one PullToSync handler. */
export function useRefreshAll(queries: { refetch: () => Promise<unknown> }[]) {
  return useCallback(() => Promise.all(queries.map((q) => q.refetch())).then(() => undefined), [queries]);
}
```

`src/core/query/index.ts`:
```ts
/** @author Lokesh */
export { queryClient, shouldRetry, POLL_MS, STALE_MS } from './query-client';
export { setupQueryManagers } from './managers';
export { useFocusRefetch, useRefreshAll } from './use-focus-refetch';
```

- [ ] **Step 4: Run tests** → `npx jest src/core/query` PASS; `npm run typecheck` 0 errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(core): add query client with auto-refetch on focus, foreground and reconnect

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Design system — primitives, feedback and state components

**Files:**
- Create: `src/ui/text.tsx`, `src/ui/pressable-scale.tsx`, `src/ui/button.tsx`, `src/ui/input.tsx`, `src/ui/card.tsx`, `src/ui/status-pill.tsx`, `src/ui/badge.tsx`, `src/ui/skeleton.tsx`, `src/ui/state-view.tsx`, `src/ui/query-state.tsx`, `src/ui/toast.tsx`, `src/ui/key-value.tsx`, `src/ui/stat-card.tsx`, `src/ui/section.tsx`, `src/ui/glass.tsx`, `src/ui/index.ts`
- Modify: `jest.setup.ts` (reanimated mock)
- Test: `src/ui/ui.test.tsx`

**Interfaces:**
- Consumes: theme (Task 2), `tapFeedback` (Task 3), `errorMessage`/`isApiError` (Task 3).
- Produces (all exported from `@/ui`):
  - `Text({ variant?: 'display'|'title'|'heading'|'body'|'label'|'caption'|'overline'; color?: string; weight?: keyof Fonts; ...TextProps })`
  - `PressableScale({ onPress?: (e) => void | Promise<unknown>; scaleTo?; haptic?; style?; disabled?; children })`
  - `Button({ title; onPress: () => void | Promise<unknown>; variant?: 'primary'|'ghost'|'danger'|'success'; icon?: IconName; loading?; disabled?; size?: 'md'|'sm'; style? })`
  - `type IconName = keyof typeof Ionicons.glyphMap`
  - `Input` (forwardRef `TextInput`): `{ label; icon: IconName; secure?; error?: string | null; ...TextInputProps }`
  - `Card({ children; style?; onPress?; tint?: string })` — `tint` draws Despack's 4px left bar
  - `StatusPill({ label: string; tone: Tone })`
  - `Badge({ count: number; tone?: 'danger'|'primary'; style? })` — renders nothing for 0, "99+" over 99
  - `Bone({ style })`, `CardSkeleton()`, `ListSkeleton({ rows?: number })`
  - `StateView({ icon: IconName; title: string; message?: string; action?: { label: string; onPress: () => void } })`
  - `QueryState<T>({ query: UseQueryResult<T>; isEmpty?: (d: T) => boolean; empty?: { icon?; title; message? }; skeleton?: ReactNode; children: (data: T) => ReactNode })`
  - `toast.show({ message: string; tone?: 'success'|'danger'|'info'; action?: { label: string; onPress: () => void }; durationMs?: number }): string`, `toast.dismiss(id)`, `<ToastHost />`
  - `KeyValue({ label: string; value?: string | number | null; mono?: boolean })`
  - `StatCard({ label: string; value: string; icon?: IconName; tone?: Tone; caption?: string; onPress? })`
  - `Section({ title: string; action?: { label: string; onPress: () => void }; children })`
  - `Glass`, `GlassIconButton({ icon; onPress; size?; badge?: number })`

- [ ] **Step 1: Add the reanimated test mock**

Append to `jest.setup.ts`:
```ts
require('react-native-reanimated').setUpTests();
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('expo-glass-effect', () => {
  const { View } = require('react-native');
  return { GlassView: View, isLiquidGlassAvailable: () => false, isGlassEffectAPIAvailable: () => false };
});
```

- [ ] **Step 2: Write the failing test**

`src/ui/ui.test.tsx`:
```tsx
/** @author Lokesh */
import type { UseQueryResult } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ApiError } from '@/core/api';
import { ThemeProvider } from '@/core/theme';

import { Badge, Button, QueryState, StatusPill, Text } from './index';

const wrap = (ui: ReactNode) => render(<ThemeProvider initialPreference="light">{ui}</ThemeProvider>);
const q = <T,>(p: Partial<UseQueryResult<T>>) => ({ refetch: jest.fn(), ...p }) as unknown as UseQueryResult<T>;

test('overline text is upper-cased in the string itself', () => {
  wrap(<Text variant="overline">documents</Text>);
  expect(screen.getByText('DOCUMENTS')).toBeTruthy();
});

test('Badge hides zero and caps at 99+', () => {
  const { rerender } = wrap(<Badge count={0} />);
  expect(screen.queryByText('0')).toBeNull();
  rerender(<ThemeProvider initialPreference="light"><Badge count={120} /></ThemeProvider>);
  expect(screen.getByText('99+')).toBeTruthy();
});

test('StatusPill shows its label', () => {
  wrap(<StatusPill label="Approved" tone="success" />);
  expect(screen.getByText('Approved')).toBeTruthy();
});

test('Button calls onPress', () => {
  const onPress = jest.fn();
  wrap(<Button title="Approve" onPress={onPress} />);
  fireEvent.press(screen.getByText('Approve'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('QueryState renders error with retry, empty state, and data', () => {
  const refetch = jest.fn();
  const { rerender } = wrap(
    <QueryState query={q<string[]>({ status: 'error', error: new ApiError('network', 'x'), refetch })}>{() => <Text>data</Text>}</QueryState>,
  );
  expect(screen.getByText('Unable to reach the server. Check your connection.')).toBeTruthy();
  fireEvent.press(screen.getByText('Try again'));
  expect(refetch).toHaveBeenCalled();

  rerender(
    <ThemeProvider initialPreference="light">
      <QueryState query={q<string[]>({ status: 'success', data: [] })} isEmpty={(d) => d.length === 0} empty={{ title: 'All caught up' }}>
        {() => <Text>data</Text>}
      </QueryState>
    </ThemeProvider>,
  );
  expect(screen.getByText('All caught up')).toBeTruthy();

  rerender(
    <ThemeProvider initialPreference="light">
      <QueryState query={q<string[]>({ status: 'success', data: ['a'] })}>{(d) => <Text>{d.join(',')}</Text>}</QueryState>
    </ThemeProvider>,
  );
  expect(screen.getByText('a')).toBeTruthy();
});
```

- [ ] **Step 3: Run to verify it fails** → `npx jest src/ui` FAIL (module not found).

- [ ] **Step 4: Implement primitives**

`src/ui/text.tsx`:
```tsx
/** @author Lokesh */
import { Text as RNText, type TextProps } from 'react-native';

import { useTheme, type Fonts } from '@/core/theme';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'overline';

const variants: Record<TextVariant, { fontSize: number; lineHeight: number; weight: keyof Fonts; letterSpacing?: number }> = {
  display: { fontSize: 30, lineHeight: 36, weight: 'extrabold', letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, weight: 'bold', letterSpacing: -0.3 },
  heading: { fontSize: 16, lineHeight: 22, weight: 'bold', letterSpacing: -0.1 },
  body: { fontSize: 14, lineHeight: 20, weight: 'medium' },
  label: { fontSize: 13, lineHeight: 18, weight: 'semibold' },
  caption: { fontSize: 12, lineHeight: 16, weight: 'medium' },
  overline: { fontSize: 11, lineHeight: 14, weight: 'bold', letterSpacing: 1.2 },
};

type Props = TextProps & { variant?: TextVariant; color?: string; weight?: keyof Fonts };

export function Text({ variant = 'body', color, weight, style, children, ...rest }: Props) {
  const t = useTheme();
  const v = variants[variant];
  return (
    <RNText
      {...rest}
      style={[
        { fontSize: v.fontSize, lineHeight: v.lineHeight, letterSpacing: v.letterSpacing, color: color ?? t.colors.text, fontFamily: t.fonts[weight ?? v.weight] },
        style,
      ]}>
      {variant === 'overline' ? upper(children) : children}
    </RNText>
  );
}

// Android measures `textTransform: 'uppercase'` at lowercase width and clips, so upper-case the string.
function upper(node: TextProps['children']): TextProps['children'] {
  if (typeof node === 'string') return node.toUpperCase();
  if (Array.isArray(node)) return node.map((n: unknown) => (typeof n === 'string' ? n.toUpperCase() : n)) as TextProps['children'];
  return node;
}
```

`src/ui/pressable-scale.tsx`: copy `despack-rn/src/components/pressable-scale.tsx` verbatim, changing only the two imports to:
```tsx
import { tapFeedback } from '@/core/utils';
import { easeOut, springs } from '@/core/theme';
```

`src/ui/button.tsx`:
```tsx
/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

export type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  title: string;
  /** Return a promise to show a spinner and stay disabled until it settles. */
  onPress: () => void | Promise<unknown>;
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', icon, loading: loadingProp, disabled, size = 'md', style }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [running, setRunning] = useState(false);
  const loading = loadingProp || running;
  const inactive = disabled || loading;
  const filled = variant === 'primary' || variant === 'success';
  const fg = filled ? t.colors.white : variant === 'danger' ? t.colors.danger : t.colors.onPrimarySoft;

  const handlePress = () => {
    const result = onPress();
    if (result instanceof Promise) {
      setRunning(true);
      return result.finally(() => setRunning(false));
    }
  };

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg} />}
          <Text variant={size === 'sm' ? 'label' : 'heading'} color={fg}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={handlePress}
      disabled={inactive}
      scaleTo={0.98}
      style={[styles.base, size === 'sm' && styles.sm, !filled && styles[variant === 'danger' ? 'danger' : 'ghost'], inactive && styles.inactive, style]}>
      {filled ? (
        <LinearGradient colors={variant === 'success' ? t.gradients.success : t.gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
          {content}
        </LinearGradient>
      ) : (
        <View style={styles.fill}>{content}</View>
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: { height: 56, borderRadius: t.radius.md, overflow: 'hidden', ...t.shadow.button },
  sm: { height: 42, borderRadius: t.radius.sm },
  ghost: { backgroundColor: t.colors.primarySoft, shadowOpacity: 0, elevation: 0 },
  danger: { backgroundColor: t.colors.dangerSoft, shadowOpacity: 0, elevation: 0 },
  inactive: { opacity: 0.7 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
}));
```

`src/ui/input.tsx`: port `despack-rn/src/components/input.tsx` with these exact changes: (1) colours come from `const t = useTheme()` inside the component (the `useAnimatedStyle` closure reads `t.colors.border`, `t.colors.accent`, `t.colors.fillSubtle`, `t.colors.surface`); (2) styles via `makeStyles`; (3) new optional `error?: string | null` prop rendered below the box as `<Text variant="caption" color={t.colors.danger}>{error}</Text>` and, when set, the resting border colour is `t.colors.danger`; (4) imports `tapFeedback` from `@/core/utils`, `IconName` from `./button`.
```tsx
/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/core/theme';
import { tapFeedback } from '@/core/utils';

import type { IconName } from './button';
import { Text } from './text';

type Props = TextInputProps & { label: string; icon: IconName; secure?: boolean; error?: string | null };

export const Input = forwardRef<TextInput, Props>(function Input({ label, icon, secure, error, onFocus, onBlur, ...rest }, ref) {
  const t = useTheme();
  const styles = useStyles();
  const focus = useSharedValue(0);
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  const rest0 = error ? t.colors.danger : t.colors.border;
  const { accent, fillSubtle, surface } = t.colors;

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [rest0, accent]),
    backgroundColor: interpolateColor(focus.get(), [0, 1], [fillSubtle, surface]),
    shadowOpacity: focus.get() * 0.16,
  }));

  return (
    <View style={styles.root}>
      <Text variant="label" color={t.colors.textMuted}>
        {label}
      </Text>
      <Animated.View style={[styles.box, boxStyle]}>
        <Ionicons name={icon} size={18} color={focused ? t.colors.onPrimarySoft : t.colors.textFaint} />
        <TextInput
          ref={ref}
          {...rest}
          secureTextEntry={secure && hidden}
          placeholderTextColor={t.colors.textFaint}
          style={styles.input}
          onFocus={(e) => {
            setFocused(true);
            focus.set(withTiming(1, { duration: 220 }));
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focus.set(withTiming(0, { duration: 220 }));
            onBlur?.(e);
          }}
        />
        {secure && (
          <Pressable
            hitSlop={12}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => {
              tapFeedback();
              setHidden((h) => !h);
            }}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={t.colors.textMuted} />
          </Pressable>
        )}
      </Animated.View>
      {!!error && (
        <Text variant="caption" color={t.colors.danger}>
          {error}
        </Text>
      )}
    </View>
  );
});

const useStyles = makeStyles((t) => ({
  root: { gap: 8 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 54,
    paddingHorizontal: 16,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    shadowColor: t.colors.accent,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  input: { flex: 1, fontFamily: t.fonts.semibold, fontSize: 15, color: t.colors.text, paddingVertical: 6, minHeight: 54 },
}));
```

`src/ui/card.tsx`:
```tsx
/** @author Lokesh */
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/core/theme';

import { PressableScale } from './pressable-scale';

type Props = { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tint?: string };

export function Card({ children, style, onPress, tint }: Props) {
  const styles = useStyles();
  const body = (
    <>
      {tint && <View style={[styles.bar, { backgroundColor: tint }]} />}
      {children}
    </>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.card, style]} scaleTo={0.985}>
        {body}
      </PressableScale>
    );
  }
  return <View style={[styles.card, style]}>{body}</View>;
}

const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: t.space.lg, overflow: 'hidden', ...t.shadow.card },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
}));
```

`src/ui/status-pill.tsx`:
```tsx
/** @author Lokesh */
import { View } from 'react-native';

import { makeStyles, toneColors, useTheme, type Tone } from '@/core/theme';

import { Text } from './text';

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const t = useTheme();
  const styles = useStyles();
  const c = toneColors(t, tone);
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <Text variant="caption" weight="bold" color={c.fg}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: t.radius.pill, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
}));
```

`src/ui/badge.tsx`:
```tsx
/** @author Lokesh */
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Text } from './text';

export function Badge({ count, tone = 'danger', style }: { count: number; tone?: 'danger' | 'primary'; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const styles = useStyles();
  if (!count || count < 1) return null;
  return (
    <View style={[styles.badge, { backgroundColor: tone === 'danger' ? t.colors.danger : t.colors.primary }, style]}>
      <Text variant="caption" weight="extrabold" color={t.colors.white} style={styles.text}>
        {count > 99 ? '99+' : String(count)}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.colors.surface },
  text: { fontSize: 10, lineHeight: 13 },
}));
```

`src/ui/skeleton.tsx`: port `despack-rn/src/components/skeleton.tsx` with theme via `useTheme`/`makeStyles`; rename `DocCardSkeleton` → `CardSkeleton`; export `Bone`; add:
```tsx
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}
```
(The shimmer gradient colours become `['transparent', t.colors.shimmer, 'transparent']`; `bone` uses `t.colors.bone`; `card` uses `t.colors.surface`, `t.radius.lg`, `t.shadow.card`.)

`src/ui/state-view.tsx`:
```tsx
/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Button, type IconName } from './button';
import { Text } from './text';

type Props = { icon: IconName; title: string; message?: string; action?: { label: string; onPress: () => void } };

export function StateView({ icon, title, message, action }: Props) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <View style={styles.iconTile}>
        <Ionicons name={icon} size={28} color={t.colors.onPrimarySoft} />
      </View>
      <Text variant="heading" style={styles.center}>
        {title}
      </Text>
      {!!message && (
        <Text variant="body" color={t.colors.textMuted} style={styles.center}>
          {message}
        </Text>
      )}
      {action && <Button title={action.label} variant="ghost" size="sm" onPress={action.onPress} style={styles.action} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 24, alignItems: 'center', gap: 10, ...t.shadow.card },
  iconTile: { width: 60, height: 60, borderRadius: t.radius.lg, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  center: { textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: 6 },
}));
```

`src/ui/query-state.tsx`:
```tsx
/** @author Lokesh */
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { errorMessage, isApiError } from '@/core/api';

import type { IconName } from './button';
import { ListSkeleton } from './skeleton';
import { StateView } from './state-view';

type Props<T> = {
  query: UseQueryResult<T>;
  isEmpty?: (data: T) => boolean;
  empty?: { icon?: IconName; title: string; message?: string };
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
};

/** Loading → skeleton, error → retry card, empty → friendly state, else children(data). */
export function QueryState<T>({ query, isEmpty, empty, skeleton, children }: Props<T>) {
  if (query.status === 'pending') return <>{skeleton ?? <ListSkeleton rows={4} />}</>;
  if (query.status === 'error') {
    const offline = isApiError(query.error) && query.error.kind === 'network';
    return (
      <StateView
        icon={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
        title={offline ? 'You are offline' : "Couldn't load this"}
        message={errorMessage(query.error)}
        action={{ label: 'Try again', onPress: () => void query.refetch() }}
      />
    );
  }
  if (isEmpty?.(query.data)) {
    return <StateView icon={empty?.icon ?? 'checkmark-done-outline'} title={empty?.title ?? 'Nothing here yet'} message={empty?.message} />;
  }
  return <>{children(query.data)}</>;
}
```

`src/ui/toast.tsx`:
```tsx
/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { enter, fadeOut, makeStyles, useTheme } from '@/core/theme';

import { Text } from './text';

type ToastInput = { message: string; tone?: 'success' | 'danger' | 'info'; action?: { label: string; onPress: () => void }; durationMs?: number };
type ToastItem = ToastInput & { id: string };

const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let seq = 0;

export const toast = {
  show(input: ToastInput): string {
    const id = String(++seq);
    useToasts.setState((s) => ({ items: [...s.items.slice(-2), { ...input, id }] }));
    return id;
  },
  dismiss(id: string) {
    useToasts.setState((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },
};

function ToastRow({ item }: { item: ToastItem }) {
  const t = useTheme();
  const styles = useStyles();
  useEffect(() => {
    const timer = setTimeout(() => toast.dismiss(item.id), item.durationMs ?? 3500);
    return () => clearTimeout(timer);
  }, [item.id, item.durationMs]);
  const bg = item.tone === 'danger' ? t.colors.danger : item.tone === 'success' ? t.colors.success : t.colors.navy800;
  const icon = item.tone === 'danger' ? 'alert-circle' : item.tone === 'success' ? 'checkmark-circle' : 'information-circle';
  return (
    <Animated.View entering={enter()} exiting={fadeOut} style={[styles.toast, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={t.colors.white} />
      <Text variant="label" color={t.colors.white} style={styles.message}>
        {item.message}
      </Text>
      {item.action && (
        <Pressable
          hitSlop={10}
          onPress={() => {
            item.action?.onPress();
            toast.dismiss(item.id);
          }}>
          <Text variant="label" weight="extrabold" color={t.colors.white}>
            {item.action.label.toUpperCase()}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

/** Mount once at the root, above navigation. */
export function ToastHost() {
  const items = useToasts((s) => s.items);
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 16 }]}>
      {items.map((i) => (
        <ToastRow key={i.id} item={i} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  host: { position: 'absolute', left: 16, right: 16, gap: 8 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: t.radius.md, ...t.shadow.lifted },
  message: { flex: 1 },
}));
```

`src/ui/key-value.tsx`:
```tsx
/** @author Lokesh */
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Text } from './text';

export function KeyValue({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  const t = useTheme();
  const styles = useStyles();
  const shown = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <View style={styles.row}>
      <Text variant="caption" color={t.colors.textMuted} style={styles.label}>
        {label}
      </Text>
      <Text variant="label" weight={mono ? 'bold' : 'semibold'} style={styles.value} selectable>
        {shown}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  label: { flexShrink: 0, maxWidth: '45%' },
  value: { flex: 1, textAlign: 'right' },
}));
```

`src/ui/stat-card.tsx`:
```tsx
/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { makeStyles, toneColors, useTheme, type Tone } from '@/core/theme';

import type { IconName } from './button';
import { Card } from './card';
import { Text } from './text';

type Props = { label: string; value: string; icon?: IconName; tone?: Tone; caption?: string; onPress?: () => void };

export function StatCard({ label, value, icon, tone = 'info', caption, onPress }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const c = toneColors(t, tone);
  return (
    <Card style={styles.card} onPress={onPress}>
      {icon && (
        <View style={[styles.icon, { backgroundColor: c.bg }]}>
          <Ionicons name={icon} size={18} color={c.fg} />
        </View>
      )}
      <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="heading" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {!!caption && (
        <Text variant="caption" color={c.fg} numberOfLines={1}>
          {caption}
        </Text>
      )}
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { flex: 1, minWidth: '46%', gap: 4, padding: 14 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  value: { fontSize: 18, lineHeight: 24 },
}));
```

`src/ui/section.tsx`:
```tsx
/** @author Lokesh */
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Text } from './text';

export function Section({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: ReactNode }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text variant="overline" color={t.colors.textMuted}>
          {title}
        </Text>
        {action && (
          <Pressable hitSlop={10} onPress={action.onPress}>
            <Text variant="label" color={t.colors.accent}>
              {action.label}
            </Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: { gap: 10, marginTop: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
}));
```

`src/ui/glass.tsx`: copy `despack-rn/src/components/glass.tsx`, then (1) replace the hardcoded `'#004195'` active colour with `t.colors.primary` from `useTheme()`, (2) replace `fallbackColor` default with `alpha.glassButton` from `@/core/theme`, (3) add an optional `badge?: number` prop rendered as `<Badge count={badge} tone="primary" style={{ position: 'absolute', top: -4, right: -4 }} />` inside the `PressableScale`, (4) add `accessibilityLabel?: string` prop passed to `PressableScale`.

`src/ui/index.ts`:
```ts
/** @author Lokesh */
export * from './text';
export * from './pressable-scale';
export * from './button';
export * from './input';
export * from './card';
export * from './status-pill';
export * from './badge';
export * from './skeleton';
export * from './state-view';
export * from './query-state';
export * from './toast';
export * from './key-value';
export * from './stat-card';
export * from './section';
export * from './glass';
```

- [ ] **Step 5: Run tests** → `npx jest src/ui && npm run typecheck && npm run lint` PASS / 0 errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(ui): add themed design-system primitives and state components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Design system — navigation chrome, sheets, pickers, filters, charts

**Files:**
- Create: `src/ui/screen-header.tsx`, `src/ui/segmented-tabs.tsx`, `src/ui/bottom-sheet.tsx`, `src/ui/search-field.tsx`, `src/ui/chip.tsx`, `src/ui/picker-sheet.tsx`, `src/ui/date-field.tsx`, `src/ui/filter-sheet.tsx`, `src/ui/charts/bar-chart-card.tsx`, `src/ui/charts/pie-chart-card.tsx`, `src/ui/charts/line-chart-card.tsx`, `src/ui/charts/index.ts`, `src/core/utils/search.ts`
- Modify: `src/ui/index.ts`, `src/core/utils/index.ts`
- Test: `src/core/utils/search.test.ts`, `src/ui/filter-sheet.test.ts`

**Interfaces:**
- Consumes: Task 6 primitives; `DateRange`, `lastDays`, `thisMonth`, `financialYear`, `formatDate` (Task 3).
- Produces:
  - `ScreenHeader({ title: string; subtitle?: string; back?: boolean (default true); actions?: HeaderAction[]; tabs?: ReactNode; pull?: ReactNode; tint?: string })`, `type HeaderAction = { icon: IconName; onPress: () => void; badge?: number; label: string }`
  - `SegmentedTabs<K extends string>({ tabs: { key: K; label: string; badge?: number }[]; value: K; onChange: (k: K) => void })` — scrollable pill row for use on gradients
  - `useTabParam<K extends string>(keys: readonly K[], fallback: K): [K, (k: K) => void]` — syncs the active tab to the `?tab=` search param
  - `BottomSheet({ visible; onClose; title?: string; children; maxHeightRatio? })`
  - `SearchField({ value; onChangeText; placeholder?; autoFocus? })`
  - `Chip({ label; active?; onPress; icon?: IconName; tone?: 'default'|'warning' })`
  - `type PickerItem = { id: string; label: string; sublabel?: string }`
  - `PickerSheet({ visible; title; items: PickerItem[]; selectedId?: string | null; onSelect: (item: PickerItem | null) => void; onClose; allowClear? })` (virtualised, local search)
  - `DateField({ label; value: Date; onChange: (d: Date) => void; minimumDate?; maximumDate? })`
  - `type FilterField = { kind: 'dateRange'; key: string; label: string } | { kind: 'select'; key: string; label: string; options: { value: string; label: string }[] } | { kind: 'picker'; key: string; label: string; items: PickerItem[] }`
  - `type FilterValues = Record<string, string | DateRange | null | undefined>`
  - `FilterSheet({ visible; onClose; fields: FilterField[]; value: FilterValues; defaults: FilterValues; onApply: (v: FilterValues) => void; fyStartDay?: string | null })`
  - `countActiveFilters(fields, value, defaults): number`
  - `rangePresets(fyStartDay?): { key: string; label: string; range: DateRange }[]`
  - `matches(query: string, ...fields: (string | null | undefined)[]): boolean`, `normalize(s): string`, `filterItems<T>(items: T[], query: string, pick: (t: T) => (string | null | undefined)[]): T[]`
  - charts: `BarChartCard({ title; subtitle?; data: { label: string; values: number[] }[]; series: { label: string; color?: string }[]; format?: (n: number) => string })`, `PieChartCard({ title; data: { label: string; value: number }[]; format? })`, `LineChartCard({ title; data: { label: string; value: number }[]; format? })`

- [ ] **Step 1: Write the failing tests**

`src/core/utils/search.test.ts`:
```ts
/** @author Lokesh */
import { filterItems, matches, normalize } from './search';

test('normalize strips case, accents and punctuation spacing', () => {
  expect(normalize('  Schnëll-Energy  ')).toBe('schnell-energy');
});

test('matches every token across fields', () => {
  expect(matches('sch po', 'Schnell Energy', 'PO/25-26/0012')).toBe(true);
  expect(matches('acme', 'Schnell Energy', null)).toBe(false);
  expect(matches('', 'anything')).toBe(true);
});

test('filterItems stays fast on 5 000 rows', () => {
  const rows = Array.from({ length: 5000 }, (_, i) => ({ code: `INV/${i}`, party: i % 2 ? 'Acme Ltd' : 'Globex' }));
  const t0 = Date.now();
  const out = filterItems(rows, 'acme 4999', (r) => [r.code, r.party]);
  expect(out).toHaveLength(1);
  expect(Date.now() - t0).toBeLessThan(200);
});
```

`src/ui/filter-sheet.test.ts`:
```ts
/** @author Lokesh */
import { countActiveFilters, type FilterField } from './filter-sheet';

const fields: FilterField[] = [
  { kind: 'dateRange', key: 'range', label: 'Date' },
  { kind: 'select', key: 'status', label: 'Status', options: [{ value: '100', label: 'All' }, { value: '2', label: 'Approved' }] },
  { kind: 'picker', key: 'party', label: 'Supplier', items: [] },
];

test('counts only values that differ from defaults', () => {
  const range = { since: new Date(2026, 0, 1), till: new Date(2026, 0, 31) };
  const defaults = { range, status: '100', party: null };
  expect(countActiveFilters(fields, defaults, defaults)).toBe(0);
  expect(countActiveFilters(fields, { ...defaults, status: '2', party: '9' }, defaults)).toBe(2);
  expect(countActiveFilters(fields, { ...defaults, range: { since: new Date(2026, 0, 2), till: range.till } }, defaults)).toBe(1);
});
```

- [ ] **Step 2: Run to verify failure** → `npx jest src/core/utils/search src/ui/filter-sheet` FAIL.

- [ ] **Step 3: Implement search util**

`src/core/utils/search.ts`:
```ts
/** @author Lokesh */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** True when every whitespace-separated token of `query` appears in at least one field. */
export function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = normalize(fields.filter(Boolean).join(' '));
  return tokens.every((tk) => hay.includes(tk));
}

export function filterItems<T>(items: T[], query: string, pick: (t: T) => (string | null | undefined)[]): T[] {
  if (!query.trim()) return items;
  return items.filter((i) => matches(query, ...pick(i)));
}
```
Add `export * from './search';` to `src/core/utils/index.ts`.

- [ ] **Step 4: Implement sheets and fields**

`src/ui/bottom-sheet.tsx`: port `despack-rn/src/components/bottom-sheet.tsx` with (1) theme via `makeStyles` (`backdrop: { backgroundColor: t.alpha.backdrop }`, `sheet.backgroundColor: t.colors.surface`, radii `t.radius.xl`, handle `t.colors.handle`); (2) `springs` imported from `@/core/theme`; (3) new optional `title?: string` rendered under the handle as `<Text variant="title" style={{ paddingHorizontal: 20, paddingBottom: 8 }}>{title}</Text>`.

`src/ui/search-field.tsx`:
```tsx
/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

type Props = { value: string; onChangeText: (s: string) => void; placeholder?: string; autoFocus?: boolean };

export function SearchField({ value, onChangeText, placeholder = 'Search', autoFocus }: Props) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.box}>
      <Ionicons name="search-outline" size={18} color={t.colors.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textFaint}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={styles.input}
      />
      {!!value && (
        <Pressable hitSlop={10} onPress={() => onChangeText('')} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={t.colors.textFaint} />
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 16, borderRadius: t.radius.md, backgroundColor: t.colors.surface, ...t.shadow.card },
  input: { flex: 1, fontFamily: t.fonts.medium, fontSize: 14, color: t.colors.text },
}));
```

`src/ui/chip.tsx`:
```tsx
/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';

import { makeStyles, useTheme } from '@/core/theme';

import type { IconName } from './button';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Props = { label: string; active?: boolean; onPress: () => void; icon?: IconName; tone?: 'default' | 'warning' };

export function Chip({ label, active, onPress, icon, tone = 'default' }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const warn = tone === 'warning';
  const bg = active ? (warn ? t.colors.warning : t.colors.primarySoft) : warn ? t.colors.warningSoft : t.colors.fill;
  const fg = active ? (warn ? t.colors.white : t.colors.onPrimarySoft) : warn ? t.colors.warningText : t.colors.textMuted;
  return (
    <PressableScale onPress={onPress} style={[styles.chip, { backgroundColor: bg }, active && !warn && styles.activeBorder]}>
      {icon && <Ionicons name={icon} size={14} color={fg} />}
      <Text variant="label" color={fg}>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  chip: { height: 32, paddingHorizontal: 12, borderRadius: t.radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'transparent' },
  activeBorder: { borderColor: t.colors.chipBorder },
}));
```

`src/ui/picker-sheet.tsx`:
```tsx
/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { filterItems } from '@/core/utils';

import { BottomSheet } from './bottom-sheet';
import { PressableScale } from './pressable-scale';
import { SearchField } from './search-field';
import { Text } from './text';

export type PickerItem = { id: string; label: string; sublabel?: string };

type Props = {
  visible: boolean;
  title: string;
  items: PickerItem[];
  selectedId?: string | null;
  onSelect: (item: PickerItem | null) => void;
  onClose: () => void;
  allowClear?: boolean;
};

export function PickerSheet({ visible, title, items, selectedId, onSelect, onClose, allowClear = true }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => filterItems(items, query, (i) => [i.label, i.sublabel, i.id]), [items, query]);

  const choose = (item: PickerItem | null) => {
    onSelect(item);
    setQuery('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} maxHeightRatio={0.9}>
      <View style={styles.search}>
        <SearchField value={query} onChangeText={setQuery} placeholder={`Search ${title.toLowerCase()}`} />
      </View>
      {allowClear && !!selectedId && (
        <PressableScale onPress={() => choose(null)} style={styles.row}>
          <Text variant="label" color={t.colors.danger}>
            Clear selection
          </Text>
        </PressableScale>
      )}
      <FlatList
        data={shown}
        keyExtractor={(i) => i.id}
        initialNumToRender={20}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        renderItem={({ item }) => (
          <PressableScale onPress={() => choose(item)} style={styles.row} scaleTo={0.99}>
            <View style={styles.text}>
              <Text variant="label" numberOfLines={1}>
                {item.label}
              </Text>
              {!!item.sublabel && (
                <Text variant="caption" color={t.colors.textMuted} numberOfLines={1}>
                  {item.sublabel}
                </Text>
              )}
            </View>
            {item.id === selectedId && <Ionicons name="checkmark-circle" size={20} color={t.colors.accent} />}
          </PressableScale>
        )}
        ListEmptyComponent={
          <Text variant="body" color={t.colors.textMuted} style={styles.empty}>
            No matches
          </Text>
        }
      />
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  search: { paddingHorizontal: 18, paddingBottom: 10 },
  list: { paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  text: { flex: 1, gap: 2 },
  empty: { textAlign: 'center', paddingVertical: 32 },
}));
```

`src/ui/date-field.tsx`:
```tsx
/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { formatDate } from '@/core/utils';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Props = { label: string; value: Date; onChange: (d: Date) => void; minimumDate?: Date; maximumDate?: Date };

export function DateField({ label, value, onChange, minimumDate, maximumDate }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.root}>
      <Text variant="label" color={t.colors.textMuted}>
        {label}
      </Text>
      <PressableScale onPress={() => setOpen(true)} style={styles.box}>
        <Ionicons name="calendar-outline" size={18} color={t.colors.textFaint} />
        <Text variant="label">{formatDate(value)}</Text>
      </PressableScale>
      {open && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          themeVariant={t.dark ? 'dark' : 'light'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, d) => {
            setOpen(Platform.OS === 'ios');
            if (event.type === 'set' && d) onChange(d);
            if (Platform.OS === 'ios' && event.type === 'dismissed') setOpen(false);
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, gap: 8 },
  box: { height: 50, borderRadius: t.radius.md, borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.fillSubtle, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
}));
```

`src/ui/filter-sheet.tsx`:
```tsx
/** @author Lokesh */
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { financialYear, lastDays, thisMonth, toApiDate, type DateRange } from '@/core/utils';

import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { Chip } from './chip';
import { DateField } from './date-field';
import { PickerSheet, type PickerItem } from './picker-sheet';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export type FilterField =
  | { kind: 'dateRange'; key: string; label: string }
  | { kind: 'select'; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: 'picker'; key: string; label: string; items: PickerItem[] };

export type FilterValues = Record<string, string | DateRange | null | undefined>;

const isRange = (v: unknown): v is DateRange => !!v && typeof v === 'object' && 'since' in v;
const same = (a: FilterValues[string], b: FilterValues[string]) =>
  isRange(a) && isRange(b) ? toApiDate(a.since) === toApiDate(b.since) && toApiDate(a.till) === toApiDate(b.till) : (a ?? null) === (b ?? null);

export function countActiveFilters(fields: FilterField[], value: FilterValues, defaults: FilterValues): number {
  return fields.filter((f) => !same(value[f.key], defaults[f.key])).length;
}

export function rangePresets(fyStartDay?: string | null) {
  return [
    { key: '7d', label: 'Last 7 days', range: lastDays(7) },
    { key: '30d', label: 'Last 30 days', range: lastDays(30) },
    { key: 'month', label: 'This month', range: thisMonth() },
    { key: 'fy', label: 'This FY', range: financialYear(fyStartDay) },
  ];
}

type Props = {
  visible: boolean;
  onClose: () => void;
  fields: FilterField[];
  value: FilterValues;
  defaults: FilterValues;
  onApply: (v: FilterValues) => void;
  fyStartDay?: string | null;
};

export function FilterSheet({ visible, onClose, fields, value, defaults, onApply, fyStartDay }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [draft, setDraft] = useState<FilterValues>(value);
  const [picking, setPicking] = useState<string | null>(null);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const set = (key: string, v: FilterValues[string]) => setDraft((d) => ({ ...d, [key]: v }));
  const pickerField = fields.find((f): f is Extract<FilterField, { kind: 'picker' }> => f.kind === 'picker' && f.key === picking);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filters">
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {fields.map((f) => (
          <View key={f.key} style={styles.group}>
            <Text variant="overline" color={t.colors.textMuted}>
              {f.label}
            </Text>
            {f.kind === 'dateRange' && <RangeEditor value={draft[f.key]} onChange={(r) => set(f.key, r)} fyStartDay={fyStartDay} />}
            {f.kind === 'select' && (
              <View style={styles.wrap}>
                {f.options.map((o) => (
                  <Chip key={o.value} label={o.label} active={draft[f.key] === o.value} onPress={() => set(f.key, o.value)} />
                ))}
              </View>
            )}
            {f.kind === 'picker' && (
              <PressableScale onPress={() => setPicking(f.key)} style={styles.pickerBox}>
                <Text variant="label" color={draft[f.key] ? t.colors.text : t.colors.textFaint} numberOfLines={1}>
                  {f.items.find((i) => i.id === draft[f.key])?.label ?? `Any ${f.label.toLowerCase()}`}
                </Text>
              </PressableScale>
            )}
          </View>
        ))}
        <View style={styles.actions}>
          <Button title="Reset" variant="ghost" onPress={() => setDraft(defaults)} style={styles.flex} />
          <Button
            title="Apply"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            style={styles.flex}
          />
        </View>
      </ScrollView>
      {pickerField && (
        <PickerSheet
          visible
          title={pickerField.label}
          items={pickerField.items}
          selectedId={typeof draft[pickerField.key] === 'string' ? (draft[pickerField.key] as string) : null}
          onSelect={(item) => set(pickerField.key, item?.id ?? null)}
          onClose={() => setPicking(null)}
        />
      )}
    </BottomSheet>
  );
}

function RangeEditor({ value, onChange, fyStartDay }: { value: FilterValues[string]; onChange: (r: DateRange) => void; fyStartDay?: string | null }) {
  const styles = useStyles();
  const range = isRange(value) ? value : lastDays(30);
  return (
    <View style={styles.rangeRoot}>
      <View style={styles.wrap}>
        {rangePresets(fyStartDay).map((p) => (
          <Chip key={p.key} label={p.label} active={same(range, p.range)} onPress={() => onChange(p.range)} />
        ))}
      </View>
      <View style={styles.dates}>
        <DateField label="From" value={range.since} maximumDate={range.till} onChange={(d) => onChange({ ...range, since: d })} />
        <DateField label="To" value={range.till} minimumDate={range.since} onChange={(d) => onChange({ ...range, till: d })} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  body: { paddingHorizontal: 20, paddingBottom: 12, gap: 20 },
  group: { gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rangeRoot: { gap: 12 },
  dates: { flexDirection: 'row', gap: 12 },
  pickerBox: { height: 50, borderRadius: t.radius.md, borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.fillSubtle, justifyContent: 'center', paddingHorizontal: 14 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  flex: { flex: 1 },
}));
```

- [ ] **Step 5: Implement header and tabs**

`src/ui/screen-header.tsx`:
```tsx
/** @author Lokesh */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useTheme } from '@/core/theme';

import type { IconName } from './button';
import { GlassIconButton } from './glass';
import { Text } from './text';

export type HeaderAction = { icon: IconName; onPress: () => void; badge?: number; label: string };

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  actions?: HeaderAction[];
  /** Rendered under the title row, e.g. SegmentedTabs. */
  tabs?: ReactNode;
  /** PullToSync indicator: stretches the header open while pulling. */
  pull?: ReactNode;
};

/** Slim Despack gradient bar used by every module screen. Always dark → light status bar in both schemes. */
export function ScreenHeader({ title, subtitle, back = true, actions = [], tabs, pull }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={t.gradients.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <StatusBar style="light" />
      {pull}
      <View style={styles.row}>
        {back && <GlassIconButton icon="chevron-back" size={40} onPress={() => router.back()} accessibilityLabel="Back" />}
        <View style={styles.titles}>
          <Text variant="heading" color={t.alpha.onGradient} numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {!!subtitle && (
            <Text variant="caption" color={t.alpha.onGradientFaint} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {actions.map((a) => (
          <GlassIconButton key={a.label} icon={a.icon} size={40} onPress={a.onPress} badge={a.badge} accessibilityLabel={a.label} />
        ))}
      </View>
      {tabs && <View style={styles.tabs}>{tabs}</View>}
    </LinearGradient>
  );
}

const useStyles = makeStyles((t) => ({
  root: { paddingHorizontal: 14, paddingBottom: 14, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  titles: { flex: 1, paddingHorizontal: 4 },
  title: { fontSize: 18, lineHeight: 24 },
  tabs: { marginTop: 12 },
}));
```

`src/ui/segmented-tabs.tsx`:
```tsx
/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';

import { Badge } from './badge';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

type Tab<K extends string> = { key: K; label: string; badge?: number };

export function SegmentedTabs<K extends string>({ tabs, value, onChange }: { tabs: Tab<K>[]; value: K; onChange: (k: K) => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <PressableScale key={tab.key} onPress={() => onChange(tab.key)} style={[styles.tab, active && styles.active]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
            <Text variant="label" color={active ? t.colors.primary : t.alpha.onGradientMuted}>
              {tab.label}
            </Text>
            {!!tab.badge && <Badge count={tab.badge} style={styles.badge} />}
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

/** Active tab lives in the URL (`?tab=pending`) so it survives navigation and can be deep-linked. */
export function useTabParam<K extends string>(keys: readonly K[], fallback: K): [K, (k: K) => void] {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const value = keys.includes(tab as K) ? (tab as K) : fallback;
  const set = useCallback((k: K) => router.setParams({ tab: k }), []);
  return [value, set];
}

const useStyles = makeStyles((t) => ({
  row: { gap: 8, paddingRight: 8 },
  tab: { height: 36, paddingHorizontal: 14, borderRadius: t.radius.pill, backgroundColor: t.alpha.glassFill, borderWidth: 1, borderColor: t.alpha.glassBorder, flexDirection: 'row', alignItems: 'center', gap: 6 },
  active: { backgroundColor: t.colors.white, borderColor: t.colors.white },
  badge: { borderColor: 'transparent' },
}));
```

- [ ] **Step 6: Implement chart wrappers**

`src/ui/charts/bar-chart-card.tsx`:
```tsx
/** @author Lokesh */
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact } from '@/core/utils';

import { Card } from '../card';
import { Text } from '../text';

type Props = {
  title: string;
  subtitle?: string;
  data: { label: string; values: number[] }[];
  series: { label: string; color?: string }[];
  format?: (n: number) => string;
};

/** Grouped bars (one group per label). Colours come from the theme's chart palette. */
export function BarChartCard({ title, subtitle, data, series, format = (n) => formatCompact(n, '') }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const colors = series.map((s, i) => s.color ?? t.chart[i % t.chart.length] ?? t.colors.accent);
  const bars = data.flatMap((d) =>
    d.values.map((v, i) => ({
      value: v,
      frontColor: colors[i],
      label: i === 0 ? d.label : undefined,
      spacing: i === d.values.length - 1 ? 18 : 2,
      labelWidth: 40,
      labelTextStyle: { color: t.colors.textMuted, fontSize: 10, fontFamily: t.fonts.medium },
    })),
  );
  return (
    <Card style={styles.card}>
      <Text variant="heading">{title}</Text>
      {!!subtitle && (
        <Text variant="caption" color={t.colors.textMuted}>
          {subtitle}
        </Text>
      )}
      <View style={styles.legend}>
        {series.map((s, i) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors[i] }]} />
            <Text variant="caption" color={t.colors.textMuted}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>
      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && bars.length > 0 && (
          <BarChart
            data={bars}
            width={width - 40}
            height={170}
            barWidth={Math.max(6, Math.min(14, (width - 60) / bars.length - 4))}
            barBorderTopLeftRadius={4}
            barBorderTopRightRadius={4}
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={t.colors.border}
            rulesColor={t.colors.divider}
            rulesType="solid"
            yAxisTextStyle={{ color: t.colors.textFaint, fontSize: 10 }}
            formatYLabel={(v: string) => format(Number(v))}
            isAnimated
          />
        )}
        {bars.length === 0 && (
          <Text variant="body" color={t.colors.textMuted} style={styles.empty}>
            No data for this period
          </Text>
        )}
      </View>
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { textAlign: 'center', paddingVertical: 32 },
}));
```

`src/ui/charts/pie-chart-card.tsx`:
```tsx
/** @author Lokesh */
import { View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact } from '@/core/utils';

import { Card } from '../card';
import { Text } from '../text';

type Props = { title: string; data: { label: string; value: number }[]; format?: (n: number) => string };

export function PieChartCard({ title, data, format = (n) => formatCompact(n) }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const slices = data.filter((d) => d.value > 0).map((d, i) => ({ value: d.value, color: t.chart[i % t.chart.length] ?? t.colors.accent, label: d.label }));
  const total = slices.reduce((s, d) => s + d.value, 0);
  return (
    <Card style={styles.card}>
      <Text variant="heading">{title}</Text>
      {slices.length === 0 ? (
        <Text variant="body" color={t.colors.textMuted} style={styles.empty}>
          No data for this period
        </Text>
      ) : (
        <View style={styles.row}>
          <PieChart
            data={slices}
            donut
            radius={70}
            innerRadius={46}
            innerCircleColor={t.colors.surface}
            centerLabelComponent={() => (
              <Text variant="label" style={styles.center}>
                {format(total)}
              </Text>
            )}
          />
          <View style={styles.legend}>
            {slices.map((s) => (
              <View key={s.label} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                <Text variant="caption" style={styles.flex} numberOfLines={1}>
                  {s.label}
                </Text>
                <Text variant="caption" color={t.colors.textMuted}>
                  {Math.round((s.value / total) * 100)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  empty: { textAlign: 'center', paddingVertical: 32 },
}));
```

`src/ui/charts/line-chart-card.tsx`:
```tsx
/** @author Lokesh */
import { useState } from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { makeStyles, useTheme } from '@/core/theme';
import { formatCompact } from '@/core/utils';

import { Card } from '../card';
import { Text } from '../text';

type Props = { title: string; data: { label: string; value: number }[]; format?: (n: number) => string };

export function LineChartCard({ title, data, format = (n) => formatCompact(n, '') }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const points = data.map((d) => ({ value: d.value, label: d.label, labelTextStyle: { color: t.colors.textMuted, fontSize: 10 } }));
  return (
    <Card style={styles.card}>
      <Text variant="heading">{title}</Text>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && points.length > 1 ? (
          <LineChart
            data={points}
            width={width - 40}
            height={160}
            color={t.colors.accent}
            thickness={2.5}
            curved
            areaChart
            startFillColor={t.colors.accent}
            endFillColor={t.colors.surface}
            startOpacity={0.25}
            endOpacity={0}
            dataPointsColor={t.colors.primary}
            yAxisThickness={0}
            xAxisColor={t.colors.border}
            rulesColor={t.colors.divider}
            yAxisTextStyle={{ color: t.colors.textFaint, fontSize: 10 }}
            formatYLabel={(v: string) => format(Number(v))}
            spacing={Math.max(30, (width - 60) / points.length)}
          />
        ) : (
          <Text variant="body" color={t.colors.textMuted} style={styles.empty}>
            Not enough history yet
          </Text>
        )}
      </View>
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  card: { gap: 12 },
  empty: { textAlign: 'center', paddingVertical: 32 },
}));
```

`src/ui/charts/index.ts`:
```ts
/** @author Lokesh */
export * from './bar-chart-card';
export * from './pie-chart-card';
export * from './line-chart-card';
```

Append to `src/ui/index.ts`:
```ts
export * from './screen-header';
export * from './segmented-tabs';
export * from './bottom-sheet';
export * from './search-field';
export * from './chip';
export * from './picker-sheet';
export * from './date-field';
export * from './filter-sheet';
export * from './charts';
```

- [ ] **Step 7: Run tests and gates** → `npm run verify` PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(ui): add header, tabs, sheets, pickers, filters and themed charts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 8: Brand — enhanced X mark, icon set, ambient background, launch animation

**Files:**
- Create: `assets/brand/xmark.js`, `assets/brand/generate-icons.js`, `assets/images/*` (generated), `src/ui/brand/xmark-paths.ts`, `src/ui/brand/xmark.tsx`, `src/ui/brand/ambient-background.tsx`, `src/ui/brand/launch-animation.tsx`, `src/ui/brand/index.ts`
- Modify: `src/ui/index.ts`
- Test: `src/ui/brand/xmark-paths.test.ts`

**Interfaces:**
- Produces:
  - `XMARK_VIEWBOX = '273.45 277.6 116.02 117.82'`, `PETALS: Record<PetalKey, { d: string; tone: 'navy' | 'blue'; dir: [number, number] }>`, `type PetalKey = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'`
  - `XMark({ size: number; variant?: 'color' | 'onDark'; spread?: SharedValue<number>; rotation?: SharedValue<number>; glow?: SharedValue<number> })` — `spread` 0 = assembled, 1 = petals pushed out by 14% of size; `rotation` in degrees; `glow` 0..1 opacity of the centre glow
  - `AmbientBackground({ children? })`
  - `LaunchAnimation({ ready: boolean; onDone: () => void })` — hides the native splash itself

- [ ] **Step 1: Write the failing test**

`src/ui/brand/xmark-paths.test.ts`:
```ts
/** @author Lokesh */
import { PETALS, XMARK_VIEWBOX } from './xmark-paths';

// The icon generator (Node, CommonJS) keeps its own copy; both must stay identical to xs-logo.svg.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const script = require('../../../assets/brand/xmark.js') as { PETALS: typeof PETALS; VIEWBOX: string };

test('app and icon generator share identical petal geometry', () => {
  expect(script.VIEWBOX).toBe(XMARK_VIEWBOX);
  for (const key of Object.keys(PETALS) as (keyof typeof PETALS)[]) {
    expect(script.PETALS[key].d).toBe(PETALS[key].d);
  }
});

test('geometry is the original xs-logo.svg paths', () => {
  expect(PETALS.bottomRight.d.startsWith('m 384.4736,390.3069')).toBe(true);
  expect(PETALS.topRight.d.startsWith('m 384.474,282.7259')).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure** → `npx jest src/ui/brand` FAIL.

- [ ] **Step 3: Write the shared geometry**

`src/ui/brand/xmark-paths.ts`:
```ts
/** @author Lokesh */
// Petal paths copied unchanged from xserp-schnell/site_media/images/xs-logo.svg (the XSERP "X").
// The source applies translate(-273.45,-277.60); the viewBox below absorbs that offset.
export const XMARK_VIEWBOX = '273.45 277.6 116.02 117.82';
export const XMARK_CENTER = { x: 331.46, y: 336.5 };

export type PetalKey = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export const PETALS: Record<PetalKey, { d: string; tone: 'navy' | 'blue'; dir: [number, number] }> = {
  topLeft: {
    d: 'm 278.4523,282.7115 29.7011,-0.111 c 1.5216,23.404 10.00147,42.34152 29.2991,51.3797 -25.2476,4.8123 -43.1696,-8.2678 -59.0002,-51.2687 z',
    tone: 'navy',
    dir: [-1, -1],
  },
  topRight: {
    d: 'm 384.474,282.7259 -33.5056,-0.1254 c -1.5216,23.404 -8.80539,49.429 -29.2991,51.8033 25.2476,4.8123 46.9741,-8.677 62.8047,-51.6779 z',
    tone: 'blue',
    dir: [1, -1],
  },
  bottomLeft: {
    d: 'm 278.4519,390.2925 33.5056,0.1254 c 1.5216,-23.404 6.67301,-48.57465 28.8754,-51.8033 -25.2476,-4.8123 -46.5505,8.6769 -62.381,51.6779 z',
    tone: 'blue',
    dir: [-1, 1],
  },
  bottomRight: {
    d: 'm 384.4736,390.3069 -29.7011,0.111 c -1.5217,-23.404 -11.36842,-42.17065 -29.2991,-51.3797 25.2476,-4.8123 43.1696,8.2677 59.0002,51.2687 z',
    tone: 'navy',
    dir: [1, 1],
  },
};

/** Enhanced two-tone petal gradients (spec §4.2). `onDark` is for navy/gradient backgrounds. */
export const PETAL_GRADIENTS = {
  color: { navy: ['#00265A', '#09459D'], blue: ['#1C75ED', '#209BE1'] },
  onDark: { navy: ['#FFFFFF', '#D6E9FF'], blue: ['#5CC3FF', '#1C75ED'] },
} as const;
```

`assets/brand/xmark.js` (CommonJS twin for the Node icon generator):
```js
/** @author Lokesh */
// Keep identical to src/ui/brand/xmark-paths.ts (enforced by xmark-paths.test.ts).
const VIEWBOX = '273.45 277.6 116.02 117.82';
const PETALS = {
  topLeft: { d: 'm 278.4523,282.7115 29.7011,-0.111 c 1.5216,23.404 10.00147,42.34152 29.2991,51.3797 -25.2476,4.8123 -43.1696,-8.2678 -59.0002,-51.2687 z', tone: 'navy' },
  topRight: { d: 'm 384.474,282.7259 -33.5056,-0.1254 c -1.5216,23.404 -8.80539,49.429 -29.2991,51.8033 25.2476,4.8123 46.9741,-8.677 62.8047,-51.6779 z', tone: 'blue' },
  bottomLeft: { d: 'm 278.4519,390.2925 33.5056,0.1254 c 1.5216,-23.404 6.67301,-48.57465 28.8754,-51.8033 -25.2476,-4.8123 -46.5505,8.6769 -62.381,51.6779 z', tone: 'blue' },
  bottomRight: { d: 'm 384.4736,390.3069 -29.7011,0.111 c -1.5217,-23.404 -11.36842,-42.17065 -29.2991,-51.3797 25.2476,-4.8123 43.1696,8.2677 59.0002,51.2687 z', tone: 'navy' },
};
module.exports = { VIEWBOX, PETALS };
```

- [ ] **Step 4: Implement `XMark`**

`src/ui/brand/xmark.tsx`:
```tsx
/** @author Lokesh */
import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Stop, Circle } from 'react-native-svg';

import { PETAL_GRADIENTS, PETALS, XMARK_CENTER, XMARK_VIEWBOX, type PetalKey } from './xmark-paths';

type Props = {
  size: number;
  variant?: 'color' | 'onDark';
  spread?: SharedValue<number>;
  rotation?: SharedValue<number>;
  glow?: SharedValue<number>;
};

const KEYS = Object.keys(PETALS) as PetalKey[];

function Petal({ k, size, variant, spread }: { k: PetalKey; size: number; variant: 'color' | 'onDark'; spread?: SharedValue<number> }) {
  const petal = PETALS[k];
  const [from, to] = PETAL_GRADIENTS[variant][petal.tone];
  const push = size * 0.14;
  const style = useAnimatedStyle(() => {
    const s = spread ? spread.get() : 0;
    return { transform: [{ translateX: petal.dir[0] * push * s }, { translateY: petal.dir[1] * push * s }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox={XMARK_VIEWBOX}>
        <Defs>
          <LinearGradient id={`g-${k}`} x1="0" y1={petal.dir[1] < 0 ? '0' : '1'} x2="1" y2={petal.dir[1] < 0 ? '1' : '0'}>
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Path d={petal.d} fill={`url(#g-${k})`} fillRule="evenodd" />
      </Svg>
    </Animated.View>
  );
}

/** The XSERP "X": original petal geometry, enhanced with two-tone gradients and a centre glow. */
export function XMark({ size, variant = 'color', spread, rotation, glow }: Props) {
  const rotate = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation ? rotation.get() : 0}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow ? glow.get() : 0.55 }));
  return (
    <Animated.View style={[{ width: size, height: size }, rotate]} accessibilityRole="image" accessibilityLabel="XSERP">
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, glowStyle]}>
        <Svg width={size} height={size} viewBox={XMARK_VIEWBOX}>
          <Defs>
            <RadialGradient id="xglow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#5CC3FF" stopOpacity={0.9} />
              <Stop offset="1" stopColor="#5CC3FF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={XMARK_CENTER.x} cy={XMARK_CENTER.y} r={22} fill="url(#xglow)" />
        </Svg>
      </Animated.View>
      <View style={{ width: size, height: size }}>
        {KEYS.map((k) => (
          <Petal key={k} k={k} size={size} variant={variant} spread={spread} />
        ))}
      </View>
    </Animated.View>
  );
}
```

- [ ] **Step 5: Implement ambient background and launch animation**

`src/ui/brand/ambient-background.tsx`: copy `despack-rn/src/components/ambient-background.tsx`, replacing `gradients` import with `useTheme()` (`t.gradients.brand`) and the orb colours with `t.alpha.orb`, `t.alpha.orbSoft`, `t.alpha.orbGreen`.

`src/ui/brand/launch-animation.tsx`:
```tsx
/** @author Lokesh */
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/core/theme';

import { Text } from '../text';
import { XMark } from './xmark';

const MARK = 160; // matches expo-splash-screen imageWidth so the hand-off is seamless

/**
 * Continues from the native splash (assembled X on navy): petals breathe out and snap together with a glow
 * pulse, the mark rises, and the wordmark fades up. Waits for `ready` before fading out.
 */
export function LaunchAnimation({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const t = useTheme();
  const spread = useSharedValue(0);
  const glow = useSharedValue(0.2);
  const lift = useSharedValue(0);
  const word = useSharedValue(0);
  const overlay = useSharedValue(1);
  const played = useSharedValue(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    spread.set(withSequence(withTiming(0.7, { duration: 360, easing: Easing.out(Easing.cubic) }), withSpring(0, { dampingRatio: 0.55, duration: 520 })));
    glow.set(withDelay(420, withSequence(withTiming(1, { duration: 220 }), withTiming(0.55, { duration: 480 }))));
    lift.set(withDelay(700, withSpring(1, { dampingRatio: 0.85, duration: 600 })));
    word.set(withDelay(820, withTiming(1, { duration: 420 }, () => played.set(true))));
  }, [spread, glow, lift, word, played]);

  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      if (!played.get()) return;
      clearInterval(timer);
      overlay.set(withTiming(0, { duration: 320 }, (done) => {
        if (done) scheduleOnRN(onDone);
      }));
    }, 50);
    return () => clearInterval(timer);
  }, [ready, onDone, overlay, played]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -40 * lift.get() }, { scale: 1 - 0.3 * lift.get() }] }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.get(), transform: [{ translateY: 12 * (1 - word.get()) - 40 * lift.get() + 40 }] }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: overlay.get() }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: t.colors.navy900 }, rootStyle]}>
      <Animated.View style={markStyle}>
        <XMark size={MARK} variant="onDark" spread={spread} glow={glow} />
      </Animated.View>
      <Animated.View style={[styles.words, wordStyle]}>
        <Text variant="display" color={t.alpha.onGradient} style={styles.wordmark}>
          XSERP
        </Text>
        <Text variant="overline" color={t.alpha.onGradientFaint}>
          by Schnell Energy
        </Text>
      </Animated.View>
      <View />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  words: { position: 'absolute', top: '58%', alignItems: 'center', gap: 6 },
  wordmark: { letterSpacing: 6 },
});
```

`src/ui/brand/index.ts`:
```ts
/** @author Lokesh */
export * from './xmark';
export * from './ambient-background';
export * from './launch-animation';
export { PETALS, XMARK_VIEWBOX } from './xmark-paths';
```
Append `export * from './brand';` to `src/ui/index.ts`.

- [ ] **Step 6: Write the icon generator**

`assets/brand/generate-icons.js`:
```js
/** @author Lokesh */
// Renders the XSERP icon set from vector source. Run: npm run icons
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { PETALS, VIEWBOX } = require('./xmark');

const out = path.join(__dirname, '..', 'images');
fs.mkdirSync(out, { recursive: true });

const [vx, vy, vw, vh] = VIEWBOX.split(' ').map(Number);
const GRAD = { navy: ['#FFFFFF', '#D6E9FF'], blue: ['#5CC3FF', '#1C75ED'] };

/** The mark scaled to `size` px and centred in a 1024 canvas. `solid` paints every petal one colour (monochrome). */
function mark(size, solid) {
  const s = size / Math.max(vw, vh);
  const tx = (1024 - vw * s) / 2 - vx * s;
  const ty = (1024 - vh * s) / 2 - vy * s;
  const defs = Object.entries(PETALS)
    .map(([k, p]) => {
      const [a, b] = GRAD[p.tone];
      const down = k.startsWith('bottom');
      return `<linearGradient id="p-${k}" x1="0" y1="${down ? 1 : 0}" x2="1" y2="${down ? 0 : 1}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
    })
    .join('');
  const glow = solid ? '' : `<circle cx="331.46" cy="336.5" r="22" fill="url(#glow)"/>`;
  const petals = Object.entries(PETALS)
    .map(([k, p]) => `<path d="${p.d}" fill="${solid ?? `url(#p-${k})`}" fill-rule="evenodd"/>`)
    .join('');
  return { defs, body: `<g transform="translate(${tx} ${ty}) scale(${s})">${glow}${petals}</g>` };
}

const BG_DEFS = `
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#004195"/><stop offset="0.55" stop-color="#00265A"/><stop offset="1" stop-color="#001A3D"/>
  </linearGradient>
  <radialGradient id="sheen" cx="0.22" cy="0.12" r="0.8">
    <stop offset="0" stop-color="#5CC3FF" stop-opacity="0.35"/><stop offset="1" stop-color="#209BE1" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#5CC3FF" stop-opacity="0.9"/><stop offset="1" stop-color="#5CC3FF" stop-opacity="0"/>
  </radialGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000A1F" flood-opacity="0.45"/>
  </filter>`;

const background = `<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#sheen)"/>`;

function svg(content, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>${BG_DEFS}${defs}</defs>${content}</svg>`;
}

function render(name, svgText, width = 1024) {
  const png = new Resvg(svgText, { fitTo: { mode: 'width', value: width } }).render().asPng();
  fs.writeFileSync(path.join(out, name), png);
  console.log('wrote', name);
}

const full = mark(560);
render('icon.png', svg(`${background}<g filter="url(#lift)">${full.body}</g>`, full.defs));
render('android-icon-background.png', svg(background));
const fg = mark(430); // inside the 66% adaptive-icon safe zone
render('android-icon-foreground.png', svg(`<g filter="url(#lift)">${fg.body}</g>`, fg.defs));
const mono = mark(430, '#FFFFFF');
render('android-icon-monochrome.png', svg(mono.body, mono.defs));
const splash = mark(1000);
render('splash-icon.png', svg(splash.body, splash.defs));
render('favicon.png', svg(`${background}${full.body}`, full.defs), 48);
```

- [ ] **Step 7: Generate and inspect icons**

Run: `npm run icons`
Expected: six `wrote …` lines. Open `assets/images/icon.png` and `android-icon-foreground.png` with the Read tool and confirm: white→ice and sky→blue petals forming the original X, soft glow at centre, navy gradient tile. If petals look misaligned, the viewBox math is wrong — fix `mark()` before continuing.

- [ ] **Step 8: Run tests and gates** → `npm run verify` PASS.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(brand): add enhanced XSERP X mark, generated icon set and launch animation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: PullToSync — branded pull-to-refresh

**Files:**
- Create: `src/ui/pull-to-sync/phases.ts`, `src/ui/pull-to-sync/pull-to-sync.tsx`, `src/ui/pull-to-sync/index.ts`
- Modify: `src/ui/index.ts`
- Test: `src/ui/pull-to-sync/phases.test.ts`

**Interfaces:**
- Consumes: `XMark` (Task 8), theme.
- Produces:
  - `type SyncPhase = 0 | 1 | 2 | 3` (idle/pulling, armed, syncing, done); `SYNC_LABELS`; `rubberBand(distance): number`; `TRIGGER = 92`, `HOLD = 84`, `MIN_SYNC_MS = 900`; `spreadFor(pull: number, phase: SyncPhase): number`
  - `usePullToSync(onRefresh: () => Promise<unknown>, enabled = true): { indicator: ReactElement; attach: (list: ReactElement) => ReactElement; scrollProps: { onScroll; scrollEventThrottle: 16; bounces: false; overScrollMode: 'never' }; nestedProps: { onTouchStart; onTouchEnd; onTouchCancel }; scrollY: SharedValue<number> }`
  - Screens use it as: `const pull = usePullToSync(refresh)` → `<ScreenHeader pull={pull.indicator} …/>` + `{pull.attach(<Animated.FlatList {...pull.scrollProps} …/>)}`

- [ ] **Step 1: Write the failing test**

`src/ui/pull-to-sync/phases.test.ts`:
```ts
/** @author Lokesh */
import { HOLD, rubberBand, spreadFor, SYNC_LABELS, TRIGGER } from './phases';

test('labels read as the spec describes', () => {
  expect(SYNC_LABELS).toEqual(['PULL TO REFRESH', 'RELEASE TO SYNC', 'SYNCING…', 'UP TO DATE']);
});

test('rubber band slows past the trigger', () => {
  expect(rubberBand(100)).toBeCloseTo(55);
  expect(rubberBand(400)).toBeLessThan(400 * 0.55);
  expect(rubberBand(400)).toBeGreaterThan(TRIGGER);
});

test('petals spread with the pull, then snap together once armed or syncing', () => {
  expect(spreadFor(0, 0)).toBe(0);
  expect(spreadFor(TRIGGER / 2, 0)).toBeCloseTo(0.5);
  expect(spreadFor(TRIGGER * 2, 0)).toBe(1);
  expect(spreadFor(TRIGGER, 1)).toBe(0);
  expect(spreadFor(HOLD, 2)).toBe(0);
});
```

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement phases**

`src/ui/pull-to-sync/phases.ts`:
```ts
/** @author Lokesh */
export type SyncPhase = 0 | 1 | 2 | 3; // 0 idle/pulling · 1 armed · 2 syncing · 3 done

export const TRIGGER = 92; // pull distance that arms a sync
export const HOLD = 84; // header stays open this much while syncing
export const MIN_SYNC_MS = 900; // a sync always shows at least one turn of the mark

// Upper-cased strings (not textTransform), which Android would clip.
export const SYNC_LABELS = ['PULL TO REFRESH', 'RELEASE TO SYNC', 'SYNCING…', 'UP TO DATE'] as const;

export function rubberBand(distance: number): number {
  'worklet';
  const d = distance * 0.55;
  return d < TRIGGER ? d : TRIGGER + (d - TRIGGER) * 0.3;
}

/** 0 = petals assembled, 1 = fully apart. They part while pulling and snap together once armed. */
export function spreadFor(pull: number, phase: SyncPhase): number {
  'worklet';
  if (phase >= 1) return 0;
  return Math.min(1, Math.max(0, pull / TRIGGER));
}
```

- [ ] **Step 4: Implement the hook**

`src/ui/pull-to-sync/pull-to-sync.tsx` — gesture plumbing ported from `despack-rn/src/components/pull-to-scan.tsx` (`usePullToScan`): keep its `scrollY`, `pull`, `phase`, `base`, `blocked` shared values, `Gesture.Pan().simultaneousWithExternalGesture(native)` logic, `attach`, `scrollProps` and `nestedProps` exactly; replace the box/barcode `Mark` with the X and the beam with rotation:
```tsx
/** @author Lokesh */
import * as Haptics from 'expo-haptics';
import { useMemo, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { makeStyles, useTheme } from '@/core/theme';

import { XMark } from '../brand/xmark';
import { HOLD, MIN_SYNC_MS, rubberBand, spreadFor, SYNC_LABELS, TRIGGER, type SyncPhase } from './phases';

const ICON = 44;

export function usePullToSync(onRefresh: () => Promise<unknown>, enabled = true) {
  const t = useTheme();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const scrollY = useSharedValue(0);
  const pull = useSharedValue(0);
  const phase = useSharedValue<SyncPhase>(0);
  const base = useSharedValue(0);
  const blocked = useSharedValue(false);
  const spread = useSharedValue(0);
  const rotation = useSharedValue(0);
  const glow = useSharedValue(0.35);
  const [label, setLabel] = useState<SyncPhase>(0);

  // Petals follow the finger, but snap together with a spring when the gesture arms.
  useAnimatedReaction(
    () => ({ s: spreadFor(pull.get(), phase.get()), p: phase.get() }),
    (now, prev) => {
      if (now.p >= 1 && (prev?.p ?? 0) === 0) spread.set(withSpring(0, { dampingRatio: 0.5, duration: 420 }));
      else if (now.p === 0) spread.set(now.s);
    },
  );

  const haptic = (kind: 'arm' | 'release' | 'done') => {
    if (kind === 'arm') Haptics.selectionAsync().catch(() => {});
    else if (kind === 'release') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const settle = () => {
    pull.set(
      withDelay(
        480,
        withSpring(0, { dampingRatio: 0.9, duration: 520 }, (done) => {
          if (!done) return;
          phase.set(0);
          rotation.set(0);
          scheduleOnRN(setLabel, 0);
        }),
      ),
    );
  };

  const startSync = () => {
    setLabel(2);
    haptic('release');
    rotation.set(reduceMotion ? 0 : withRepeat(withTiming(360, { duration: 900, easing: Easing.inOut(Easing.cubic) }), -1, false));
    glow.set(withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0.35, { duration: 450 })), -1, false));
    const minimum = new Promise((resolve) => setTimeout(resolve, MIN_SYNC_MS));
    Promise.all([onRefresh().catch(() => undefined), minimum]).then(() => {
      cancelAnimation(rotation);
      cancelAnimation(glow);
      rotation.set(withTiming(Math.ceil(rotation.get() / 90) * 90, { duration: 220 }));
      glow.set(withSequence(withTiming(1, { duration: 140 }), withTiming(0.35, { duration: 520 })));
      phase.set(3);
      setLabel(3);
      haptic('done');
      settle();
    });
  };

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  const native = Gesture.Native();
  const pan = Gesture.Pan()
    .simultaneousWithExternalGesture(native)
    .enabled(enabled)
    .activeOffsetY([-12, 12])
    .onBegin(() => {
      base.set(0);
    })
    .onUpdate((e) => {
      if (phase.get() >= 2) return;
      if (blocked.get() || scrollY.get() > 0.5) {
        base.set(e.translationY);
        if (phase.get() === 0) pull.set(0);
        return;
      }
      const next = rubberBand(Math.max(0, e.translationY - base.get()));
      pull.set(next);
      const armed = next >= TRIGGER;
      if (armed && phase.get() === 0) {
        phase.set(1);
        scheduleOnRN(setLabel, 1);
        scheduleOnRN(haptic, 'arm');
      } else if (!armed && phase.get() === 1) {
        phase.set(0);
        scheduleOnRN(setLabel, 0);
      }
    })
    .onFinalize(() => {
      if (phase.get() === 1) {
        phase.set(2);
        pull.set(withSpring(HOLD, { dampingRatio: 0.8, duration: 380 }));
        scheduleOnRN(startSync);
      } else if (phase.get() === 0) {
        pull.set(withSpring(0, { dampingRatio: 0.9, duration: 420 }));
      }
    });

  const spacerStyle = useAnimatedStyle(() => ({ height: pull.get() }));
  const markStyle = useAnimatedStyle(() => {
    const p = Math.min(1, pull.get() / TRIGGER);
    return { opacity: interpolate(p, [0, 0.3, 1], [0, 0.6, 1]), transform: [{ scale: interpolate(p, [0, 1], [0.5, 1]) * (phase.get() === 1 ? 1.08 : 1) }] };
  });
  const captionStyle = useAnimatedStyle(() => ({ opacity: interpolate(pull.get(), [TRIGGER * 0.45, TRIGGER * 0.85], [0, 1], 'clamp') }));

  const indicator = (
    <Animated.View style={[styles.spacer, spacerStyle]}>
      <View style={styles.indicator}>
        <Animated.View style={markStyle}>
          <XMark size={ICON} variant="onDark" spread={spread} rotation={rotation} glow={glow} />
        </Animated.View>
        <Animated.Text style={[styles.caption, captionStyle, label === 3 && { color: t.alpha.successOnGradient }]}>{SYNC_LABELS[label]}</Animated.Text>
      </View>
    </Animated.View>
  );

  const attach = (list: ReactElement) => (
    <GestureDetector gesture={pan}>
      <View style={styles.flex}>
        <GestureDetector gesture={native}>{list}</GestureDetector>
      </View>
    </GestureDetector>
  );

  const scrollProps = { onScroll: scrollHandler, scrollEventThrottle: 16, bounces: false, overScrollMode: 'never' as const };
  const nestedProps = useMemo(
    () => ({ onTouchStart: () => blocked.set(true), onTouchEnd: () => blocked.set(false), onTouchCancel: () => blocked.set(false) }),
    [blocked],
  );

  return { indicator, attach, scrollProps, nestedProps, scrollY };
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  spacer: { overflow: 'hidden' },
  indicator: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', gap: 6 },
  caption: { fontFamily: t.fonts.semibold, fontSize: 11, letterSpacing: 0.6, color: t.alpha.onGradientMuted },
}));
```

`src/ui/pull-to-sync/index.ts`:
```ts
/** @author Lokesh */
export { usePullToSync } from './pull-to-sync';
export { SYNC_LABELS } from './phases';
```
Append `export * from './pull-to-sync';` to `src/ui/index.ts`.

- [ ] **Step 5: Run tests and gates** → `npm run verify` PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(ui): add PullToSync branded pull-to-refresh

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: App shell — providers, auth guard, login, password flows, version gate, subscription notice

**Files:**
- Create: `src/features/auth/screens/login-screen.tsx`, `src/features/auth/screens/forgot-password-screen.tsx`, `src/features/auth/screens/reset-password-screen.tsx`, `src/features/auth/components/version-gate.tsx`, `src/features/auth/components/subscription-sheet.tsx`, `src/features/auth/use-session-refresh.ts`, `src/features/auth/index.ts`, `src/app/login.tsx`, `src/app/forgot-password.tsx`, `src/app/reset-password.tsx`, `src/app/(app)/_layout.tsx`
- Modify (replace): `src/app/_layout.tsx`; Delete: `src/app/index.tsx`
- Test: `src/features/auth/login-screen.test.tsx`

**Interfaces:**
- Consumes: `useSessionStore`, `login`, `refreshSession`, `forgotPassword`, `changePassword`, `fetchVersionInfo`, `requestExtension`, `bootstrapAuth`, `markActive`, `useIdleSignOut` (Task 4); `queryClient`, `setupQueryManagers` (Task 5); UI (Tasks 6–9).
- Produces:
  - `LoginScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`, `VersionGate({ children })`, `SubscriptionSheet()`, `useSessionRefresh()` (refreshes `user_settings` on mount and on foreground if > 5 min old; exposes `refresh(): Promise<void>` used by Home's PullToSync)
  - Route groups: unauthenticated `login`, `forgot-password`, `reset-password`; authenticated `(app)/*`

- [ ] **Step 1: Write the failing test**

`src/features/auth/login-screen.test.tsx`:
```tsx
/** @author Lokesh */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import * as auth from '@/core/auth';
import { ApiError } from '@/core/api';
import { ThemeProvider } from '@/core/theme';

import { LoginScreen } from './screens/login-screen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, Link: ({ children }: { children: unknown }) => children }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const renderLogin = () => render(<ThemeProvider initialPreference="light"><LoginScreen /></ThemeProvider>);

test('requires email and password before calling the server', async () => {
  const spy = jest.spyOn(auth, 'login');
  renderLogin();
  fireEvent.press(screen.getByText('Sign in'));
  expect(await screen.findByText('Enter your email and password.')).toBeTruthy();
  expect(spy).not.toHaveBeenCalled();
});

test('shows the server message on failure', async () => {
  jest.spyOn(auth, 'login').mockRejectedValueOnce(new ApiError('server', 'Incorrect Username/Password', { code: 400 }));
  renderLogin();
  fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.c');
  fireEvent.changeText(screen.getByLabelText('Password'), 'x');
  fireEvent.press(screen.getByText('Sign in'));
  expect(await screen.findByText('Incorrect Username/Password')).toBeTruthy();
});

test('signs in on success', async () => {
  const fake = { token: 't' } as auth.Session;
  jest.spyOn(auth, 'login').mockResolvedValueOnce(fake);
  const signIn = jest.spyOn(auth.useSessionStore.getState(), 'signIn').mockResolvedValueOnce();
  renderLogin();
  fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.c');
  fireEvent.changeText(screen.getByLabelText('Password'), 'pw');
  fireEvent.press(screen.getByText('Sign in'));
  await waitFor(() => expect(signIn).toHaveBeenCalledWith(fake));
});
```
(Give each `Input`'s `TextInput` `accessibilityLabel={label}` so `getByLabelText` works — add `accessibilityLabel={label}` inside `src/ui/input.tsx` on the `TextInput`.)

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement the login screen** (Despack layout, spec §4.4)

`src/features/auth/screens/login-screen.tsx`:
```tsx
/** @author Lokesh */
import * as Application from 'expo-application';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/core/api';
import { login, useSessionStore } from '@/core/auth';
import { serverHost } from '@/core/config/env';
import { enter, makeStyles, useTheme } from '@/core/theme';
import { errorFeedback } from '@/core/utils';
import { AmbientBackground, Button, Input, Text, XMark } from '@/ui';

export function LoginScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const notice = useSessionStore((s) => s.notice);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  const fail = (message: string) => {
    setError(message);
    errorFeedback();
    shake.set(withSequence(...[-10, 10, -8, 8, -4, 0].map((x) => withTiming(x, { duration: 50 }))));
  };

  const submit = async () => {
    if (!email.trim() || !password) return fail('Enter your email and password.');
    setError(null);
    try {
      const session = await login(email, password);
      await useSessionStore.getState().signIn(session);
    } catch (e) {
      fail(errorMessage(e));
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <AmbientBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <Animated.View entering={enter(0)} style={styles.brand}>
            <View style={styles.logoTile}>
              <XMark size={40} variant="onDark" />
            </View>
            <View>
              <Text variant="title" color={t.alpha.onGradient}>
                XSERP
              </Text>
              <Text variant="caption" color={t.alpha.onGradientFaint}>
                by Schnell Energy
              </Text>
            </View>
          </Animated.View>
          <Animated.View entering={enter(60)}>
            <Text variant="display" color={t.alpha.onGradient} style={styles.welcome}>
              Welcome back
            </Text>
            <Text variant="body" color={t.alpha.onGradientMuted}>
              Sign in to approve, track and run your business on the go.
            </Text>
          </Animated.View>
          <Animated.View entering={enter(120)} style={[styles.card, cardStyle]}>
            <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="username" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
            <Input ref={passwordRef} label="Password" icon="lock-closed-outline" secure value={password} onChangeText={setPassword} autoComplete="password" textContentType="password" returnKeyType="go" onSubmitEditing={() => void submit()} />
            {!!notice && !error && (
              <View style={[styles.box, { backgroundColor: t.colors.accentSoft }]}>
                <Text variant="label" color={t.colors.infoText}>
                  {notice}
                </Text>
              </View>
            )}
            {!!error && (
              <View style={[styles.box, { backgroundColor: t.colors.dangerSoft }]}>
                <Text variant="label" color={t.colors.danger}>
                  {error}
                </Text>
              </View>
            )}
            <Button title="Sign in" icon="arrow-forward" onPress={submit} />
            <Pressable hitSlop={10} onPress={() => router.push('/forgot-password')} style={styles.forgot}>
              <Text variant="label" color={t.colors.accent}>
                Forgot password?
              </Text>
            </Pressable>
          </Animated.View>
          <View style={styles.footer}>
            <View style={[styles.dot, { backgroundColor: t.alpha.liveDot }]} />
            <Text variant="caption" color={t.alpha.onGradientFaint}>
              {serverHost} · v{Application.nativeApplicationVersion ?? '3.0.0'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.navy900 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoTile: { width: 56, height: 56, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: t.alpha.glassFill, alignItems: 'center', justifyContent: 'center' },
  welcome: { marginTop: 36, marginBottom: 6 },
  card: { marginTop: 28, backgroundColor: t.colors.surface, borderRadius: t.radius.xl, padding: 22, gap: 18, ...t.shadow.lifted },
  box: { borderRadius: t.radius.sm, padding: 12 },
  forgot: { alignSelf: 'center' },
  footer: { marginTop: 'auto', paddingTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
}));
```

- [ ] **Step 4: Forgot / reset password screens**

`src/features/auth/screens/forgot-password-screen.tsx`: same frame as login (AmbientBackground, brand row, white card) with one `Input` ("Email"), a primary `Button` "Send reset link" calling `forgotPassword(email)`; on success replace the card body with a success box (`successSoft`/`success`) showing the returned message and a ghost `Button` "Back to sign in" → `router.back()`; errors shown in the `dangerSoft` box via `errorMessage(e)`. Header row: `GlassIconButton icon="chevron-back"` → `router.back()`.

`src/features/auth/screens/reset-password-screen.tsx`: reads `const { u, email } = useLocalSearchParams<{ u?: string; email?: string }>()` (the emailed link is `https://<host>/erp/?u=<cp_token>`). Fields: Email (prefilled from `email`), New password, Confirm password (both `secure`). Validation: passwords ≥ 6 chars and equal, else inline `error` on the confirm input. Submit → `changePassword({ email, newPassword, cpToken: u })` → success toast "Password updated. Please sign in." → `router.replace('/login')`. If `u` is missing show `StateView icon="link-outline" title="This reset link is invalid" action={{ label: 'Back to sign in', onPress: () => router.replace('/login') }}`.

- [ ] **Step 5: Version gate, subscription sheet, session refresh**

`src/features/auth/components/version-gate.tsx`:
```tsx
/** @author Lokesh */
import * as Application from 'expo-application';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Linking, View } from 'react-native';

import { fetchVersionInfo } from '@/core/auth';
import { kv } from '@/core/storage/kv';
import { makeStyles, useTheme } from '@/core/theme';
import { BottomSheet, Button, Text } from '@/ui';

const STORE_URL = 'market://details?id=com.schnell.xsmanager';
const REMIND_KEY = 'xserp.updateRemindedOn';

const newer = (server: string, local: string) => {
  const a = server.split('.').map(Number);
  const b = local.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
};

/** Mirrors XSManager's splash check: forced update blocks; optional update nags at most once a day. */
export function VersionGate({ children }: { children: ReactNode }) {
  const t = useTheme();
  const styles = useStyles();
  const local = Application.nativeApplicationVersion ?? '3.0.0';
  const { data } = useQuery({ queryKey: ['version-info'], queryFn: fetchVersionInfo, staleTime: 6 * 60 * 60_000, retry: 0 });
  const today = new Date().toDateString();
  const [dismissed, setDismissed] = useState(kv.getString(REMIND_KEY) === today);
  const outdated = !!data && newer(data.version, local);
  const forced = outdated && data.forceUpdate;

  return (
    <>
      {children}
      <BottomSheet visible={outdated && (forced || !dismissed)} onClose={() => (forced ? undefined : (kv.setString(REMIND_KEY, today), setDismissed(true)))} title={forced ? 'Update required' : 'Update available'}>
        <View style={styles.body}>
          <Text variant="body" color={t.colors.textMuted}>
            Version {data?.version} is available. {forced ? 'Please update to keep using XSERP.' : 'Update for the latest fixes and features.'}
          </Text>
          <Button title="Update now" icon="download-outline" onPress={() => void Linking.openURL(STORE_URL)} />
          {!forced && <Button title="Remind me later" variant="ghost" onPress={() => (kv.setString(REMIND_KEY, today), setDismissed(true))} />}
        </View>
      </BottomSheet>
    </>
  );
}

const useStyles = makeStyles(() => ({ body: { paddingHorizontal: 20, gap: 14 } }));
```

`src/features/auth/components/subscription-sheet.tsx`: reads `useSession().subscription`; visible when `showExpiry` (once per app session — local `useState` dismissed flag). Body: title "Subscription expired" when `isExpired` else "Subscription ending soon", text with `plan` and `formatDate(expiredOn)`. If `canRequestExtension` and no `extensionRequestedOn`: a `Input` "Reason" + primary `Button` "Request extension" → `requestExtension(reason)` → toast success, close. If already requested: info box "Extension requested on <date>". Ghost `Button` "Close".

`src/features/auth/use-session-refresh.ts`:
```ts
/** @author Lokesh */
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { refreshSession, useSessionStore } from '@/core/auth';

const MIN_GAP_MS = 5 * 60_000;

/** Keeps permissions, ICD flags and pending counts fresh (auth/json/user_settings/). */
export function useSessionRefresh() {
  const refresh = useCallback(async () => {
    const { session, update } = useSessionStore.getState();
    if (!session) return;
    await update(await refreshSession(session));
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const sub = AppState.addEventListener('change', (state) => {
      const s = useSessionStore.getState().session;
      if (state === 'active' && s && Date.now() - s.refreshedAt > MIN_GAP_MS) void refresh().catch(() => undefined);
    });
    return () => sub.remove();
  }, [refresh]);

  return refresh;
}
```

`src/features/auth/index.ts`:
```ts
/** @author Lokesh */
export { LoginScreen } from './screens/login-screen';
export { ForgotPasswordScreen } from './screens/forgot-password-screen';
export { ResetPasswordScreen } from './screens/reset-password-screen';
export { VersionGate } from './components/version-gate';
export { SubscriptionSheet } from './components/subscription-sheet';
export { useSessionRefresh } from './use-session-refresh';
```

- [ ] **Step 6: Root layout and route files**

`src/app/_layout.tsx`:
```tsx
/** @author Lokesh */
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { bootstrapAuth, markActive, useIdleSignOut, useSessionStore } from '@/core/auth';
import { queryClient, setupQueryManagers } from '@/core/query';
import { applySavedAppearance, ThemeProvider, useTheme } from '@/core/theme';
import { VersionGate } from '@/features/auth';
import { LaunchAnimation, ToastHost } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});
bootstrapAuth();
applySavedAppearance();

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const t = useTheme();
  const status = useSessionStore((s) => s.status);
  useIdleSignOut();
  if (status === 'loading' || !fontsLoaded) return null;
  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg }, animation: 'fade' }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
      <Stack.Screen name="reset-password" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

function Launch({ fontsLoaded }: { fontsLoaded: boolean }) {
  const ready = useSessionStore((s) => s.status !== 'loading') && fontsLoaded;
  const [done, setDone] = useState(false);
  const finish = useCallback(() => setDone(true), []);
  return done ? null : <LaunchAnimation ready={ready} onDone={finish} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    void useSessionStore.getState().hydrate();
    return setupQueryManagers();
  }, []);

  // Sign-out must drop every cached response so the next user never sees the previous one's data.
  useEffect(() => useSessionStore.subscribe((s, prev) => prev.status === 'signedIn' && s.status === 'signedOut' && queryClient.clear()), []);

  return (
    // Every touch counts as activity for the idle sign-out.
    <GestureHandlerRootView style={{ flex: 1 }} onTouchStart={markActive}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <VersionGate>
              <RootNavigator fontsLoaded={fontsLoaded} />
            </VersionGate>
            <ToastHost />
            <Launch fontsLoaded={fontsLoaded} />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

`src/app/login.tsx`:
```tsx
/** @author Lokesh */
export { LoginScreen as default } from '@/features/auth';
```
`src/app/forgot-password.tsx` and `src/app/reset-password.tsx`: same one-liner exporting `ForgotPasswordScreen` / `ResetPasswordScreen`.

`src/app/(app)/_layout.tsx`:
```tsx
/** @author Lokesh */
import { Stack } from 'expo-router';

import { useTheme } from '@/core/theme';
import { SubscriptionSheet, useSessionRefresh } from '@/features/auth';
import { useMasterSync } from '@/features/master-data';

export default function AppLayout() {
  const t = useTheme();
  useSessionRefresh();
  useMasterSync();
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="profile" options={{ animation: 'fade_from_bottom' }} />
      </Stack>
      <SubscriptionSheet />
    </>
  );
}
```
(`useMasterSync` arrives in Task 12; until then stub `src/features/master-data/index.ts` with `export function useMasterSync() {}` so this task compiles. Task 12 replaces the stub.)

Deep link: the reset email opens `https://<host>/erp/?u=<token>`. Add `src/app/+native-intent.tsx`:
```tsx
/** @author Lokesh */
// Maps xserp's emailed links (https://<host>/erp/?u=<cp_token>) onto app routes.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, 'https://placeholder');
    const token = url.searchParams.get('u');
    if (url.pathname.startsWith('/erp') && token) return `/reset-password?u=${encodeURIComponent(token)}`;
    if (url.pathname.startsWith('/erp')) return '/';
  } catch {
    // fall through
  }
  return path;
}
```

Temporary home so the authed group renders until Task 11: `src/app/(app)/index.tsx` exporting a `View` with `<Text>Signed in</Text>` and a ghost `Button` "Sign out" → `useSessionStore.getState().signOut()`.

- [ ] **Step 7: Run tests and gates** → `npm run verify` PASS.

- [ ] **Step 8: Manual check on device**

Run: `npx expo start` → open on Android. Expected: launch animation plays (X petals breathe, glow, wordmark), login screen appears in your system theme; wrong password shakes the card and shows "Incorrect Username/Password"; correct credentials reach "Signed in"; killing and reopening the app keeps you signed in; sign out returns to login.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(auth): add app shell, login, password reset, version gate and session refresh

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Module registry, Home screen, "Soon" screen

**Files:**
- Create: `src/modules/registry.ts`, `src/features/home/components/home-header.tsx`, `src/features/home/components/module-tile.tsx`, `src/features/home/screens/home-screen.tsx`, `src/features/home/screens/soon-screen.tsx`, `src/features/home/index.ts`, `src/app/(app)/index.tsx` (replace), `src/app/(app)/soon/[module].tsx`
- Test: `src/modules/registry.test.ts`

**Interfaces:**
- Consumes: `Session`, `can`, `PermissionCode` (Task 4); `ModuleTint` (Task 2); UI.
- Produces:
  - `type ModuleId = 'finance'|'audit'|'purchase'|'sales'|'stores'|'masters'|'expenses'|'approvals'|'production'|'hr'|'reports'|'settings'`
  - `type ModuleDef = { id: ModuleId; title: string; subtitle: string; icon: IconName; tint: ModuleTint; permission?: PermissionCode[]; badge?: (s: Session) => number; href: Href; status: 'live' | 'soon' }`
  - `MODULES: readonly ModuleDef[]` (spec order), `moduleAccess(def, session): 'open' | 'locked' | 'soon'`, `moduleBadge(def, session): number`
  - `HomeScreen({ modules, approvalsCount })` (props so `features/home` doesn't import `modules/`), `SoonScreen({ title, icon })`

- [ ] **Step 1: Write the failing test**

`src/modules/registry.test.ts`:
```ts
/** @author Lokesh */
import fixture from '../../__fixtures__/login_api.json';
import { toSession, userPayloadSchema, type Session } from '@/core/auth';

import { MODULES, moduleAccess, moduleBadge } from './registry';

const base = toSession(userPayloadSchema.parse(fixture));
const none = { view: false, edit: false, delete: false, approve: false, alert: false };
const user = (perms: Session['permissions'], extra: Partial<Session> = {}): Session => ({ ...base, ...extra, user: { ...base.user, isSuper: false }, permissions: perms });
const byId = (id: string) => MODULES.find((m) => m.id === id)!;

test('tile order matches the spec', () => {
  expect(MODULES.map((m) => m.id)).toEqual(['finance', 'audit', 'purchase', 'sales', 'stores', 'masters', 'expenses', 'approvals', 'production', 'hr', 'reports', 'settings']);
});

test('locks tiles without view permission and marks API-less modules soon', () => {
  const s = user({ SALES: { ...none, view: true } });
  expect(moduleAccess(byId('sales'), s)).toBe('open');
  expect(moduleAccess(byId('purchase'), s)).toBe('locked');
  expect(moduleAccess(byId('production'), s)).toBe('soon');
  expect(moduleAccess(byId('settings'), s)).toBe('open');
});

test('audit needs ICD enabled', () => {
  const s = user({ ICD: { ...none, view: true } }, { icd: { enabled: false, ignoreCreditNote: false, autoGenVoucher: false } });
  expect(moduleAccess(byId('audit'), s)).toBe('locked');
});

test('badges only count where the user can approve', () => {
  const s = user({ SALES: { ...none, view: true, approve: true }, PURCHASE: { ...none, view: true } }, { counts: { ...base.counts, invoice: 2, oa: 3, po: 5 } });
  expect(moduleBadge(byId('sales'), s)).toBe(5);
  expect(moduleBadge(byId('purchase'), s)).toBe(0);
});
```

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement the registry**

`src/modules/registry.ts`:
```ts
/** @author Lokesh */
import type { Href } from 'expo-router';

import type { PermissionCode, Session } from '@/core/auth';
import { can } from '@/core/permissions';
import type { ModuleTint } from '@/core/theme';
import type { IconName } from '@/ui';

export type ModuleId = 'finance' | 'audit' | 'purchase' | 'sales' | 'stores' | 'masters' | 'expenses' | 'approvals' | 'production' | 'hr' | 'reports' | 'settings';

export type ModuleDef = {
  id: ModuleId;
  title: string;
  subtitle: string;
  icon: IconName;
  tint: ModuleTint;
  /** Any-of: the tile opens when the user can view at least one. */
  permission?: PermissionCode[];
  badge?: (s: Session) => number;
  href: Href;
  status: 'live' | 'soon';
};

const approved = (s: Session, code: PermissionCode, n: number) => (can(s, code, 'approve') ? n : 0);

export const MODULES: readonly ModuleDef[] = [
  { id: 'finance', title: 'Finance', subtitle: 'Cash · Bank · Ageing · Ledgers', icon: 'wallet-outline', tint: 'finance', permission: ['ACCOUNTS'], href: '/finance', status: 'live' },
  { id: 'audit', title: 'Audit', subtitle: 'Internal control · GRN notes', icon: 'shield-checkmark-outline', tint: 'audit', permission: ['ICD'], badge: (s) => approved(s, 'ICD', s.counts.icd), href: '/audit', status: 'live' },
  { id: 'purchase', title: 'Purchase', subtitle: 'Purchase orders · Indents', icon: 'cart-outline', tint: 'purchase', permission: ['PURCHASE'], badge: (s) => approved(s, 'PURCHASE', s.counts.po), href: '/purchase', status: 'live' },
  { id: 'sales', title: 'Sales', subtitle: 'Invoices · Order acknowledgements', icon: 'trending-up-outline', tint: 'sales', permission: ['SALES'], badge: (s) => approved(s, 'SALES', s.counts.invoice + s.counts.oa), href: '/sales', status: 'live' },
  { id: 'stores', title: 'Stores', subtitle: 'Stock · Indents · GRN', icon: 'cube-outline', tint: 'stores', permission: ['STORES'], badge: (s) => approved(s, 'STORES', s.counts.grn), href: '/stores', status: 'live' },
  { id: 'masters', title: 'Masters', subtitle: 'Parties · Materials · Rates', icon: 'albums-outline', tint: 'masters', permission: ['MASTERS'], badge: (s) => approved(s, 'MASTERS', s.counts.rate), href: '/masters', status: 'live' },
  { id: 'expenses', title: 'Expenses', subtitle: 'Claims · Approvals', icon: 'receipt-outline', tint: 'expenses', permission: ['EXPENSES'], href: '/expenses', status: 'live' },
  { id: 'approvals', title: 'Approvals', subtitle: 'Everything awaiting you', icon: 'checkmark-done-circle-outline', tint: 'approvals', href: '/approvals', status: 'live' },
  { id: 'production', title: 'Production', subtitle: 'Plans · Issues · Shortages', icon: 'construct-outline', tint: 'production', href: '/soon/production', status: 'soon' },
  { id: 'hr', title: 'HR', subtitle: 'Employees · Attendance · Pay', icon: 'people-outline', tint: 'hr', href: '/soon/hr', status: 'soon' },
  { id: 'reports', title: 'Reports', subtitle: 'GST · P&L · Cash flow', icon: 'bar-chart-outline', tint: 'reports', href: '/soon/reports', status: 'soon' },
  { id: 'settings', title: 'Settings', subtitle: 'Profile · Theme · Sync', icon: 'settings-outline', tint: 'settings', href: '/settings', status: 'live' },
];

export function moduleAccess(def: ModuleDef, s: Session): 'open' | 'locked' | 'soon' {
  if (def.status === 'soon') return 'soon';
  if (!def.permission) return 'open';
  return def.permission.some((code) => can(s, code, 'view')) ? 'open' : 'locked';
}

export const moduleBadge = (def: ModuleDef, s: Session) => (moduleAccess(def, s) === 'open' ? (def.badge?.(s) ?? 0) : 0);
```

- [ ] **Step 4: Implement Home**

`src/features/home/components/module-tile.tsx`:
```tsx
/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { enter, makeStyles, useTheme } from '@/core/theme';
import { Badge, PressableScale, Text, type IconName } from '@/ui';

export type TileProps = { title: string; subtitle: string; icon: IconName; tint: string; access: 'open' | 'locked' | 'soon'; badge: number; index: number; onPress: () => void };

export function ModuleTile({ title, subtitle, icon, tint, access, badge, index, onPress }: TileProps) {
  const t = useTheme();
  const styles = useStyles();
  const muted = access !== 'open';
  return (
    <Animated.View entering={enter(60 + index * 40)} style={styles.cell}>
      <PressableScale onPress={onPress} disabled={access === 'locked'} style={[styles.tile, muted && styles.muted]} accessibilityLabel={`${title}${access === 'locked' ? ', no access' : access === 'soon' ? ', coming soon' : ''}`}>
        <View style={[styles.glow, { backgroundColor: tint }]} />
        <View style={styles.top}>
          <View style={[styles.icon, { backgroundColor: `${tint}18` }]}>
            <Ionicons name={icon} size={24} color={tint} />
          </View>
          {access === 'open' && <Badge count={badge} />}
          {access === 'locked' && <Ionicons name="lock-closed" size={16} color={t.colors.textFaint} />}
          {access === 'soon' && (
            <View style={styles.soon}>
              <Text variant="overline" color={t.colors.textMuted}>
                Soon
              </Text>
            </View>
          )}
        </View>
        <View style={styles.bottom}>
          <Text variant="title" style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" color={t.colors.textMuted} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        {access === 'open' && (
          <View style={[styles.arrow, { backgroundColor: tint }]}>
            <Ionicons name="arrow-forward" size={14} color={t.colors.white} />
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  cell: { width: '48.2%' },
  tile: { height: 168, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: 16, overflow: 'hidden', justifyContent: 'space-between', ...t.shadow.card },
  muted: { opacity: 0.6 },
  glow: { position: 'absolute', width: 110, height: 110, borderRadius: 55, top: -30, right: -30, opacity: 0.07 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  soon: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: t.radius.pill, backgroundColor: t.colors.fill },
  bottom: { gap: 2, paddingRight: 28 },
  title: { fontSize: 19 },
  arrow: { position: 'absolute', right: 14, bottom: 14, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
}));
```

`src/features/home/components/home-header.tsx`: Despack home header — `LinearGradient(t.gradients.header)` with `paddingTop: insets.top + 14`, `paddingHorizontal: 22`, `paddingBottom: 70`, bottom radii 32, decorative orb (260 px circle, `t.alpha.orb`, `top: -80, right: -90`). Renders `{pull}` first (PullToSync indicator), then row: date overline (`format(new Date(), 'EEEE, d MMMM')`, `onGradientFaint`) + right cluster: `GlassIconButton icon="notifications-outline" badge={unread}` → `router.push('/notifications')` and a 44 px white circle avatar with `initials(user)` in `extrabold`/`primary`, 3 px `rgba(255,255,255,0.3)` border → `router.push('/profile')`. Then greeting (`Good morning|afternoon|evening,` by hour, `onGradientMuted`), first name in `display`/white, and a glass pill with `business-outline` + `user.enterpriseName`. Props: `{ pull: ReactNode; unread: number }`.

`src/features/home/screens/home-screen.tsx`:
```tsx
/** @author Lokesh */
import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSession } from '@/core/auth';
import { makeStyles, useTheme, type ModuleTint } from '@/core/theme';
import { Text, usePullToSync, type IconName } from '@/ui';

import { HomeHeader } from '../components/home-header';
import { ModuleTile } from '../components/module-tile';

export type HomeModule = { id: string; title: string; subtitle: string; icon: IconName; tint: ModuleTint; href: Href; access: 'open' | 'locked' | 'soon'; badge: number };

type Props = { modules: HomeModule[]; unread: number; onRefresh: () => Promise<unknown> };

export function HomeScreen({ modules, unread, onRefresh }: Props) {
  const t = useTheme();
  const styles = useStyles();
  useSession();
  const pull = usePullToSync(onRefresh);
  return (
    <View style={styles.root}>
      {pull.attach(
        <Animated.ScrollView {...pull.scrollProps} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <HomeHeader pull={pull.indicator} unread={unread} />
          <View style={styles.body}>
            <Text variant="overline" color={t.alpha.onGradientMuted} style={styles.label}>
              Modules
            </Text>
            <View style={styles.grid}>
              {modules.map((m, i) => (
                <ModuleTile key={m.id} index={i} title={m.title} subtitle={m.subtitle} icon={m.icon} tint={t.tints[m.tint]} access={m.access} badge={m.badge} onPress={() => router.push(m.href)} />
              ))}
            </View>
          </View>
        </Animated.ScrollView>,
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  content: { paddingBottom: 40 },
  body: { paddingHorizontal: t.space.gutter, marginTop: -44 },
  label: { marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
}));
```

`src/features/home/screens/soon-screen.tsx`: `ScreenHeader title={title}`; centred `StateView icon={icon} title={`${title} is coming to mobile`} message="It's available today on XSERP web." action={{ label: 'Open XSERP web', onPress: () => WebBrowser.openBrowserAsync(`${env.serverUrl}/erp/`) }}` (import `* as WebBrowser from 'expo-web-browser'`, `env` from `@/core/config/env`).

`src/features/home/index.ts` exports `HomeScreen`, `SoonScreen`, type `HomeModule`.

`src/app/(app)/index.tsx`:
```tsx
/** @author Lokesh */
import { useSessionStore } from '@/core/auth';
import { HomeScreen } from '@/features/home';
import { useSessionRefreshAction } from '@/features/auth';
import { useUnreadCount } from '@/features/notifications';
import { MODULES, moduleAccess, moduleBadge } from '@/modules/registry';
import { useApprovalsTotal } from '@/modules/approval-registry';

export default function Home() {
  const session = useSessionStore((s) => s.session);
  const refresh = useSessionRefreshAction();
  const unread = useUnreadCount();
  const approvals = useApprovalsTotal();
  if (!session) return null;
  const modules = MODULES.map((m) => ({
    id: m.id,
    title: m.title,
    subtitle: m.subtitle,
    icon: m.icon,
    tint: m.tint,
    href: m.href,
    access: moduleAccess(m, session),
    badge: m.id === 'approvals' ? approvals : moduleBadge(m, session),
  }));
  return <HomeScreen modules={modules} unread={unread} onRefresh={refresh} />;
}
```
Add to `src/features/auth/use-session-refresh.ts` and export from its index:
```ts
/** The refresh action alone (no lifecycle effects) — for PullToSync on Home. */
export function useSessionRefreshAction() {
  return useCallback(async () => {
    const { session, update } = useSessionStore.getState();
    if (session) await update(await refreshSession(session));
  }, []);
}
```
Until Tasks 14 and 23 land, create stubs so this compiles: `src/features/notifications/index.ts` → `export const useUnreadCount = () => 0;` and `src/modules/approval-registry.ts` → `export const useApprovalsTotal = () => 0;`. Those tasks replace the stubs.

`src/app/(app)/soon/[module].tsx`:
```tsx
/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';

import { SoonScreen } from '@/features/home';
import { MODULES } from '@/modules/registry';

export default function Soon() {
  const { module } = useLocalSearchParams<{ module: string }>();
  const def = MODULES.find((m) => m.id === module);
  return <SoonScreen title={def?.title ?? 'This module'} icon={def?.icon ?? 'time-outline'} />;
}
```

- [ ] **Step 5: Run tests and gates** → `npm run verify` PASS.

- [ ] **Step 6: Manual check** — sign in; Home shows 12 tiles in two columns overlapping the gradient header, staggered entrance; tiles without permission show a lock and do nothing; Production/HR/Reports show "SOON" and open the explainer; pulling down shows the X petals parting, "RELEASE TO SYNC", spinning X, "UP TO DATE". Toggle the phone's dark mode: the screen re-themes instantly.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(home): add module registry, permission-aware tile grid and soon screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 12: Master data cache with automatic sync

**Files:**
- Create: `src/features/master-data/schemas.ts`, `src/features/master-data/api.ts`, `src/features/master-data/store.ts`, `src/features/master-data/use-master-sync.ts`, `src/features/master-data/hooks.ts`, `src/features/master-data/index.ts` (replaces the Task 10 stub), `__fixtures__/partyNames.json`, `__fixtures__/materialNames.json`
- Test: `src/features/master-data/master-data.test.ts`

**Interfaces:**
- Consumes: `post`, zod helpers (Task 3); `kv` (Task 2); `useSessionStore` (Task 4); `PickerItem` (Task 7).
- Produces (from `@/features/master-data`):
  - `type MasterKind = 'parties' | 'materials' | 'ledgers' | 'projects' | 'taxes'`, `MASTER_KINDS`, `MASTER_LABELS: Record<MasterKind, string>`
  - types `Party = { id; code; name }`, `MaterialName = { itemId; drawingNo; name; makeId; makeName; unit; hsnCode; isStocked; isFaulty }`, `LedgerName = { id; name; group }`, `Project = { id; code; name }`, `TaxName = { code; name; rate: number }`
  - `useMasterStore` — `{ data: { [K in MasterKind]: MasterRows[K] }; syncedAt: Record<MasterKind, number | null>; syncing: Record<MasterKind, boolean>; error: Record<MasterKind, string | null> }`
  - `syncMaster(kind, { force?: boolean }): Promise<void>`, `syncAllMasters({ force? }): Promise<void>`, `STALE_AFTER_MS = 12 * 60 * 60_000`
  - `useMasterSync()` — mount in `(app)/_layout`: syncs stale lists on mount and app foreground
  - `useParties()`, `useMaterials()`, `useLedgers()`, `useProjects()`, `useTaxes()` → typed rows; `usePartyItems()`, `useMaterialItems()`, `useLedgerItems(filter?: (l: LedgerName) => boolean)`, `useProjectItems()` → `PickerItem[]`
  - `materialKey(itemId, makeId): string` (`"<itemId>:<makeId>"`, the picker id for materials)

- [ ] **Step 1: Capture fixtures** for `masters/json/partyNames/` and `masters/json/materialNames/` using the curl pattern from Task 4 Step 1 (add `token`, `user_id`, `enterprise_id` fields from the login fixture). Trim each list to 3 rows, anonymise names. If unavailable, hand-write `{ "response_code": 200, "party_names": [{ "id": 12, "code": "P001", "name": "Acme Ltd" }] }` and `{ "response_code": 200, "material_names": [{ "item_id": "45", "drawing_no": "DRG-1", "name": "Copper wire", "make_id": 1, "make_name": "-NA-", "primary_unit": "Kg", "hsn_code": "7408", "is_stocked": 1, "is_faulty": 0 }] }`.

- [ ] **Step 2: Write the failing test**

`src/features/master-data/master-data.test.ts`:
```ts
/** @author Lokesh */
import materials from '../../../__fixtures__/materialNames.json';
import parties from '../../../__fixtures__/partyNames.json';
import * as client from '@/core/api/client';

import { materialNamesSchema, partyNamesSchema } from './schemas';
import { STALE_AFTER_MS, syncMaster, useMasterStore } from './store';

test('fixtures parse into typed rows', () => {
  const p = partyNamesSchema.parse(parties);
  expect(p.party_names[0]).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String) }));
  const m = materialNamesSchema.parse(materials);
  expect(typeof m.material_names[0]?.make_id).toBe('string');
});

test('syncMaster skips fresh lists and refetches stale ones', async () => {
  const spy = jest.spyOn(client, 'post').mockResolvedValue({ party_names: [{ id: '1', code: 'P1', name: 'Acme' }] } as never);
  await syncMaster('parties');
  expect(spy).toHaveBeenCalledTimes(1);
  expect(useMasterStore.getState().data.parties[0]?.name).toBe('Acme');
  await syncMaster('parties');
  expect(spy).toHaveBeenCalledTimes(1);
  useMasterStore.setState((s) => ({ syncedAt: { ...s.syncedAt, parties: Date.now() - STALE_AFTER_MS - 1 } }));
  await syncMaster('parties');
  expect(spy).toHaveBeenCalledTimes(2);
});

test('a failed sync keeps the old rows and records the error', async () => {
  useMasterStore.setState((s) => ({ data: { ...s.data, parties: [{ id: '9', code: 'X', name: 'Kept' }] }, syncedAt: { ...s.syncedAt, parties: null } }));
  jest.spyOn(client, 'post').mockRejectedValueOnce(new Error('offline'));
  await syncMaster('parties');
  expect(useMasterStore.getState().data.parties[0]?.name).toBe('Kept');
  expect(useMasterStore.getState().error.parties).toBe('offline');
});
```

- [ ] **Step 3: Run to verify failure** → FAIL.

- [ ] **Step 4: Implement schemas and API**

`src/features/master-data/schemas.ts`:
```ts
/** @author Lokesh */
import { z } from 'zod';

import { zBool, zId, zList, zNum, zStr } from '@/core/api';

export const partyNamesSchema = z.looseObject({ party_names: zList(z.looseObject({ id: zId, code: zStr, name: zStr })) });
export const materialNamesSchema = z.looseObject({
  material_names: zList(
    z.looseObject({ item_id: zId, drawing_no: zStr, name: zStr, make_id: zId, make_name: zStr, primary_unit: zStr, hsn_code: zStr, is_stocked: zBool, is_faulty: zBool }),
  ),
});
export const ledgerNamesSchema = z.looseObject({ ledgers: zList(z.looseObject({ id: zId, name: zStr, group_name: zStr })) });
export const projectsSchema = z.looseObject({ projects: zList(z.looseObject({ id: zId, code: zStr, name: zStr })) });
export const taxListSchema = z.looseObject({ tax_list: zList(z.looseObject({ tax_code: zStr, name: zStr, net_rate: zNum })) });
```

`src/features/master-data/api.ts`:
```ts
/** @author Lokesh */
import { post } from '@/core/api';

import { ledgerNamesSchema, materialNamesSchema, partyNamesSchema, projectsSchema, taxListSchema } from './schemas';

export type Party = { id: string; code: string; name: string };
export type MaterialName = { itemId: string; drawingNo: string; name: string; makeId: string; makeName: string; unit: string; hsnCode: string; isStocked: boolean; isFaulty: boolean };
export type LedgerName = { id: string; name: string; group: string };
export type Project = { id: string; code: string; name: string };
export type TaxName = { code: string; name: string; rate: number };

export type MasterRows = { parties: Party[]; materials: MaterialName[]; ledgers: LedgerName[]; projects: Project[]; taxes: TaxName[] };
export type MasterKind = keyof MasterRows;

const LONG = { timeoutMs: 120_000 }; // material/ledger lists can be large

export const masterFetchers: { [K in MasterKind]: () => Promise<MasterRows[K]> } = {
  parties: async () => (await post('masters/json/partyNames/', {}, { schema: partyNamesSchema, ...LONG })).party_names,
  materials: async () =>
    (await post('masters/json/materialNames/', {}, { schema: materialNamesSchema, ...LONG })).material_names.map((m) => ({
      itemId: m.item_id,
      drawingNo: m.drawing_no,
      name: m.name,
      makeId: m.make_id,
      makeName: m.make_name,
      unit: m.primary_unit,
      hsnCode: m.hsn_code,
      isStocked: m.is_stocked,
      isFaulty: m.is_faulty,
    })),
  ledgers: async () => (await post('accounts/json/ledger_names/', {}, { schema: ledgerNamesSchema, ...LONG })).ledgers.map((l) => ({ id: l.id, name: l.name, group: l.group_name })),
  projects: async () => (await post('masters/json/projects/', {}, { schema: projectsSchema, ...LONG })).projects,
  taxes: async () => (await post('masters/json/loadTaxList/', {}, { schema: taxListSchema, ...LONG })).tax_list.map((x) => ({ code: x.tax_code, name: x.name, rate: x.net_rate })),
};
```

- [ ] **Step 5: Implement the store, sync hook and selectors**

`src/features/master-data/store.ts`:
```ts
/** @author Lokesh */
import { create } from 'zustand';

import { errorMessage } from '@/core/api';
import { useSessionStore } from '@/core/auth';
import { env } from '@/core/config/env';
import { kv } from '@/core/storage/kv';

import { masterFetchers, type MasterKind, type MasterRows } from './api';

export const MASTER_KINDS: MasterKind[] = ['parties', 'materials', 'ledgers', 'projects', 'taxes'];
export const MASTER_LABELS: Record<MasterKind, string> = { parties: 'Parties', materials: 'Materials', ledgers: 'Ledgers', projects: 'Projects', taxes: 'Taxes' };
export const STALE_AFTER_MS = 12 * 60 * 60_000;

type State = {
  data: MasterRows;
  syncedAt: Record<MasterKind, number | null>;
  syncing: Record<MasterKind, boolean>;
  error: Record<MasterKind, string | null>;
};

const per = <V>(v: V) => Object.fromEntries(MASTER_KINDS.map((k) => [k, v])) as Record<MasterKind, V>;
const empty = (): State => ({ data: { parties: [], materials: [], ledgers: [], projects: [], taxes: [] }, syncedAt: per(null), syncing: per(false), error: per(null) });

// Scoped by server + enterprise so switching accounts never shows another company's masters.
const scope = () => `${env.serverUrl}|${useSessionStore.getState().session?.enterpriseId ?? 'none'}`;
const key = (kind: MasterKind) => `xserp.master.${kind}.${scope()}`;

export const useMasterStore = create<State>(() => empty());

function load() {
  const next = empty();
  for (const kind of MASTER_KINDS) {
    const saved = kv.getJSON<{ rows: MasterRows[MasterKind]; at: number }>(key(kind));
    if (saved) {
      (next.data as Record<MasterKind, unknown>)[kind] = saved.rows;
      next.syncedAt[kind] = saved.at;
    }
  }
  useMasterStore.setState(next);
}

export async function syncMaster(kind: MasterKind, { force = false } = {}) {
  const st = useMasterStore.getState();
  const at = st.syncedAt[kind];
  if (st.syncing[kind] || (!force && at && Date.now() - at < STALE_AFTER_MS)) return;
  useMasterStore.setState((s) => ({ syncing: { ...s.syncing, [kind]: true } }));
  try {
    const rows = await masterFetchers[kind]();
    const now = Date.now();
    kv.setJSON(key(kind), { rows, at: now });
    useMasterStore.setState((s) => ({ data: { ...s.data, [kind]: rows }, syncedAt: { ...s.syncedAt, [kind]: now }, error: { ...s.error, [kind]: null } }));
  } catch (e) {
    useMasterStore.setState((s) => ({ error: { ...s.error, [kind]: errorMessage(e) } }));
  } finally {
    useMasterStore.setState((s) => ({ syncing: { ...s.syncing, [kind]: false } }));
  }
}

export const syncAllMasters = (opts: { force?: boolean } = {}) => Promise.all(MASTER_KINDS.map((k) => syncMaster(k, opts))).then(() => undefined);

// Follow the session: load the right company's cache on sign-in, wipe it on sign-out.
useSessionStore.subscribe((s, prev) => {
  if (s.status === 'signedIn' && prev.status !== 'signedIn') load();
  if (s.status === 'signedOut' && prev.status === 'signedIn') {
    const enterprise = prev.session?.enterpriseId;
    for (const kind of MASTER_KINDS) kv.remove(`xserp.master.${kind}.${env.serverUrl}|${enterprise}`);
    useMasterStore.setState(empty());
  }
});
if (useSessionStore.getState().status === 'signedIn') load();
```

`src/features/master-data/use-master-sync.ts`:
```ts
/** @author Lokesh */
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncAllMasters } from './store';

/** Re-syncs any master list older than 12 h, at mount and whenever the app returns to the foreground. */
export function useMasterSync() {
  useEffect(() => {
    void syncAllMasters();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void syncAllMasters());
    return () => sub.remove();
  }, []);
}
```

`src/features/master-data/hooks.ts`:
```ts
/** @author Lokesh */
import { useMemo } from 'react';

import type { PickerItem } from '@/ui';

import type { LedgerName } from './api';
import { useMasterStore } from './store';

export const materialKey = (itemId: string, makeId: string) => `${itemId}:${makeId}`;

export const useParties = () => useMasterStore((s) => s.data.parties);
export const useMaterials = () => useMasterStore((s) => s.data.materials);
export const useLedgers = () => useMasterStore((s) => s.data.ledgers);
export const useProjects = () => useMasterStore((s) => s.data.projects);
export const useTaxes = () => useMasterStore((s) => s.data.taxes);

export function usePartyItems(): PickerItem[] {
  const rows = useParties();
  return useMemo(() => rows.map((p) => ({ id: p.id, label: p.name, sublabel: p.code })), [rows]);
}

export function useMaterialItems(): PickerItem[] {
  const rows = useMaterials();
  return useMemo(
    () => rows.map((m) => ({ id: materialKey(m.itemId, m.makeId), label: m.name, sublabel: [m.drawingNo, m.makeName !== '-NA-' ? m.makeName : null, m.unit].filter(Boolean).join(' · ') })),
    [rows],
  );
}

export function useLedgerItems(filter?: (l: LedgerName) => boolean): PickerItem[] {
  const rows = useLedgers();
  return useMemo(() => (filter ? rows.filter(filter) : rows).map((l) => ({ id: l.id, label: l.name, sublabel: l.group })), [rows, filter]);
}

export function useProjectItems(): PickerItem[] {
  const rows = useProjects();
  return useMemo(() => rows.map((p) => ({ id: p.id, label: p.name, sublabel: p.code })), [rows]);
}
```

`src/features/master-data/index.ts`:
```ts
/** @author Lokesh */
export * from './api';
export { MASTER_KINDS, MASTER_LABELS, STALE_AFTER_MS, syncAllMasters, syncMaster, useMasterStore } from './store';
export { useMasterSync } from './use-master-sync';
export * from './hooks';
```

- [ ] **Step 6: Run tests and gates** → `npm run verify` PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(master-data): cache parties, materials, ledgers, projects and taxes with auto-sync

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Document download and open (PDFs)

**Files:**
- Create: `src/core/api/documents.ts`, `src/ui/document-button.tsx`
- Modify: `src/core/api/index.ts`, `src/ui/index.ts`
- Test: `src/core/api/documents.test.ts`

**Interfaces:**
- Consumes: `post` (Task 3), `zStr`.
- Produces:
  - `type DocumentRequest = { path: string; params: FormParams; filename: string; mimeType?: string }`
  - `openDocument(req: DocumentRequest, { regenerate?: boolean }): Promise<void>` — requests `response_data_type=data`, writes the base64 file to the cache dir and opens the system share/viewer
  - `base64ToBytes(b64: string): Uint8Array`, `safeFilename(name: string): string`
  - `DocumentButton({ request: DocumentRequest; label?: string })` — ghost button with spinner; long-press offers "Regenerate"

- [ ] **Step 1: Write the failing test**

`src/core/api/documents.test.ts`:
```ts
/** @author Lokesh */
import { base64ToBytes, safeFilename } from './documents';

test('base64ToBytes decodes standard base64, with or without a data: prefix', () => {
  expect(Array.from(base64ToBytes('SGVsbG8='))).toEqual([72, 101, 108, 108, 111]);
  expect(Array.from(base64ToBytes('data:application/pdf;base64,SGk='))).toEqual([72, 105]);
});

test('safeFilename removes path separators and odd characters', () => {
  expect(safeFilename('PO/25-26/0012.pdf')).toBe('PO_25-26_0012.pdf');
  expect(safeFilename('  ')).toBe('document.pdf');
});
```

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement**

`src/core/api/documents.ts`:
```ts
/** @author Lokesh */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { z } from 'zod';

import { post } from './client';
import { ApiError } from './errors';
import type { FormParams } from './form';
import { zStr } from './schema';

export type DocumentRequest = { path: string; params: FormParams; filename: string; mimeType?: string };

const docSchema = z.looseObject({ data: zStr, filename: zStr.optional(), ext: zStr.optional() });

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(input: string): Uint8Array {
  const b64 = input.replace(/^data:[^,]*,/, '').replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((b64.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let n = 0;
  for (const ch of b64) {
    buffer = (buffer << 6) | ALPHABET.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[n++] = (buffer >> bits) & 0xff;
    }
  }
  return out.slice(0, n);
}

export function safeFilename(name: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|\s]+/g, '_');
  return cleaned || 'document.pdf';
}

/** Downloads an xserp `*_doc` PDF (base64 mode) into the cache and opens the system viewer/share sheet. */
export async function openDocument(req: DocumentRequest, { regenerate = false } = {}): Promise<void> {
  const file = new File(Paths.cache, safeFilename(req.filename));
  if (!file.exists || regenerate) {
    const res = await post(
      req.path,
      { ...req.params, response_data_type: 'data', source: 'mobile', ...(regenerate ? { document_regenerate: 'true' } : {}) },
      { schema: docSchema, timeoutMs: 120_000 },
    );
    if (!res.data) throw new ApiError('server', 'The document is not available yet.');
    if (file.exists) file.delete();
    file.create();
    file.write(base64ToBytes(res.data));
  }
  if (!(await Sharing.isAvailableAsync())) throw new ApiError('config', 'No app available to open this document.');
  await Sharing.shareAsync(file.uri, { mimeType: req.mimeType ?? 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: req.filename });
}
```
Add `export { openDocument, type DocumentRequest } from './documents';` to `src/core/api/index.ts`. Add to `jest.setup.ts`:
```ts
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: 'cache' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
```
**Verify** in `node_modules/expo-file-system/build/index.d.ts` that SDK 57 exposes `File`, `Paths`, `file.exists`, `file.create()`, `file.write(Uint8Array)`, `file.delete()`, `file.uri`; adjust names if the API differs.

`src/ui/document-button.tsx`:
```tsx
/** @author Lokesh */
import { Alert } from 'react-native';

import { errorMessage, openDocument, type DocumentRequest } from '@/core/api';

import { Button } from './button';
import { toast } from './toast';

export function DocumentButton({ request, label = 'View PDF' }: { request: DocumentRequest; label?: string }) {
  const open = (regenerate: boolean) => openDocument(request, { regenerate }).catch((e: unknown) => void toast.show({ message: errorMessage(e), tone: 'danger' }));
  return (
    <Button
      title={label}
      icon="document-text-outline"
      variant="ghost"
      onPress={() => open(false)}
      onLongPress={() => Alert.alert('Document', 'Regenerate this document from the latest data?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Regenerate', onPress: () => void open(true) }])}
    />
  );
}
```
Add `onLongPress?: () => void` to `Button`'s props and pass it to `PressableScale`. Append `export * from './document-button';` to `src/ui/index.ts`.

- [ ] **Step 4: Run tests and gates** → `npm run verify` PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(core): download and open xserp PDF documents

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Approval engine, ModuleScreen host and Approvals inbox

**Files:**
- Create: `src/ui/module-screen.tsx`, `src/features/approvals/engine/types.ts`, `src/features/approvals/engine/action-runner.ts`, `src/features/approvals/engine/use-approval-action.ts`, `src/features/approvals/engine/pager-store.ts`, `src/features/approvals/engine/use-queue.ts`, `src/features/approvals/engine/approval-card.tsx`, `src/features/approvals/engine/queue-list.tsx`, `src/features/approvals/engine/line-items-card.tsx`, `src/features/approvals/engine/approval-page.tsx`, `src/features/approvals/engine/action-bar.tsx`, `src/features/approvals/engine/remarks-sheet.tsx`, `src/features/approvals/engine/approval-pager-screen.tsx`, `src/features/approvals/engine/index.ts`, `src/features/approvals/screens/inbox-screen.tsx`, `src/features/approvals/index.ts`, `src/modules/approval-registry.ts` (replaces stub), `src/app/(app)/approvals/index.tsx`, `src/app/(app)/approvals/[type].tsx`
- Modify: `src/ui/index.ts`
- Test: `src/features/approvals/engine/action-runner.test.ts`, `src/features/approvals/engine/types.test.ts`

**Interfaces:**
- Consumes: Tasks 3–7, 9, 13.
- Produces:
  - `@/ui`: `ModuleScreen({ title; subtitle?; actions?; tabs?: ReactNode; onRefresh?: () => Promise<unknown>; children: (host: ScrollHost) => ReactNode })`, `type ScrollHost = { attach; scrollProps; nestedProps; setRefresh: (fn: () => Promise<unknown>) => void }`, `useHostRefresh(host, fn)`
  - `@/features/approvals/engine`:
    - `type ApprovalType = 'po'|'invoice'|'oa'|'grn'|'icd'|'rate'`
    - `type ApprovalSummary = { code: string; party: string; amount?: number | null; currency?: string | null; date?: string | null; status: { label: string; tone: Tone }; meta?: { icon: IconName; text: string }[] }`
    - `type LineItem = { key: string; title: string; subtitle?: string; qty?: string; amount?: number | null; currency?: string | null }`
    - `type ApprovalCtx = { session: Session }`
    - `type ApprovalAction<T> = { id: string; label: string; icon: IconName; tone: 'primary'|'ghost'|'danger'|'success'; remarks: 'none'|'optional'|'required'; visible: (item: T, ctx: ApprovalCtx) => boolean; precheck?: (item: T) => Promise<void>; run: (item: T, remarks: string, ctx: ApprovalCtx) => Promise<void>; done: string }`
    - `type ApprovalSection<T, D> = { key: string; title: string; Component: ComponentType<{ item: T; detail: D | undefined }>; visible?: (item: T, ctx: ApprovalCtx) => boolean }`
    - `type ApprovalConfig<T, D = undefined> = { type: ApprovalType; title: string; noun: string; permission: PermissionCode; tint: ModuleTint; queueKey: readonly unknown[]; queue: () => Promise<T[]>; id: (item: T) => string; summary: (item: T) => ApprovalSummary; search?: (item: T) => (string | null | undefined)[]; detailKey?: (item: T) => readonly unknown[]; detail?: (item: T) => Promise<D>; lines?: (item: T, detail: D | undefined) => LineItem[]; sections?: ApprovalSection<T, D>[]; document?: (item: T) => DocumentRequest; actions: ApprovalAction<T>[]; invalidate?: readonly (readonly unknown[])[] }`
    - `defineApproval<T, D>(c): ApprovalConfig<T, D>`, `type AnyApproval = ApprovalConfig<unknown, unknown>`, `erase<T, D>(c): AnyApproval`
    - `visibleActions(config, item, ctx)`
    - `createActionRunner({ delayMs, onScheduled, onDone, onError })` → `{ run(key: string, task: () => Promise<void>, precheck?: () => Promise<void>): boolean; isPending(key): boolean; cancel(key): void }`
    - `useApprovalQueue(config)` (polls every `POLL_MS`), `openPager(config, items, startId)`, `QueueList({ config, host, from?: 'queue' })`, `ApprovalPagerScreen({ config })`, `ApprovalCard({ summary, tint, onPress })`, `LineItemsCard`
  - `@/modules/approval-registry`: `APPROVALS: Record<ApprovalType, AnyApproval>`, `useApprovalsTotal(): number`, `useInboxEntries(): { config: AnyApproval; count: number; loading: boolean }[]`

- [ ] **Step 1: Write the failing tests**

`src/features/approvals/engine/action-runner.test.ts`:
```ts
/** @author Lokesh */
import { createActionRunner } from './action-runner';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const setup = () => {
  const events: string[] = [];
  let undo: (() => void) | null = null;
  const runner = createActionRunner({
    delayMs: 4000,
    onScheduled: (_k, u) => {
      undo = u;
      events.push('scheduled');
    },
    onDone: () => events.push('done'),
    onError: (_k, e) => events.push(`error:${(e as Error).message}`),
  });
  return { runner, events, undo: () => undo?.() };
};

test('runs the task once after the undo window', async () => {
  const { runner, events } = setup();
  const task = jest.fn(async () => {});
  expect(runner.run('po:1:approve', task)).toBe(true);
  await Promise.resolve();
  expect(task).not.toHaveBeenCalled();
  jest.advanceTimersByTime(4000);
  await Promise.resolve();
  await Promise.resolve();
  expect(task).toHaveBeenCalledTimes(1);
  expect(events).toEqual(['scheduled', 'done']);
});

test('a double tap schedules only one request', async () => {
  const { runner } = setup();
  const task = jest.fn(async () => {});
  expect(runner.run('po:1:approve', task)).toBe(true);
  expect(runner.run('po:1:approve', task)).toBe(false);
  jest.advanceTimersByTime(4000);
  await Promise.resolve();
  await Promise.resolve();
  expect(task).toHaveBeenCalledTimes(1);
});

test('undo cancels before the request is sent', async () => {
  const { runner, undo } = setup();
  const task = jest.fn(async () => {});
  runner.run('po:1:approve', task);
  await Promise.resolve();
  undo();
  jest.advanceTimersByTime(5000);
  await Promise.resolve();
  expect(task).not.toHaveBeenCalled();
  expect(runner.isPending('po:1:approve')).toBe(false);
});

test('a failing precheck reports an error and never schedules', async () => {
  const { runner, events } = setup();
  const task = jest.fn(async () => {});
  runner.run('po:1:reject', task, async () => {
    throw new Error('GRN exists');
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(events).toEqual(['error:GRN exists']);
  expect(task).not.toHaveBeenCalled();
});
```

`src/features/approvals/engine/types.test.ts`:
```ts
/** @author Lokesh */
import { defineApproval, visibleActions } from './types';

type Item = { id: string; status: number };

const config = defineApproval<Item>({
  type: 'po',
  title: 'Purchase orders',
  noun: 'PO',
  permission: 'PURCHASE',
  tint: 'purchase',
  queueKey: ['q'],
  queue: async () => [],
  id: (i) => i.id,
  summary: (i) => ({ code: i.id, party: '', status: { label: String(i.status), tone: 'info' } }),
  actions: [
    { id: 'approve', label: 'Approve', icon: 'checkmark', tone: 'success', remarks: 'optional', visible: (i) => i.status === 0, run: async () => {}, done: 'Approved' },
    { id: 'reject', label: 'Reject', icon: 'close', tone: 'danger', remarks: 'required', visible: () => true, run: async () => {}, done: 'Rejected' },
  ],
});

test('visibleActions filters by item state', () => {
  const ctx = { session: {} as never };
  expect(visibleActions(config, { id: '1', status: 0 }, ctx).map((a) => a.id)).toEqual(['approve', 'reject']);
  expect(visibleActions(config, { id: '1', status: 2 }, ctx).map((a) => a.id)).toEqual(['reject']);
});
```

- [ ] **Step 2: Run to verify failure** → FAIL.

- [ ] **Step 3: Implement types and runner**

`src/features/approvals/engine/types.ts`:
```ts
/** @author Lokesh */
import type { ComponentType } from 'react';

import type { DocumentRequest } from '@/core/api';
import type { PermissionCode, Session } from '@/core/auth';
import type { ModuleTint, Tone } from '@/core/theme';
import type { IconName } from '@/ui';

export type ApprovalType = 'po' | 'invoice' | 'oa' | 'grn' | 'icd' | 'rate';

export type ApprovalSummary = {
  code: string;
  party: string;
  amount?: number | null;
  currency?: string | null;
  date?: string | null;
  status: { label: string; tone: Tone };
  meta?: { icon: IconName; text: string }[];
};

export type LineItem = { key: string; title: string; subtitle?: string; qty?: string; amount?: number | null; currency?: string | null };

export type ApprovalCtx = { session: Session };

export type ApprovalAction<T> = {
  id: string;
  label: string;
  icon: IconName;
  tone: 'primary' | 'ghost' | 'danger' | 'success';
  remarks: 'none' | 'optional' | 'required';
  visible: (item: T, ctx: ApprovalCtx) => boolean;
  /** Server-side "can I?" check (e.g. po/checkpogrn) — runs before the undo window. */
  precheck?: (item: T) => Promise<void>;
  run: (item: T, remarks: string, ctx: ApprovalCtx) => Promise<void>;
  /** Past-tense toast text, e.g. "PO approved". */
  done: string;
};

export type ApprovalSection<T, D> = {
  key: string;
  title: string;
  Component: ComponentType<{ item: T; detail: D | undefined }>;
  visible?: (item: T, ctx: ApprovalCtx) => boolean;
};

export type ApprovalConfig<T, D = undefined> = {
  type: ApprovalType;
  title: string;
  noun: string;
  permission: PermissionCode;
  tint: ModuleTint;
  queueKey: readonly unknown[];
  queue: () => Promise<T[]>;
  id: (item: T) => string;
  summary: (item: T) => ApprovalSummary;
  search?: (item: T) => (string | null | undefined)[];
  detailKey?: (item: T) => readonly unknown[];
  detail?: (item: T) => Promise<D>;
  lines?: (item: T, detail: D | undefined) => LineItem[];
  sections?: ApprovalSection<T, D>[];
  document?: (item: T) => DocumentRequest;
  actions: ApprovalAction<T>[];
  invalidate?: readonly (readonly unknown[])[];
};

/** Identity helper that fixes T/D inference at the definition site. */
export const defineApproval = <T, D = undefined>(c: ApprovalConfig<T, D>) => c;

/** Heterogeneous registries hold configs with erased item types; only the engine handles items. */
export type AnyApproval = ApprovalConfig<unknown, unknown>;
export const erase = <T, D>(c: ApprovalConfig<T, D>) => c as unknown as AnyApproval;

export const visibleActions = <T, D>(c: ApprovalConfig<T, D>, item: T, ctx: ApprovalCtx) => c.actions.filter((a) => a.visible(item, ctx));
```

`src/features/approvals/engine/action-runner.ts`:
```ts
/** @author Lokesh */
type Options = {
  delayMs: number;
  /** Called when the action is queued; `undo` cancels it while the window is open. */
  onScheduled: (key: string, undo: () => void) => void;
  onDone: (key: string) => void;
  onError: (key: string, error: unknown) => void;
};

/**
 * Serialises approve/reject so each (item, action) runs at most once: double taps are ignored,
 * a precheck runs first, then an undo window, then the request.
 */
export function createActionRunner({ delayMs, onScheduled, onDone, onError }: Options) {
  const pending = new Map<string, ReturnType<typeof setTimeout> | 'checking' | 'running'>();

  const cancel = (key: string) => {
    const p = pending.get(key);
    if (p && p !== 'checking' && p !== 'running') clearTimeout(p);
    if (p !== 'running') pending.delete(key);
  };

  const run = (key: string, task: () => Promise<void>, precheck?: () => Promise<void>): boolean => {
    if (pending.has(key)) return false;
    pending.set(key, 'checking');
    void (async () => {
      try {
        await precheck?.();
      } catch (e) {
        pending.delete(key);
        onError(key, e);
        return;
      }
      if (!pending.has(key)) return;
      const timer = setTimeout(async () => {
        pending.set(key, 'running');
        try {
          await task();
          onDone(key);
        } catch (e) {
          onError(key, e);
        } finally {
          pending.delete(key);
        }
      }, delayMs);
      pending.set(key, timer);
      onScheduled(key, () => cancel(key));
    })();
    return true;
  };

  return { run, cancel, isPending: (key: string) => pending.has(key) };
}
```

- [ ] **Step 4: Implement hooks, pager store, ModuleScreen**

`src/features/approvals/engine/use-queue.ts`:
```ts
/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import { POLL_MS } from '@/core/query';

import type { ApprovalConfig } from './types';

/** The pending queue for one approval type; polls while the app is open. */
export function useApprovalQueue<T, D>(config: ApprovalConfig<T, D>, enabled = true) {
  const allowed = useSessionStore((s) => can(s.session, config.permission, 'view'));
  return useQuery({ queryKey: config.queueKey, queryFn: config.queue, refetchInterval: POLL_MS, enabled: enabled && allowed });
}
```

`src/features/approvals/engine/pager-store.ts`:
```ts
/** @author Lokesh */
import { router } from 'expo-router';
import { create } from 'zustand';

import type { ApprovalConfig, ApprovalType } from './types';

type PagerState = { type: ApprovalType | null; items: unknown[]; startId: string | null };

export const usePagerStore = create<PagerState>(() => ({ type: null, items: [], startId: null }));

/** Opens the swipe pager over `items` (a queue or lookup results), starting at `startId`. */
export function openPager<T, D>(config: ApprovalConfig<T, D>, items: T[], startId: string) {
  usePagerStore.setState({ type: config.type, items, startId });
  router.push({ pathname: '/approvals/[type]', params: { type: config.type, id: startId } });
}

export const removeFromPager = (id: string, idOf: (item: unknown) => string) =>
  usePagerStore.setState((s) => ({ items: s.items.filter((i) => idOf(i) !== id) }));
```

`src/features/approvals/engine/use-approval-action.ts`:
```ts
/** @author Lokesh */
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { errorMessage } from '@/core/api';
import { refreshSession, useSessionStore } from '@/core/auth';
import { errorFeedback, successFeedback } from '@/core/utils';
import { toast } from '@/ui';

import { createActionRunner } from './action-runner';
import type { ApprovalAction, ApprovalConfig } from './types';

const UNDO_MS = 4000;

export function useApprovalAction<T, D>(config: ApprovalConfig<T, D>, onSucceeded: (id: string) => void) {
  const qc = useQueryClient();
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);

  const runner = useMemo(() => {
    const settle = (key: string) => setPendingKeys((k) => k.filter((x) => x !== key));
    return createActionRunner({
      delayMs: UNDO_MS,
      onScheduled: () => undefined,
      onDone: settle,
      onError: (key, e) => {
        settle(key);
        errorFeedback();
        toast.show({ message: errorMessage(e), tone: 'danger', durationMs: 5000 });
      },
    });
  }, []);

  const start = (item: T, action: ApprovalAction<T>, remarks: string) => {
    const session = useSessionStore.getState().session;
    if (!session) return;
    const id = config.id(item);
    const key = `${config.type}:${id}:${action.id}`;
    const accepted = runner.run(
      key,
      async () => {
        await action.run(item, remarks.trim(), { session });
        successFeedback();
        toast.show({ message: `${config.noun} ${config.summary(item).code} · ${action.done}`, tone: 'success' });
        onSucceeded(id);
        await Promise.all([
          qc.invalidateQueries({ queryKey: config.queueKey }),
          ...(config.invalidate ?? []).map((k) => qc.invalidateQueries({ queryKey: k })),
          refreshSession(session).then((s) => useSessionStore.getState().update(s)).catch(() => undefined),
        ]);
      },
      action.precheck ? () => action.precheck!(item) : undefined,
    );
    if (!accepted) return;
    setPendingKeys((k) => [...k, key]);
    toast.show({
      message: `${action.label} ${config.noun} ${config.summary(item).code}…`,
      tone: 'info',
      durationMs: UNDO_MS,
      action: { label: 'Undo', onPress: () => (runner.cancel(key), setPendingKeys((k) => k.filter((x) => x !== key))) },
    });
  };

  const isBusy = (item: T) => pendingKeys.some((k) => k.startsWith(`${config.type}:${config.id(item)}:`));
  return { start, isBusy };
}
```

`src/ui/module-screen.tsx`:
```tsx
/** @author Lokesh */
import { useCallback, useEffect, useMemo, useRef, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/core/theme';

import { usePullToSync } from './pull-to-sync';
import { ScreenHeader, type HeaderAction } from './screen-header';

export type ScrollHost = ReturnType<typeof usePullToSync> & { setRefresh: (fn: () => Promise<unknown>) => void };

type Props = { title: string; subtitle?: string; actions?: HeaderAction[]; tabs?: ReactNode; back?: boolean; children: (host: ScrollHost) => ReactElement };

/** Gradient header + one PullToSync shared by whichever tab is showing (the tab registers its refetch). */
export function ModuleScreen({ title, subtitle, actions, tabs, back, children }: Props) {
  const styles = useStyles();
  const refresh = useRef<() => Promise<unknown>>(() => Promise.resolve());
  const pull = usePullToSync(() => refresh.current());
  const setRefresh = useCallback((fn: () => Promise<unknown>) => {
    refresh.current = fn;
  }, []);
  const host = useMemo(() => ({ ...pull, setRefresh }), [pull, setRefresh]);
  return (
    <View style={styles.root}>
      <ScreenHeader title={title} subtitle={subtitle} actions={actions} tabs={tabs} back={back} pull={pull.indicator} />
      <View style={styles.body}>{children(host)}</View>
    </View>
  );
}

/** Tabs call this so the header's pull-to-refresh syncs what is on screen. */
export function useHostRefresh(host: ScrollHost, fn: () => Promise<unknown>) {
  useEffect(() => host.setRefresh(fn), [host, fn]);
}

const useStyles = makeStyles((t) => ({ root: { flex: 1, backgroundColor: t.colors.bg }, body: { flex: 1 } }));
```
Append `export * from './module-screen';` to `src/ui/index.ts`.

- [ ] **Step 5: Implement list, card, page, action bar, remarks sheet, pager**

`src/features/approvals/engine/approval-card.tsx` — Despack DocCard: `Card tint={tint} onPress`, row 1: `summary.code` (heading) + `StatusPill` top-right; row 2: `business-outline` icon + `summary.party` (label, 1 line); divider; row 3: left `formatDate(summary.date)` + first `meta` item (caption, muted) — right `formatMoney(summary.amount, summary.currency ?? '₹')` (heading 17) when amount is a number.
```tsx
/** @author Lokesh */
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, formatMoney } from '@/core/utils';
import { Card, StatusPill, Text } from '@/ui';

import type { ApprovalSummary } from './types';

export function ApprovalCard({ summary, tint, onPress }: { summary: ApprovalSummary; tint: string; onPress?: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Card tint={tint} onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Text variant="heading" numberOfLines={1} style={styles.flex}>
          {summary.code}
        </Text>
        <StatusPill label={summary.status.label} tone={summary.status.tone} />
      </View>
      <View style={styles.party}>
        <Ionicons name="business-outline" size={14} color={t.colors.textMuted} />
        <Text variant="label" color={t.colors.textMuted} numberOfLines={1} style={styles.flex}>
          {summary.party || '—'}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <View style={styles.meta}>
          <Text variant="caption" color={t.colors.textMuted}>
            {formatDate(summary.date)}
          </Text>
          {summary.meta?.slice(0, 1).map((m) => (
            <View key={m.text} style={styles.metaItem}>
              <Ionicons name={m.icon} size={12} color={t.colors.textFaint} />
              <Text variant="caption" color={t.colors.textFaint} numberOfLines={1}>
                {m.text}
              </Text>
            </View>
          ))}
        </View>
        {typeof summary.amount === 'number' && (
          <Text variant="heading" style={styles.amount}>
            {formatMoney(summary.amount, summary.currency || '₹')}
          </Text>
        )}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { marginBottom: 12, paddingLeft: 20, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1 },
  party: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  divider: { height: 1, backgroundColor: t.colors.divider, marginVertical: 2 },
  meta: { flex: 1, gap: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount: { fontSize: 17 },
}));
```

`src/features/approvals/engine/queue-list.tsx`:
```tsx
/** @author Lokesh */
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFocusRefetch } from '@/core/query';
import { makeStyles, useTheme } from '@/core/theme';
import { filterItems } from '@/core/utils';
import { ListSkeleton, QueryState, SearchField, useHostRefresh, type ScrollHost } from '@/ui';

import { ApprovalCard } from './approval-card';
import { openPager } from './pager-store';
import type { ApprovalConfig } from './types';
import { useApprovalQueue } from './use-queue';

/** A module's "Pending" tab: searchable, virtualised queue that opens the swipe pager. */
export function QueueList<T, D>({ config, host }: { config: ApprovalConfig<T, D>; host: ScrollHost }) {
  const t = useTheme();
  const styles = useStyles();
  const query = useApprovalQueue(config);
  const [search, setSearch] = useState('');
  const refetch = useCallback(() => query.refetch(), [query]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  const items = useMemo(() => filterItems(query.data ?? [], search, (i) => config.search?.(i) ?? [config.summary(i).code, config.summary(i).party]), [query.data, search, config]);

  return (
    <QueryState query={query} skeleton={<View style={styles.pad}><ListSkeleton /></View>} isEmpty={(d) => d.length === 0} empty={{ icon: 'checkmark-done-outline', title: 'All caught up', message: `No ${config.title.toLowerCase()} are waiting for you.` }}>
      {() =>
        host.attach(
          <Animated.FlatList
            {...host.scrollProps}
            data={items}
            keyExtractor={config.id}
            contentContainerStyle={styles.pad}
            initialNumToRender={8}
            windowSize={7}
            ListHeaderComponent={<View style={styles.search}><SearchField value={search} onChangeText={setSearch} placeholder={`Search ${config.title.toLowerCase()}`} /></View>}
            renderItem={({ item }) => <ApprovalCard summary={config.summary(item)} tint={t.tints[config.tint]} onPress={() => openPager(config, items, config.id(item))} />}
          />,
        )
      }
    </QueryState>
  );
}

const useStyles = makeStyles((t) => ({ pad: { padding: t.space.gutter, paddingBottom: 48 }, search: { marginBottom: 14 } }));
```

`src/features/approvals/engine/line-items-card.tsx`: `Section title="Items"` + `Card` listing each `LineItem`: title (label, 2 lines), subtitle (caption muted), right column qty (caption) over amount (label bold, `formatMoney`). Rows separated by `divider`. If `lines` is empty while detail loads, render 2 `Bone` rows.

`src/features/approvals/engine/remarks-sheet.tsx`:
```tsx
/** @author Lokesh */
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/core/theme';
import { BottomSheet, Button, Input } from '@/ui';

import type { ApprovalAction } from './types';

type Props<T> = { action: ApprovalAction<T> | null; onClose: () => void; onConfirm: (remarks: string) => void };

export function RemarksSheet<T>({ action, onClose, onConfirm }: Props<T>) {
  const styles = useStyles();
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setRemarks('');
    setError(null);
  }, [action]);
  if (!action) return null;
  return (
    <BottomSheet visible onClose={onClose} title={action.label}>
      <View style={styles.body}>
        {action.remarks !== 'none' && (
          <Input label={action.remarks === 'required' ? 'Remarks (required)' : 'Remarks (optional)'} icon="chatbox-ellipses-outline" value={remarks} onChangeText={setRemarks} multiline error={error} autoFocus />
        )}
        <Button
          title={action.label}
          icon={action.icon}
          variant={action.tone}
          onPress={() => {
            if (action.remarks === 'required' && !remarks.trim()) return setError('Please add a reason.');
            onConfirm(remarks);
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles(() => ({ body: { paddingHorizontal: 20, gap: 16 } }));
```

`src/features/approvals/engine/action-bar.tsx`: absolute bottom bar (`surface`, top border `divider`, `paddingBottom: insets.bottom + 10`, `shadow.lifted`) rendering one `Button size="sm"` per visible action in a row (`flex: 1`), disabled when `busy`. Props: `{ actions: ApprovalAction<T>[]; busy: boolean; onPick: (a: ApprovalAction<T>) => void }`. Renders nothing when `actions` is empty, otherwise shows a caption "You can't act on this document" when the user lacks the permission (props `canAct: boolean`).

`src/features/approvals/engine/approval-page.tsx`:
```tsx
/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';

import { useSession } from '@/core/auth';
import { makeStyles, useTheme } from '@/core/theme';
import { formatDate, formatMoney } from '@/core/utils';
import { Card, DocumentButton, Section, StatusPill, Text } from '@/ui';

import { LineItemsCard } from './line-items-card';
import type { ApprovalConfig } from './types';

/** One document in the pager: hero summary, line items, extra sections, document button. */
export function ApprovalPage<T, D>({ config, item, active, width }: { config: ApprovalConfig<T, D>; item: T; active: boolean; width: number }) {
  const t = useTheme();
  const styles = useStyles();
  const session = useSession();
  const s = config.summary(item);
  const detail = useQuery({
    queryKey: config.detailKey?.(item) ?? [config.type, 'detail', config.id(item)],
    queryFn: () => config.detail!(item),
    enabled: !!config.detail && active,
  });
  const lines = config.lines?.(item, detail.data) ?? [];
  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card tint={t.tints[config.tint]} style={styles.hero}>
        <View style={styles.row}>
          <Text variant="overline" color={t.tints[config.tint]}>
            {config.noun}
          </Text>
          <StatusPill label={s.status.label} tone={s.status.tone} />
        </View>
        <Text variant="title" selectable>
          {s.code}
        </Text>
        <Text variant="label" color={t.colors.textMuted}>
          {s.party || '—'}
        </Text>
        {typeof s.amount === 'number' && (
          <Text variant="display" style={styles.amount}>
            {formatMoney(s.amount, s.currency || '₹')}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text variant="caption" color={t.colors.textMuted}>
            {formatDate(s.date)}
          </Text>
          {s.meta?.map((m) => (
            <Text key={m.text} variant="caption" color={t.colors.textMuted}>
              · {m.text}
            </Text>
          ))}
        </View>
      </Card>
      {config.lines && <LineItemsCard lines={lines} loading={detail.isPending && !!config.detail} />}
      {config.sections
        ?.filter((sec) => sec.visible?.(item, { session }) ?? true)
        .map((sec) => (
          <Section key={sec.key} title={sec.title}>
            <sec.Component item={item} detail={detail.data} />
          </Section>
        ))}
      {config.document && (
        <View style={styles.doc}>
          <DocumentButton request={config.document(item)} />
        </View>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.space.gutter, paddingBottom: 140 },
  hero: { gap: 6, paddingLeft: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { marginTop: 6, fontSize: 26, lineHeight: 32 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  doc: { marginTop: 20 },
}));
```

`src/features/approvals/engine/approval-pager-screen.tsx`:
```tsx
/** @author Lokesh */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';

import { useSession } from '@/core/auth';
import { can } from '@/core/permissions';
import { makeStyles } from '@/core/theme';
import { ScreenHeader, StateView, toast } from '@/ui';

import { ActionBar } from './action-bar';
import { ApprovalPage } from './approval-page';
import { removeFromPager, usePagerStore } from './pager-store';
import { RemarksSheet } from './remarks-sheet';
import { visibleActions, type ApprovalAction, type ApprovalConfig } from './types';
import { useApprovalAction } from './use-approval-action';
import { useApprovalQueue } from './use-queue';

export function ApprovalPagerScreen<T, D>({ config }: { config: ApprovalConfig<T, D> }) {
  const styles = useStyles();
  const session = useSession();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const pager = usePagerStore();
  // Deep links / app restarts land here without pager items: fall back to the live queue.
  const fromStore = pager.type === config.type && pager.items.length > 0;
  const queue = useApprovalQueue(config, !fromStore);
  const items = useMemo(() => (fromStore ? (pager.items as T[]) : (queue.data ?? [])), [fromStore, pager.items, queue.data]);
  const startIndex = Math.max(0, items.findIndex((i) => config.id(i) === (pager.startId ?? id)));
  const [index, setIndex] = useState(startIndex);
  const [picked, setPicked] = useState<ApprovalAction<T> | null>(null);
  const list = useRef<FlatList<T>>(null);
  const current = items[Math.min(index, items.length - 1)];
  const canAct = can(session, config.permission, 'approve');

  const { start, isBusy } = useApprovalAction(config, (doneId) => removeFromPager(doneId, config.id as (i: unknown) => string));

  useEffect(() => {
    if (fromStore && items.length === 0) {
      toast.show({ message: `No more ${config.title.toLowerCase()} to review`, tone: 'success' });
      router.back();
    }
  }, [fromStore, items.length, config.title]);

  if (!current) {
    return (
      <View style={styles.root}>
        <ScreenHeader title={config.title} />
        <View style={styles.pad}>
          <StateView icon="checkmark-done-outline" title="All caught up" message={`No ${config.title.toLowerCase()} are waiting for you.`} />
        </View>
      </View>
    );
  }

  const actions = canAct ? visibleActions(config, current, { session }) : [];
  return (
    <View style={styles.root}>
      <ScreenHeader title={config.title} subtitle={`${Math.min(index, items.length - 1) + 1} of ${items.length}`} />
      <FlatList
        ref={list}
        data={items}
        horizontal
        pagingEnabled
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={config.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => <ApprovalPage config={config} item={item} active={Math.abs(i - index) <= 1} width={width} />}
      />
      <ActionBar actions={actions} canAct={canAct} busy={isBusy(current)} onPick={setPicked} />
      <RemarksSheet action={picked} onClose={() => setPicked(null)} onConfirm={(remarks) => picked && start(current, picked, remarks)} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({ root: { flex: 1, backgroundColor: t.colors.bg }, pad: { padding: t.space.gutter } }));
```

`src/features/approvals/engine/index.ts`:
```ts
/** @author Lokesh */
export * from './types';
export { createActionRunner } from './action-runner';
export { useApprovalQueue } from './use-queue';
export { openPager } from './pager-store';
export { QueueList } from './queue-list';
export { ApprovalCard } from './approval-card';
export { LineItemsCard } from './line-items-card';
export { ApprovalPagerScreen } from './approval-pager-screen';
```

- [ ] **Step 6: Inbox screen, registry and routes**

`src/features/approvals/screens/inbox-screen.tsx`: `ModuleScreen title="Approvals" subtitle="Everything awaiting you"`. Body: `Animated.ScrollView` via `host.attach` with one `Card` per entry (`onPress → router.push(entry.href)`): tinted icon tile, `config.title`, caption "N waiting" (or "Checking…" while loading, "All caught up" at 0), right `Badge count`. Registers refresh = refetch of all entry queries (passed in as `onRefresh` prop). Props: `{ entries: { key: string; title: string; icon: IconName; tint: ModuleTint; count: number; loading: boolean; href: Href }[]; onRefresh: () => Promise<unknown> }`. Empty (no permitted entries) → `StateView icon="lock-closed-outline" title="Nothing to approve" message="You don't have approval rights on any module."`.

`src/features/approvals/index.ts`:
```ts
/** @author Lokesh */
export { InboxScreen } from './screens/inbox-screen';
```

`src/modules/approval-registry.ts` (filled in progressively by Tasks 15–21; start with an empty record and the hooks):
```ts
/** @author Lokesh */
import { useQueries } from '@tanstack/react-query';
import type { Href } from 'expo-router';

import { useSessionStore } from '@/core/auth';
import { can } from '@/core/permissions';
import { POLL_MS } from '@/core/query';
import type { AnyApproval, ApprovalType } from '@/features/approvals/engine';

// Each module task adds its config here, e.g. `po: erase(poApproval)`.
export const APPROVALS: Partial<Record<ApprovalType, AnyApproval>> = {};

const HREF: Record<ApprovalType, Href> = {
  po: '/purchase?tab=pending',
  invoice: '/sales?tab=pendingInvoices',
  oa: '/sales?tab=pendingOa',
  grn: '/stores?tab=grn',
  icd: '/audit?tab=pending',
  rate: '/masters?tab=rates',
};

export function useInboxEntries() {
  const session = useSessionStore((s) => s.session);
  const configs = Object.values(APPROVALS).filter((c): c is AnyApproval => !!c && can(session, c.permission, 'approve'));
  const results = useQueries({ queries: configs.map((c) => ({ queryKey: c.queueKey, queryFn: c.queue, refetchInterval: POLL_MS })) });
  return configs.map((config, i) => ({ config, href: HREF[config.type], count: results[i]?.data?.length ?? 0, loading: results[i]?.isPending ?? true, refetch: () => results[i]?.refetch() }));
}

export function useApprovalsTotal(): number {
  return useInboxEntries().reduce((n, e) => n + e.count, 0);
}
```

`src/app/(app)/approvals/index.tsx`:
```tsx
/** @author Lokesh */
import { useCallback } from 'react';

import { InboxScreen } from '@/features/approvals';
import { useInboxEntries } from '@/modules/approval-registry';

export default function Approvals() {
  const entries = useInboxEntries();
  const refresh = useCallback(() => Promise.all(entries.map((e) => e.refetch())), [entries]);
  return (
    <InboxScreen
      entries={entries.map((e) => ({ key: e.config.type, title: e.config.title, icon: 'document-text-outline', tint: e.config.tint, count: e.count, loading: e.loading, href: e.href }))}
      onRefresh={refresh}
    />
  );
}
```

`src/app/(app)/approvals/[type].tsx`:
```tsx
/** @author Lokesh */
import { useLocalSearchParams } from 'expo-router';

import { ApprovalPagerScreen, type ApprovalType } from '@/features/approvals/engine';
import { StateView } from '@/ui';
import { APPROVALS } from '@/modules/approval-registry';

export default function ApprovalPager() {
  const { type } = useLocalSearchParams<{ type: ApprovalType }>();
  const config = APPROVALS[type];
  if (!config) return <StateView icon="help-circle-outline" title="Unknown approval type" />;
  return <ApprovalPagerScreen config={config} />;
}
```

- [ ] **Step 7: Run tests and gates** → `npm run verify` PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(approvals): add generic approval engine, swipe pager, undo-safe actions and inbox

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
## Module tasks (15–22) — shared conventions

Every module task follows the same shape; each task below lists its concrete code.

1. **Fixtures first.** For every endpoint the task uses, capture one real response from dev.xserp.in into `__fixtures__/<module>/<endpoint>.json` with the curl pattern from Task 4 Step 1 (form fields: the endpoint's params + `token`, `user_id`, `enterprise_id`, `csrfmiddlewaretoken`). Trim lists to ≤ 3 rows and anonymise party/person names. If an endpoint returns nothing in dev, hand-write the fixture from the field list in the task.
2. **Schemas** use `z.looseObject` and the Task 3 helpers only — never `z.object`/strict number types for server data. If a fixture shows a field the task did not list, do not add it unless a screen needs it. If a field the task lists is missing from the fixture, keep it (`zStr`/`zNum` default to `''`/`0`).
3. **`api.ts`** exports plain async functions returning mapped domain types; **`keys.ts`** exports the module's query-key factory; **`hooks.ts`** wraps `useQuery` with those keys; screens never call `post`.
4. **Test** each task with `src/features/<module>/api.test.ts`: every fixture parses through its schema, and mapping functions produce the expected domain values (status labels/tones, money numbers).
5. **Register** the module's approval configs in `src/modules/approval-registry.ts` with `erase(...)`.
6. **Gate** with `npm run verify`, run the module on a device against dev.xserp.in, then commit.

---

### Task 15: Purchase module

**Files:**
- Create: `src/features/purchase/{schemas.ts,api.ts,keys.ts,hooks.ts,status.ts,approvals.tsx,index.ts}`, `src/features/purchase/screens/purchase-screen.tsx`, `src/features/purchase/components/{dashboard-tab.tsx,lookup-tab.tsx,material-sheet.tsx,outstanding-section.tsx}`, `src/app/(app)/purchase/index.tsx`, `__fixtures__/purchase/{dashboard,po_draft,poSearch,poDraftDetails,finance_year,poMaterialDetail,poMaterial_overDue}.json`
- Modify: `src/features/approvals/engine/types.ts` (add `lineSheet`), `src/features/approvals/engine/line-items-card.tsx`, `src/features/approvals/engine/approval-page.tsx`, `src/modules/approval-registry.ts`
- Test: `src/features/purchase/api.test.ts`

**Interfaces:**
- Consumes: engine (Task 14), master-data hooks (Task 12), UI, `useCan`.
- Produces:
  - `type PurchaseOrder = { id: string; code: string; draftedOn: string | null; approvedOn: string | null; supplierId: string; supplierName: string; projectCode: string; projectName: string; value: number; currency: string; quantity: number; unit: string; materialStatus: string; deliveryStatus: string; dueDays: number; status: number; poType: number; indentCode: string }`
  - `type PoMaterial = { itemId: string; makeId: string; drawingNo: string; name: string; makeName: string; quantity: number; price: number; discount: number; unit: string; storePrice: number }`
  - `type PoFilters = { range: DateRange; status: string; supplierId: string | null; projectCode: string | null; itemId: string | null; financeYear: string; poNo: string }`, `DEFAULT_PO_FILTERS(): PoFilters`
  - `fetchPurchaseDashboard()`, `searchPurchaseOrders(f)`, `fetchDraftPOs()`, `fetchPoMaterials(po)`, `fetchPoFinanceYears()`, `fetchSupplierProfile(po, material)`, `fetchMaterialOverdue(po, material)`, `fetchMaterialStock(itemId)` — and actions `approvePO(po, remarks)`, `reviewPO(po, remarks)`, `checkCanRejectPO(po)`, `rejectPO(po, remarks)`
  - `poStatus(status): { label: string; tone: Tone }`
  - `poApproval: ApprovalConfig<PurchaseOrder, PoMaterial[]>`
  - `PurchaseScreen`
  - engine addition: `ApprovalConfig.lineSheet?: ComponentType<{ item: T; lineKey: string; detail: D | undefined }>`

- [ ] **Step 1: Extend the engine with tappable lines**

In `src/features/approvals/engine/types.ts` add to `ApprovalConfig<T, D>`:
```ts
  /** When set, line items are tappable and open this component in a bottom sheet. */
  lineSheet?: ComponentType<{ item: T; lineKey: string; detail: D | undefined }>;
```
In `line-items-card.tsx` accept `onPress?: (key: string) => void` and wrap each row in `PressableScale` (chevron-forward icon on the right) when it is set. In `approval-page.tsx` keep `const [line, setLine] = useState<string | null>(null)`, pass `onPress={config.lineSheet ? setLine : undefined}` to `LineItemsCard`, and render:
```tsx
{config.lineSheet && (
  <BottomSheet visible={!!line} onClose={() => setLine(null)} title="Material">
    {line && <config.lineSheet item={item} lineKey={line} detail={detail.data} />}
  </BottomSheet>
)}
```

- [ ] **Step 2: Capture fixtures** (conventions §1) for: `purchase/json/dashboard/`, `purchase/json/po_draft/`, `purchase/json/poSearch/` (`status=100`, `since`/`till` = last 30 days, `finance_year=-1`), `purchase/json/poDraftDetails/` (`po_id` from the draft list), `purchase/json/finance_year/`, `purchase/json/poMaterialDetail/` (`item_id`, `party_id`, `po_date`, `po_type`), `purchase/json/poMaterial_overDue/` (`item_id`, `po_party_id`, `po_date`, `po_type`).

- [ ] **Step 3: Write the failing test**

`src/features/purchase/api.test.ts`:
```ts
/** @author Lokesh */
import dashboard from '../../../__fixtures__/purchase/dashboard.json';
import detail from '../../../__fixtures__/purchase/poDraftDetails.json';
import drafts from '../../../__fixtures__/purchase/po_draft.json';
import fy from '../../../__fixtures__/purchase/finance_year.json';
import overdue from '../../../__fixtures__/purchase/poMaterial_overDue.json';
import profile from '../../../__fixtures__/purchase/poMaterialDetail.json';
import search from '../../../__fixtures__/purchase/poSearch.json';

import { toPurchaseOrder } from './api';
import { financeYearsSchema, outstandingSchema, poDashboardSchema, poDetailSchema, poListSchema, supplierProfileSchema } from './schemas';
import { poStatus } from './status';

test('fixtures parse', () => {
  expect(() => poDashboardSchema.parse(dashboard)).not.toThrow();
  expect(poListSchema.parse(drafts).po_list.length).toBeGreaterThanOrEqual(0);
  expect(() => poListSchema.parse(search)).not.toThrow();
  expect(() => poDetailSchema.parse(detail)).not.toThrow();
  expect(() => financeYearsSchema.parse(fy)).not.toThrow();
  expect(() => supplierProfileSchema.parse(profile)).not.toThrow();
  expect(() => outstandingSchema.parse(overdue)).not.toThrow();
});

test('maps a PO row', () => {
  const row = poListSchema.parse({ po_list: [{ po_id: 31, po_code: 'PO/25-26/0012', po_value: '12,500.00', status: '0', supplier_name: 'Acme', currency_symbol: '' }] }).po_list[0]!;
  const po = toPurchaseOrder(row);
  expect(po).toMatchObject({ id: '31', code: 'PO/25-26/0012', value: 12500, status: 0, supplierName: 'Acme', currency: '₹' });
});

test('status labels', () => {
  expect(poStatus(0)).toEqual({ label: 'Draft', tone: 'warning' });
  expect(poStatus(1)).toEqual({ label: 'Reviewed', tone: 'info' });
  expect(poStatus(2)).toEqual({ label: 'Approved', tone: 'success' });
  expect(poStatus(3)).toEqual({ label: 'Rejected', tone: 'danger' });
  expect(poStatus(-1).tone).toBe('neutral');
});
```

- [ ] **Step 4: Run to verify failure** → FAIL.

- [ ] **Step 5: Implement schemas, status, api, keys, hooks**

`src/features/purchase/schemas.ts`:
```ts
/** @author Lokesh */
import { z } from 'zod';

import { zId, zList, zNum, zStr, zStrOrNull } from '@/core/api';

const party = z.looseObject({ id: zId, code: zStr, name: zStr });

export const purchaseOrderSchema = z.looseObject({
  po_id: zId,
  po_code: zStr,
  drafted_on: zStrOrNull,
  approved_on: zStrOrNull,
  supplier_name: zStr,
  supplier: party.nullish(),
  project_code: zStr,
  project_name: zStr,
  po_value: zNum,
  currency_name: zStr,
  currency_symbol: zStr,
  quantity: zNum,
  unit: zStr,
  material_status: zStr,
  delivery_status: zStr,
  due_days: zNum,
  status: zNum,
  po_type: zNum,
  indent: z.looseObject({ code: zStr }).nullish(),
});
export type PurchaseOrderRow = z.infer<typeof purchaseOrderSchema>;

export const poListSchema = z.looseObject({ po_list: zList(purchaseOrderSchema) });

export const poMaterialSchema = z.looseObject({
  item_id: zId,
  make_id: zId,
  drawing_no: zStr,
  name: zStr,
  make_name: zStr,
  quantity: zNum,
  price: zNum,
  discount: zNum,
  unit: zStr,
  store_price: zNum,
});
export const poDetailSchema = z.looseObject({ materials: zList(poMaterialSchema), supplier: party.nullish() });

export const poDashboardSchema = z.looseObject({
  indent_raised: zNum,
  indent_closed: zNum,
  indent_pending: zNum,
  indent_due_po: zNum,
  indent_due_material: zNum,
  pending: zNum,
  pending_on_track: zNum,
  pending_delayed: zNum,
  part_supplied: zNum,
  part_on_track: zNum,
  part_delayed: zNum,
  performance: zList(z.looseObject({ po_month: zStr, on_time: zNum, delayed: zNum })),
});

export const financeYearsSchema = z.looseObject({ financial_years: zList(zStr) });

const priceRow = z.looseObject({
  price: zNum,
  status: zNum,
  effect_since: zStrOrNull,
  effect_till: zStrOrNull,
  name: zStr.optional(),
  supplier: party.nullish(),
  make: zStr.optional(),
  label: zStr.optional(),
  currency_name: zStr.optional(),
});
export const supplierProfileSchema = z.looseObject({ supplier_prices: zList(priceRow), supplier_history: zList(priceRow) });

export const agingSchema = z.looseObject({ age1: zNum, age2: zNum, age3: zNum, age4: zNum, overdue: zNum, total: zNum, advance: zNum, billable: zNum });
export const outstandingSchema = z.looseObject({
  outstanding: zList(z.looseObject({ id: zId, name: zStr, due: zNum, total: zNum, overdue: zNum, aging: agingSchema.nullish() })),
});

export const materialStockSchema = z.looseObject({
  material_stock: zList(z.looseObject({ closing_stock: zNum, opening_stock: zNum, location: zStr.optional(), name: zStr.optional() })),
  closing_stock: zNum.optional(),
});
```

`src/features/purchase/status.ts`:
```ts
/** @author Lokesh */
import type { Tone } from '@/core/theme';

const MAP: Record<number, { label: string; tone: Tone }> = {
  0: { label: 'Draft', tone: 'warning' },
  1: { label: 'Reviewed', tone: 'info' },
  2: { label: 'Approved', tone: 'success' },
  3: { label: 'Rejected', tone: 'danger' },
};

export const poStatus = (status: number) => MAP[status] ?? { label: 'Cancelled', tone: 'neutral' as Tone };

export const PO_STATUS_OPTIONS = [
  { value: '100', label: 'All' },
  { value: '0', label: 'Draft' },
  { value: '1', label: 'Reviewed' },
  { value: '2', label: 'Approved' },
  { value: '3', label: 'Rejected' },
];
```

`src/features/purchase/api.ts`:
```ts
/** @author Lokesh */
import { post, postOk } from '@/core/api';
import { lastDays, rangeParams, type DateRange } from '@/core/utils';

import { financeYearsSchema, materialStockSchema, outstandingSchema, poDashboardSchema, poDetailSchema, poListSchema, supplierProfileSchema, type PurchaseOrderRow } from './schemas';

export type PurchaseOrder = {
  id: string;
  code: string;
  draftedOn: string | null;
  approvedOn: string | null;
  supplierId: string;
  supplierName: string;
  projectCode: string;
  projectName: string;
  value: number;
  currency: string;
  quantity: number;
  unit: string;
  materialStatus: string;
  deliveryStatus: string;
  dueDays: number;
  status: number;
  poType: number;
  indentCode: string;
};

export type PoMaterial = { itemId: string; makeId: string; drawingNo: string; name: string; makeName: string; quantity: number; price: number; discount: number; unit: string; storePrice: number };

export type PoFilters = { range: DateRange; status: string; supplierId: string | null; projectCode: string | null; itemId: string | null; financeYear: string; poNo: string };
export const DEFAULT_PO_FILTERS = (): PoFilters => ({ range: lastDays(30), status: '100', supplierId: null, projectCode: null, itemId: null, financeYear: '-1', poNo: '' });

export const toPurchaseOrder = (r: PurchaseOrderRow): PurchaseOrder => ({
  id: r.po_id,
  code: r.po_code,
  draftedOn: r.drafted_on,
  approvedOn: r.approved_on,
  supplierId: r.supplier?.id ?? '',
  supplierName: r.supplier_name || r.supplier?.name || '',
  projectCode: r.project_code,
  projectName: r.project_name,
  value: r.po_value,
  currency: r.currency_symbol || '₹',
  quantity: r.quantity,
  unit: r.unit,
  materialStatus: r.material_status,
  deliveryStatus: r.delivery_status,
  dueDays: r.due_days,
  status: r.status,
  poType: r.po_type,
  indentCode: r.indent?.code ?? '',
});

export const fetchPurchaseDashboard = () => post('purchase/json/dashboard/', {}, { schema: poDashboardSchema });

export async function searchPurchaseOrders(f: PoFilters): Promise<PurchaseOrder[]> {
  const res = await post(
    'purchase/json/poSearch/',
    {
      ...rangeParams(f.range),
      po_no: f.poNo,
      status: f.status,
      supplierId: f.supplierId ?? '',
      project_code: f.projectCode ?? '',
      item_id: f.itemId ?? '',
      finance_year: f.financeYear,
    },
    { schema: poListSchema, timeoutMs: 90_000 },
  );
  return res.po_list.map(toPurchaseOrder);
}

export const fetchDraftPOs = async () => (await post('purchase/json/po_draft/', {}, { schema: poListSchema })).po_list.map(toPurchaseOrder);

export async function fetchPoMaterials(po: PurchaseOrder): Promise<PoMaterial[]> {
  const res = await post('purchase/json/poDraftDetails/', { po_id: po.id }, { schema: poDetailSchema });
  return res.materials.map((m) => ({ itemId: m.item_id, makeId: m.make_id, drawingNo: m.drawing_no, name: m.name, makeName: m.make_name, quantity: m.quantity, price: m.price, discount: m.discount, unit: m.unit, storePrice: m.store_price }));
}

export const fetchPoFinanceYears = async () => (await post('purchase/json/finance_year/', {}, { schema: financeYearsSchema })).financial_years;

const poDate = (po: PurchaseOrder) => (po.draftedOn ?? '').slice(0, 10);
const isJob = (po: PurchaseOrder) => (po.poType === 1 ? 'true' : 'false');

export const fetchSupplierProfile = (po: PurchaseOrder, m: PoMaterial) =>
  post('purchase/json/poMaterialDetail/', { item_id: m.itemId, party_id: po.supplierId, po_date: poDate(po), po_type: isJob(po) }, { schema: supplierProfileSchema });

export const fetchMaterialOverdue = async (po: PurchaseOrder, m: PoMaterial) =>
  (await post('purchase/json/poMaterial_overDue/', { item_id: m.itemId, po_party_id: po.supplierId, po_date: poDate(po), po_type: isJob(po) }, { schema: outstandingSchema })).outstanding;

export const fetchMaterialStock = (itemId: string) => post('stores/json/material_stock/', { item_id: itemId }, { schema: materialStockSchema });

export async function approvePO(po: PurchaseOrder, remarks: string) {
  await postOk('purchase/json/po/approve/', { po_id: po.id, project_code: po.projectCode, remarks, approve_po_type: po.poType });
}
export async function reviewPO(po: PurchaseOrder, remarks: string) {
  await postOk('purchase/json/po/review/', { po_id: po.id, remarks });
}
/** Server refuses to reject a PO that already has received material. */
export async function checkCanRejectPO(po: PurchaseOrder) {
  await postOk('purchase/json/po/checkpogrn/', { po_id: po.id });
}
export async function rejectPO(po: PurchaseOrder, remarks: string) {
  await postOk('purchase/json/po/reject/', { po_id: po.id, remarks });
}
```

`src/features/purchase/keys.ts`:
```ts
/** @author Lokesh */
import type { PoFilters } from './api';

const all = ['purchase'] as const;
export const purchaseKeys = {
  all,
  dashboard: () => [...all, 'dashboard'] as const,
  drafts: () => [...all, 'drafts'] as const,
  search: (f: PoFilters) => [...all, 'search', { ...f, range: [f.range.since.toDateString(), f.range.till.toDateString()] }] as const,
  materials: (poId: string) => [...all, 'materials', poId] as const,
  financeYears: () => [...all, 'financeYears'] as const,
  profile: (poId: string, itemId: string) => [...all, 'profile', poId, itemId] as const,
  overdue: (poId: string, itemId: string) => [...all, 'overdue', poId, itemId] as const,
  stock: (itemId: string) => ['stores', 'material-stock', itemId] as const,
};
```

`src/features/purchase/hooks.ts`:
```ts
/** @author Lokesh */
import { useQuery } from '@tanstack/react-query';

import { fetchPoFinanceYears, fetchPurchaseDashboard, searchPurchaseOrders, type PoFilters } from './api';
import { purchaseKeys } from './keys';

export const usePurchaseDashboard = () => useQuery({ queryKey: purchaseKeys.dashboard(), queryFn: fetchPurchaseDashboard });
export const usePoSearch = (f: PoFilters) => useQuery({ queryKey: purchaseKeys.search(f), queryFn: () => searchPurchaseOrders(f), placeholderData: (prev) => prev });
export const usePoFinanceYears = () => useQuery({ queryKey: purchaseKeys.financeYears(), queryFn: fetchPoFinanceYears, staleTime: 60 * 60_000 });
```

- [ ] **Step 6: Approval config and its sections**

`src/features/purchase/components/material-sheet.tsx` — the XSManager `POMaterialDialog`: given `item: PurchaseOrder`, `lineKey` (= `itemId:makeId`) and `detail: PoMaterial[]`, find the material, then show: header (name, drawing no, make), `KeyValue` rows (Qty, Rate `formatMoney`, Discount %, Store price); `Section "Supplier prices"` from `useQuery(purchaseKeys.profile(...), fetchSupplierProfile)` listing `supplier_prices` (party name `row.supplier?.name ?? row.name`, price, `effect_since – effect_till`, StatusPill Approved(1)/Pending(0)/Rejected(-1)); `Section "Stock"` from `useQuery(purchaseKeys.stock(itemId), fetchMaterialStock)` showing closing stock; `Section "Supplier outstanding"` (only if `useCan('ACCOUNTS','view')`) from `fetchMaterialOverdue` showing each ledger `name`, `due`, `overdue` via `KeyValue`. Each query renders through `QueryState` with a 2-row skeleton.

`src/features/purchase/components/outstanding-section.tsx` — `Component` for the `sections` entry: uses the first material of `detail` (if any) to call `fetchMaterialOverdue` and renders a `Card` of `KeyValue` rows: Total due, Overdue (danger colour), 0–30/31–60/61–90/90+ from `aging.age1..age4`. Renders `StateView` "No outstanding" when empty.

`src/features/purchase/approvals.tsx`:
```tsx
/** @author Lokesh */
import { can } from '@/core/permissions';
import { defineApproval } from '@/features/approvals/engine';
import { formatQty } from '@/core/utils';

import { approvePO, checkCanRejectPO, fetchDraftPOs, fetchPoMaterials, rejectPO, reviewPO, type PoMaterial, type PurchaseOrder } from './api';
import { MaterialSheet } from './components/material-sheet';
import { OutstandingSection } from './components/outstanding-section';
import { purchaseKeys } from './keys';
import { poStatus } from './status';

export const poApproval = defineApproval<PurchaseOrder, PoMaterial[]>({
  type: 'po',
  title: 'Purchase orders',
  noun: 'PO',
  permission: 'PURCHASE',
  tint: 'purchase',
  queueKey: purchaseKeys.drafts(),
  queue: fetchDraftPOs,
  id: (po) => po.id,
  search: (po) => [po.code, po.supplierName, po.projectName, po.projectCode],
  summary: (po) => ({
    code: po.code || `Draft #${po.id}`,
    party: po.supplierName,
    amount: po.value,
    currency: po.currency,
    date: po.approvedOn ?? po.draftedOn,
    status: poStatus(po.status),
    meta: [
      ...(po.projectName ? [{ icon: 'briefcase-outline' as const, text: po.projectName }] : []),
      ...(po.poType === 1 ? [{ icon: 'construct-outline' as const, text: 'Job order' }] : []),
      ...(po.indentCode ? [{ icon: 'document-outline' as const, text: `Indent ${po.indentCode}` }] : []),
    ],
  }),
  detailKey: (po) => purchaseKeys.materials(po.id),
  detail: fetchPoMaterials,
  lines: (_po, materials) =>
    (materials ?? []).map((m) => ({
      key: `${m.itemId}:${m.makeId}`,
      title: m.name,
      subtitle: [m.drawingNo, m.makeName && m.makeName !== '-NA-' ? m.makeName : null].filter(Boolean).join(' · '),
      qty: formatQty(m.quantity, m.unit),
      amount: m.quantity * m.price * (1 - m.discount / 100),
    })),
  lineSheet: MaterialSheet,
  sections: [{ key: 'outstanding', title: 'Supplier outstanding', Component: OutstandingSection, visible: (_po, { session }) => can(session, 'ACCOUNTS', 'view') }],
  document: (po) => ({ path: 'purchase/json/po_doc/', params: { po_id: po.id, po_type: po.poType }, filename: `${po.code || `PO-${po.id}`}.pdf` }),
  actions: [
    { id: 'approve', label: 'Approve', icon: 'checkmark-circle-outline', tone: 'success', remarks: 'optional', visible: (po) => po.status === 0 || po.status === 1, run: (po, r) => approvePO(po, r), done: 'approved' },
    { id: 'review', label: 'Review', icon: 'eye-outline', tone: 'ghost', remarks: 'optional', visible: (po) => po.status === 0, run: (po, r) => reviewPO(po, r), done: 'marked reviewed' },
    { id: 'update', label: 'Update', icon: 'refresh-outline', tone: 'primary', remarks: 'optional', visible: (po) => po.status === 2, run: (po, r) => approvePO(po, r), done: 'updated' },
    {
      id: 'reject',
      label: 'Reject',
      icon: 'close-circle-outline',
      tone: 'danger',
      remarks: 'required',
      visible: (po) => po.status >= 0 && po.status !== 3,
      precheck: checkCanRejectPO,
      run: (po, r) => rejectPO(po, r),
      done: 'rejected',
    },
  ],
  invalidate: [purchaseKeys.dashboard(), ['purchase', 'search']],
});
```
(Old XSManager labelled Reject as "Discard" for drafts; keep "Reject" for one consistent verb — the server action is the same.)

- [ ] **Step 7: Screens**

`src/features/purchase/components/dashboard-tab.tsx`:
```tsx
/** @author Lokesh */
import { useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useFocusRefetch } from '@/core/query';
import { makeStyles } from '@/core/theme';
import { BarChartCard, QueryState, Section, StatCard, useHostRefresh, type ScrollHost } from '@/ui';

import { usePurchaseDashboard } from '../hooks';

export function DashboardTab({ host }: { host: ScrollHost }) {
  const styles = useStyles();
  const query = usePurchaseDashboard();
  const refetch = useCallback(() => query.refetch(), [query]);
  useHostRefresh(host, refetch);
  useFocusRefetch(refetch);
  return host.attach(
    <Animated.ScrollView {...host.scrollProps} contentContainerStyle={styles.pad}>
      <QueryState query={query}>
        {(d) => (
          <>
            <Section title="Purchase orders">
              <View style={styles.grid}>
                <StatCard label="Pending" value={String(d.pending)} icon="time-outline" tone="warning" caption={`${d.pending_delayed} delayed`} />
                <StatCard label="On track" value={String(d.pending_on_track)} icon="checkmark-circle-outline" tone="success" />
                <StatCard label="Part supplied" value={String(d.part_supplied)} icon="git-branch-outline" tone="info" caption={`${d.part_delayed} delayed`} />
                <StatCard label="Part on track" value={String(d.part_on_track)} icon="trending-up-outline" tone="success" />
              </View>
            </Section>
            <Section title="Indents">
              <View style={styles.grid}>
                <StatCard label="Pending" value={String(d.indent_pending)} icon="document-text-outline" tone="warning" />
                <StatCard label="Due for PO" value={String(d.indent_due_po)} icon="cart-outline" tone="danger" />
                <StatCard label="Due for material" value={String(d.indent_due_material)} icon="cube-outline" tone="violet" />
                <StatCard label="Raised" value={String(d.indent_raised)} icon="add-circle-outline" tone="info" />
              </View>
            </Section>
            <Section title="Delivery performance">
              <BarChartCard
                title="On time vs delayed"
                subtitle="Purchase orders by month"
                format={(n) => String(Math.round(n))}
                series={[{ label: 'On time' }, { label: 'Delayed', color: '#D9534F' }]}
                data={d.performance.map((p) => ({ label: p.po_month, values: [p.on_time, p.delayed] }))}
              />
            </Section>
          </>
        )}
      </QueryState>
    </Animated.ScrollView>,
  );
}

const useStyles = makeStyles((t) => ({ pad: { padding: t.space.gutter, paddingTop: 0, paddingBottom: 48 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } }));
```

`src/features/purchase/components/lookup-tab.tsx`: state `filters` (`useState(DEFAULT_PO_FILTERS)`), `search` text, `sheet` boolean. Uses `usePoSearch(filters)`, `usePoFinanceYears()`, `usePartyItems()`, `useProjectItems()`, `useMaterialItems()`. Filter fields:
```ts
const fields: FilterField[] = [
  { kind: 'dateRange', key: 'range', label: 'PO date' },
  { kind: 'select', key: 'status', label: 'Status', options: PO_STATUS_OPTIONS },
  { kind: 'select', key: 'financeYear', label: 'Financial year', options: [{ value: '-1', label: 'Current' }, ...(fy.data ?? []).map((y) => ({ value: y, label: y }))] },
  { kind: 'picker', key: 'supplierId', label: 'Supplier', items: parties },
  { kind: 'picker', key: 'projectCode', label: 'Project', items: projects },
  { kind: 'picker', key: 'itemId', label: 'Material', items: materials },
];
```
(`itemId` picker value is `"<itemId>:<makeId>"`; split on `:` before calling the API. Project picker ids are project ids; send the project **code** by looking it up in `useProjects()`.)
Exposes a filter `HeaderAction` to the parent via prop `onFilterPress` registration: the parent `PurchaseScreen` passes `filterOpen`/`setFilterOpen` state down; `ModuleScreen actions` shows `{ icon: 'options-outline', label: 'Filters', badge: countActiveFilters(fields, filters, DEFAULT_PO_FILTERS()), onPress: () => setFilterOpen(true) }` only while the lookup tab is active. List: `host.attach(<Animated.FlatList …>)` with header `SearchField` (local `filterItems` over code/supplier/project) and a row of local status chips (Pending, Part supplied, Supplied, Delayed, On time) filtering on `materialStatus`/`deliveryStatus` text (case-insensitive contains). Rows: `ApprovalCard summary={poApproval.summary(po)} tint={t.tints.purchase} onPress={() => openPager(poApproval, visible, po.id)}`. Empty: "No purchase orders match these filters". Footer caption: `${visible.length} of ${data.length} orders`.

`src/features/purchase/screens/purchase-screen.tsx`:
```tsx
/** @author Lokesh */
import { useState } from 'react';

import { useSession } from '@/core/auth';
import { can } from '@/core/permissions';
import { QueueList, useApprovalQueue } from '@/features/approvals/engine';
import { ModuleScreen, SegmentedTabs, useTabParam } from '@/ui';

import { poApproval } from '../approvals';
import { DashboardTab } from '../components/dashboard-tab';
import { LookupTab } from '../components/lookup-tab';

const TABS = ['dashboard', 'lookup', 'pending'] as const;

export function PurchaseScreen() {
  const session = useSession();
  const [tab, setTab] = useTabParam(TABS, 'dashboard');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterBadge, setFilterBadge] = useState(0);
  const pending = useApprovalQueue(poApproval);
  const canApprove = can(session, 'PURCHASE', 'approve');
  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard' },
    { key: 'lookup' as const, label: 'PO Lookup' },
    ...(canApprove ? [{ key: 'pending' as const, label: 'Pending', badge: pending.data?.length }] : []),
  ];
  return (
    <ModuleScreen
      title="Purchase"
      tabs={<SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />}
      actions={tab === 'lookup' ? [{ icon: 'options-outline', label: 'Filters', badge: filterBadge, onPress: () => setFilterOpen(true) }] : []}>
      {(host) =>
        tab === 'lookup' ? (
          <LookupTab host={host} filterOpen={filterOpen} onFilterClose={() => setFilterOpen(false)} onFilterCount={setFilterBadge} />
        ) : tab === 'pending' && canApprove ? (
          <QueueList config={poApproval} host={host} />
        ) : (
          <DashboardTab host={host} />
        )
      }
    </ModuleScreen>
  );
}
```
(`LookupTab` props: `{ host: ScrollHost; filterOpen: boolean; onFilterClose: () => void; onFilterCount: (n: number) => void }`; it calls `onFilterCount(countActiveFilters(...))` in an effect when filters change.)

`src/features/purchase/index.ts`:
```ts
/** @author Lokesh */
export { PurchaseScreen } from './screens/purchase-screen';
export { poApproval } from './approvals';
export type { PurchaseOrder } from './api';
```

`src/app/(app)/purchase/index.tsx`:
```tsx
/** @author Lokesh */
export { PurchaseScreen as default } from '@/features/purchase';
```

In `src/modules/approval-registry.ts`:
```ts
import { erase } from '@/features/approvals/engine';
import { poApproval } from '@/features/purchase';
export const APPROVALS: Partial<Record<ApprovalType, AnyApproval>> = { po: erase(poApproval) };
```

- [ ] **Step 8: Run tests and gates** → `npm run verify` PASS.

- [ ] **Step 9: Device check against dev.xserp.in** — Purchase tile → Dashboard stats + chart render in both themes; PO Lookup lists last 30 days, filters change results and show a badge count; Pending lists drafts; tapping one opens the pager ("1 of N"), swiping changes documents, tapping a material shows supplier prices/stock; Approve → remarks sheet → undo toast → after 4 s success toast, item leaves the pager, Home badge drops on return; Reject without remarks is blocked; View PDF opens the share/viewer sheet.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat(purchase): add purchase dashboard, PO lookup and PO approvals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 16: Sales — dashboard, invoice/OA lookup, invoice & OA approvals

Same structure as Task 15 (files under `src/features/sales/`, route `src/app/(app)/sales/index.tsx`, fixtures under `__fixtures__/sales/`).

**Endpoints & params**
| Function | Path | Params | Response key → fields |
|---|---|---|---|
| `fetchSalesDashboard()` | `sales/json/dashboard/` | — | `oa_pending, oa_on_track, oa_overdue, pending_on_track, pending_delayed`, lists `sales_performance[] / delivery_performance[] / payment_collection[]` each `{ month, value, delayed, on_time, advance, key_to_sort }` |
| `fetchSalesDetail(range)` | `sales/json/salesDetail/` | `from_date, to_date` | `oa_on_track, oa_delayed, collection_on_time, collection_delayed` |
| `fetchReceivableAging()` | `accounts/json/aging/` | — | `receivable_aging{age1..age4, overdue, advance, billable, total}` (shared schema with Finance) |
| `searchInvoices(f)` | `sales/json/invoiceSearch/` | `invoiceNo, customerId, project_code, item_id (-1 any), status (100/1/0/-1), since, till, finance_year (-1)` | `invoice_list[]` |
| `searchOAs(f)` | `sales/json/oa_search/` | `oa_no, supplier_id, project_code, item_id, status, since, till, finance_year` | `oa_list[]` |
| `fetchInvoiceFinanceYears()` / `fetchOaFinanceYears()` | `sales/json/finance_year/`, `sales/json/oa_finance_year/` | — | `financial_years[]` |
| `fetchDraftInvoices()` | `sales/json/draft_invoice_fetch/` | — | `invoice_list[]` |
| `fetchDraftOAs()` | `sales/json/draft_oa/` | — | `oa_list[]` |
| `fetchInvoiceMaterials(inv)` | `sales/json/invoice_material/` | `invoice_id` | `materials[]` (`item_id, make_id, drawing_no, name, make_name, quantity, rate/price, discount, unit`) |
| `fetchPartyOverdue(partyId)` | `sales/json/invoice_material_overdue/` | `party_id` | `outstanding[]` (ledger aging, same schema as purchase) |
| `fetchOaMaterials(oa)` | `sales/json/oa_material/` | `oa_id` | `materials[]` |
| `approveInvoice(inv, remarks)` | `sales/invoice/approve/` | `invoice_id, remarks` | — |
| `rejectInvoice(inv, remarks)` | `sales/invoice/reject/` | `invoice_id, remarks` | — |
| `approveOA(oa, remarks)` | `sales/oa/approve/` | `oa_id, project_code, approved_remarks: remarks, remarks` | — |
| `checkCanRejectOA(oa)` | `sales/json/oa/checkoainvoice_qty/` | `oa_id` | throws on non-200 |
| `rejectOA(oa, remarks)` | `sales/oa/reject/` | `oa_id, remarks` | — |
| docs | `sales/json/inv_doc/` (`invoice_id, inv_type`), `sales/json/oa_doc/` (`oa_id`), OA attachment `commons/json/document/` (`document_uri`) | | base64 `data` |

**Domain types**
- `Invoice = { id; code (invoice_code || invoice_no); type; status; date (issued_on || date); approvedOn; partyId; partyName; gstin; projectCode; projectName; value (grand_total || value); currency (currency_symbol || '₹'); dueOn; dueDays; paymentStatus; poNo }` from schema fields `id, invoice_no, invoice_code, type, status, date, issued_on, approved_on, po_no, due_on, due_days, payment_status, party_id, party_name, gstin, project_code, project_name, value, grand_total, currency_symbol`.
- `OA = { id; code (oa_code || oa_no); status; preparedOn; approvedOn; deliveryDue; partyId (supplier.id); partyName (supplier.name); projectCode; projectName; value (grand_total); currency; quantity; documentUri (document); attached (is_attached) }`.
- Status maps (`status.ts`): invoice `0 → Pending (warning)`, `1 → Approved (success)`, `-1 → Cancelled (danger)`; OA `0 → Draft (warning)`, `1 → Approved (success)`, `2 → Rejected (danger)`, other → neutral. Filter options `INVOICE_STATUS_OPTIONS` (100 All / 1 Approved / 0 Pending / -1 Cancelled) and `OA_STATUS_OPTIONS` (100 All / 0 Draft / 1 Approved / 2 Rejected).

**Approval configs (`approvals.tsx`)**
- `invoiceApproval: ApprovalConfig<Invoice, InvoiceMaterial[]>` — `type 'invoice'`, `noun 'Invoice'`, `permission 'SALES'`, `tint 'sales'`, queue `fetchDraftInvoices`, detail `fetchInvoiceMaterials`, lines (name, drawing/make, qty+unit, amount = qty × rate × (1 − discount/100)), section "Customer outstanding" (`fetchPartyOverdue(inv.partyId)`, visible when ACCOUNTS.view), document `inv_doc` (`filename = `${code}.pdf``), actions: Approve (status 0, optional remarks, done "approved"), Reject (status 0, required remarks, done "rejected"). `invalidate`: dashboard + `['sales','search']`.
- `oaApproval: ApprovalConfig<OA, OaMaterial[]>` — `type 'oa'`, `noun 'OA'`, queue `fetchDraftOAs`, detail `fetchOaMaterials`, document `oa_doc`; extra section "Attachment" (visible when `attached`) rendering `DocumentButton request={{ path: 'commons/json/document/', params: { document_uri: oa.documentUri }, filename: `${oa.code}-attachment.pdf` }} label="Open attachment"`; actions: Approve (status 0), Update (status 1, runs `approveOA`), Reject (status ≤ 1 and ≠ 2, required remarks, `precheck: checkCanRejectOA`).

**Screen:** `SalesScreen` tabs `dashboard | lookup | pendingInvoices | pendingOa` (pending tabs only with SALES.approve; badges from `useApprovalQueue`). Dashboard tab: StatCards (OA pending/on track/overdue, invoices pending on track/delayed, collections on time/delayed from `salesDetail` over the last 30 days), `BarChartCard`s "Sales" (`sales_performance` value), "Delivery" (on_time vs delayed), "Collections" (`payment_collection` value vs advance), and receivable ageing `KeyValue` card. Lookup tab: segmented Invoice/OA toggle (two `Chip`s) + the same filter pattern as Task 15 with the matching params and FY list; a "Create invoice" primary `Button` at the top when `useCan('SALES','edit')` → `router.push('/sales/invoice/new')`.

**Test (`api.test.ts`):** all fixtures parse; `toInvoice` prefers `invoice_code` over `invoice_no` and `grand_total` over `value`; `toOA` reads party from `supplier`; status maps as listed.

Register `invoice: erase(invoiceApproval), oa: erase(oaApproval)` in `APPROVALS`. Gate, device-check (approve + reject one invoice and one OA in dev), commit `feat(sales): add sales dashboard, invoice/OA lookup and approvals`.

---

### Task 17: Sales — Create invoice

**Files:** `src/features/sales/invoice-form/{schema.ts,build-payload.ts,use-invoice-form.ts,party-step.tsx,items-step.tsx,charges-step.tsx,transport-step.tsx,review-step.tsx,add-material-sheet.tsx}`, `src/features/sales/screens/create-invoice-screen.tsx`, `src/app/(app)/sales/invoice/new.tsx`; test `src/features/sales/invoice-form/build-payload.test.ts`.

**Endpoints:** `masters/json/fetch_frequently_used_partyAndProjects/` (`type: 'invoice'` → `frequently_used_parties[]`, `frequently_used_projects[]`), `stores/json/invoiceLastUsedSupplierDetails/` (`party_id` → `party_details{ trans_mode, Packing_desc, delivery_address, gstin, payment_term }`), `sales/json/invoice/loadPartyRate/` (`party_id, item_id, make_id` → `item_rate{ rate, discount }` / `rate`), `stores/json/stockCheck/` (`item_id, make_id, is_faulty: 0, exclude_drafts: 1` → `closing_stock`), save `sales/json/save_invoice_page/` (`invoice_data` = JSON string; `timeoutMs: 120_000`).

**Form model (`schema.ts`, zod + react-hook-form):**
```ts
export const invoiceFormSchema = z.object({
  type: z.enum(['GST', 'TRADING', 'Service', 'BoS', 'EXCISE']),
  partyId: z.string().min(1, 'Choose a customer'),
  projectId: z.string().min(1, 'Choose a project'),
  saleAccountId: z.string().min(1, 'Choose a sales account'),
  poNo: z.string(), poDate: z.date().nullable(), deliverTo: z.string(), gstin: z.string(),
  items: z.array(z.object({ itemId: z.string(), makeId: z.string(), name: z.string(), unit: z.string(), hsnCode: z.string(), quantity: z.number().positive('Quantity must be more than 0'), rate: z.number().nonnegative(), discount: z.number().min(0).max(100), taxCodes: z.array(z.string()) })).min(1, 'Add at least one item'),
  packingCharges: z.number().nonnegative(), transportCharges: z.number().nonnegative(),
  paymentTerms: z.string(), transportMode: z.string(), lrNo: z.string(), roadPermitNo: z.string(),
  packingSlipNo: z.string(), packingDescription: z.string(), specialInstruction: z.string(), notes: z.string(),
});
export type InvoiceForm = z.infer<typeof invoiceFormSchema>;
```

**`build-payload.ts`:** `buildInvoicePayload(form, { projects, taxes, withApproval }): Record<string, unknown>` → the XSManager `Invoice` JSON shape: `{ type, status: withApproval ? 1 : 0, party_id, project_code, sale_account_id, po_no, po_date (yyyy-MM-dd or ''), deliver_to, gstin, items: [{ item_id, make_id, quantity, rate, discount, unit, hsn_code, taxes: [{ tax_code }] }], charges: [{ item_name: 'Packing', rate: packingCharges }, { item_name: 'Transport', rate: transportCharges }] (omit zero), payment_terms: [{ description_name: paymentTerms }] (omit empty), transport_mode, lr_no, road_permit_no, packing_slip_no, packing_description, special_instruction, notes }`. Test: the payload for a two-item form matches a snapshot, zero charges are omitted, `status` follows `withApproval`, totals helper `invoiceTotals(form, taxes)` returns `{ subtotal, tax, total }` with per-line tax = sum of selected tax `rate`% on the discounted line value.

**Screen:** `CreateInvoiceScreen` = `ScreenHeader "New invoice"` + step indicator (Party · Items · Charges · Transport · Review) + one step at a time with Back/Next buttons; each step validates its own fields via `trigger([...])`. Party step: type chips, party `PickerSheet` (frequent parties first, then cache), on pick fetches last-used details to prefill delivery address/GSTIN/payment terms/transport; project and sales-account pickers (ledger cache filtered by `group` containing "Sales"). Items step: list + "Add item" → `AddMaterialSheet` (material picker → loads party rate and stock, quantity/rate/discount inputs, tax chips from tax cache, shows "In stock: N"). Review: totals and two buttons "Save as draft" and "Save & send for approval" (latter only if SALES.approve… XSManager sent status 1 for "with approval"). On success: toast "Invoice saved", invalidate `['sales']`, `router.back()`. Unsaved-changes guard: `usePreventRemove` from expo-router when the form is dirty → confirm alert.

Gate, device-check by creating a draft invoice in **dev only**, commit `feat(sales): add create-invoice flow`.

---

### Task 18: Stores module

Files under `src/features/stores/`, route `src/app/(app)/stores/index.tsx`.

| Function | Path | Params | Response |
|---|---|---|---|
| `fetchStoreDashboard(range)` | `stores/json/dashboard_data/` | `since, till` | `stock_statement{opening_stock, closing_stock, stock_issues, stock_receipt}`, `stock_mix[]{category, value}`, `monthly_closing_stock[]{month, closing_stock}` |
| `fetchStockStatement(range)` | `stores/json/list_stock_statement/` | `since, till` | `opening_stock, closing_stock, stock_issues, stock_receipt` |
| `fetchIndentStatus(range)` | `stores/json/indentStatus/` | `from_date, to_date` | `indent_raised, indent_closed, indent_pending, indent_due_po, indent_due_material` |
| `fetchGrnStatus(range)` | `stores/json/grnStatus/` | `from_date, to_date` | `grn_raised, grn_inprocess, grn_accounted` |
| `fetchDraftGrns()` | `stores/json/grn_draft/` | — | `grn_list[]` (Receipt) |
| `approveGrn(r, remarks, session)` | `stores/json/grn/approve/` | `receipt_no, fy_start_day: session.fyStartDay, icd: session.icd.enabled, icd_auto_gen_voucher, icd_ignore_credit_note, remarks` | — |
| `rejectGrn(r, remarks)` | `stores/json/grn/reject/` | `receipt_no, remarks, is_flag: true` | — |
| `stockCheck(itemId, makeId, opts)` | `stores/json/stockCheck/` | `item_id, make_id, is_faulty, exclude_drafts, from_date, to_date` | `opening_stock, closing_stock, stock_details[] / material_stock[] {date, doc_no, issue_qty, receipt_qty}` |

`Receipt = { receiptNo; code; isGrn; supplierName; projectId; projectCode; projectName; invoiceDate; invoiceValue; receiptDate; currency; noteIsCredit; noteCode; noteValue; remarks: { by; date; text }[]; auditRemarks: same[]; documents: { uid; ext; name }[] }` (schema fields per Kotlin `Receipt`: `receipt_no, is_grn, code, supplier_name, project_id, project_code, project_name, invoice_date, invoice_value, receipt_date, currency_symbol, note_is_credit, note_code, note_value, materials[], remarks[]{remarks,date,by}, audit_remarks[], documents` — `documents` may be an object or array: preprocess to array). `materials[]` uses `item_id, make_id, name, drawing_no, received_qty, accepted_qty, quantity, rate/price, unit`.

`grnApproval: ApprovalConfig<Receipt, undefined>` — `type 'grn'`, `noun 'GRN'`, `permission 'STORES'`, `tint 'stores'`, summary `code || receipt_no`, party supplier, amount `invoiceValue`, date `receiptDate`, status pill "Awaiting approval" (warning); `lines` from `item.materials` already on the row (received/accepted qty); section "Remarks history" (list of remarks with by/date); actions Approve (optional remarks), Reject (required remarks). Sort options in the GRN tab: supplier, receipt date, invoice value (chips); supplier filter via `PickerSheet` over distinct suppliers in the list.

Screen tabs `stock | indent | grn | check`. Stock tab: 4 StatCards from stock statement (formatCompact), `PieChartCard "Stock mix"`, `BarChartCard "Monthly closing stock"`; date range chip row (`rangePresets`). Indent tab: 5 StatCards + range chips. GRN tab: 3 StatCards (raised/in process/accounted) + embedded `QueueList` of drafts when STORES.approve. Stock check tab: material `PickerSheet` (cache) + "Exclude drafts" and "Faulty" `Chip` toggles + range → opening/closing `StatCard`s and a movements `FlatList` (`doc_no`, date, `+receipt`/`-issue` coloured success/danger).

Tests: fixtures parse; `documents` object→array preprocessing; approve payload includes the ICD flags and `fy_start_day` from the session. Register `grn: erase(grnApproval)`. Gate, device-check, commit `feat(stores): add stock, indent, GRN approvals and stock check`.

---

### Task 19: Audit (ICD) module

Files under `src/features/audit/`, route `src/app/(app)/audit/index.tsx`.

| Function | Path | Params | Response |
|---|---|---|---|
| `fetchPendingGrnNotes()` | `auditing/json/pendingGrn/` | — | `grn_list[]` (Receipt, same schema as Task 18 — import the schema via `@/features/stores` public index: export `receiptSchema`, `toReceipt`, `Receipt`) — **`emptyCodes: [109]`** |
| `fetchGrnMaterials(r)` | `auditing/json/grnMaterials/` | `receipt_no, grn_number: receipt_no` | `materials[]` |
| `verifyNote(r, remarks, session)` | `auditing/json/verifyNote/` | `receipt_no, grn_number: receipt_no, note_id: r.noteId, project_code, project_id, icd_remarks: remarks` | `grn_code` |
| `returnGrn(r, remarks)` | `auditing/json/returnGrn/` | `grn_number: receipt_no, receipt_no, audit_remarks: remarks, note_id` | — |
| docs | `auditing/json/downloadDoc/` | `receipt_no, grn_code: code, note_id, doc_type: 'receipt' \| 'invoice' \| 'note'` | base64 |

`icdApproval: ApprovalConfig<Receipt, GrnMaterial[]>` — `type 'icd'`, `noun 'GRN'`, `permission 'ICD'`, `tint 'audit'`, summary: code, supplier, amount `noteValue` when a note exists else `invoiceValue`, meta `[{icon:'document-attach-outline', text: `${noteIsCredit ? 'Credit' : 'Debit'} note ${noteCode}`}]` when `noteCode`, status "Checked" (info). Sections: "Documents" (three `DocumentButton`s: GRN, Supplier invoice, Note — note only when `noteCode`), "Audit remarks" history. Actions: Verify (`tone 'success'`, optional remarks, done "verified"), Return (`tone 'danger'`, required remarks, done "returned").

Screen tabs `pending | verified | returned`: Pending = `QueueList(icdApproval)` with a sort chip row (name, receipt date, invoice date, invoice amount, note amount); Verified/Returned list items actioned **in this app session** (kept in a small zustand store `useAuditSession` that `verifyNote`/`returnGrn` success handlers append to — matches XSManager). If `!session.icd.enabled` the screen shows `StateView icon="shield-outline" title="Internal control is off" message="Ask your administrator to enable ICD for this company."`.

Tests: an empty `109` response yields `[]` (Review Focus #2); verify/return payloads. Register `icd: erase(icdApproval)`. Gate, device-check, commit `feat(audit): add ICD GRN note verification`.

---

### Task 20: Finance module

Files under `src/features/finance/`, routes `src/app/(app)/finance/index.tsx`, `finance/ledger/[id].tsx`, `finance/aging/[bucket].tsx`.

| Function | Path | Params | Response |
|---|---|---|---|
| `fetchFinanceDashboard(range)` | `accounts/json/dashboard_api/` | `since, till` | `bank, bank_balance, cash, cash_in_hand, receivable, receivables[]{name, value/closing_balance}, payable, payables[], sales_revenue, tax_liability, sync_datetime` (numbers via `zNum`; lists `{ id, name, value: zNum }` with `value` preprocessed from `value ?? closing_balance ?? amount`) |
| `fetchTaxLiability(range)` | `accounts/json/tax_liability/` | `since, till` | `tax_liability, tax_liable_items[]{name, value}` |
| `fetchIncomeExpenses()` | `accounts/json/income_and_expenses/` | — | `income_and_expenses[]{month, income, expense}` |
| `fetchAging()` | `accounts/json/aging/` | — | `receivable_aging`, `payable_aging` (`age1..age4, overdue, billable, excess, advance, total, outstanding`) |
| `fetchBucketLedgers(b)` | `accounts/json/aging_ledgers/` | `is_receivable, option: 'ledgers', is_advance, start_days, end_days` | `ledgers[]{id, party_id, name, group_name, closing_balance, due, total, credit_period}` |
| `fetchLedgerVouchers(id, range)` | `accounts/json/ledger_data/` | `ledger_id, since, till` | `vouchers[]{code, date, is_debit, value}`, `opening_balance`, `closing_balance` |
| `fetchLedgerAging(id, range)` | `accounts/json/ledger_aging/` | `ledger_id, since, till` | aging buckets |
| `fetchLedgerBills(id, isReceivable)` | `accounts/json/load_ledger_bills/` | `ledger_id, is_receivable` | `bills[]{bill_no, bill_date, value, settled, balance}`, `unsettled` |

Bucket definition (`buckets.ts`): `type Bucket = { key: 'age1'|'age2'|'age3'|'age4'|'advance'|'billable'; label: string; startDays: number; endDays: number; isAdvance: boolean }` = 0–30, 31–60, 61–90, 90+ (`endDays: 100000`), Advance, Unbilled; route param `bucket` = `${'r'|'p'}-${key}`.

Screen tabs `dashboard | ageing | ledgers`. Dashboard: range chips; StatCards Bank, Cash in hand, Receivables, Payables, Tax liability, Sales revenue (formatCompact); "Top receivables"/"Top payables" `Section`s (5 rows `KeyValue`); `BarChartCard "Income vs expense"`; caption "Synced <sync_datetime>". Ageing: Receivable/Payable segmented chips; each bucket a `Card` row (label, amount, share bar) → `router.push('/finance/aging/r-age2')` → `BucketLedgersScreen` (searchable list, tap → ledger). Ledgers: `SearchField` over the ledger cache (`useLedgers`), virtualised list → `/finance/ledger/<id>` → `LedgerScreen`: header with name/group, range chips, opening/closing StatCards, aging `KeyValue` card, vouchers list (code, date, Dr/Cr coloured amount), and a "Bills" `Section` from `load_ledger_bills` (is_receivable inferred: group name contains "Debtor" → true, "Creditor" → false; otherwise hide).

Tests: fixtures parse; bucket → params mapping; dashboard list value preprocessing. No approvals. Gate, device-check, commit `feat(finance): add finance dashboard, ageing drill-down and ledgers`.

---

### Task 21: Masters module (parties, materials, rate approval)

Files under `src/features/masters/`, routes `src/app/(app)/masters/index.tsx`, `masters/party/[id].tsx`, `masters/material/[id].tsx` (id = `itemId:makeId`, URL-encoded).

| Function | Path | Params | Response |
|---|---|---|---|
| `fetchPartyDetail(id)` | `masters/json/party/detail/` | `party_id` | `id, code, name, contact, address_1, address_2, city, state, country, phone, email, gst_no, pan_no, cin_no, tan_no, is_supplier, is_customer, party_details{payment_term, trans_mode, delivery_address}` — the object may be at top level or under `party`: preprocess `v.party ?? v` |
| `fetchMaterialDetail(itemId, makeId)` | `masters/json/material/detail/` | `item_id, make_id` | `unit, price, category, makes[], bill_of_material[]{name, drawing_no, quantity, unit}, supplier_prices[], supplier_history[]{price, effect_since, supplier{name}}, store_price, taxes[]{tax_code, name, net_rate}` (same top-level-or-nested preprocessing under `material`) |
| stock | `stores/json/material_stock/` | `item_id` | as Task 15 |
| `fetchPendingRates()` | `masters/json/material/supplierPrices/` | — | `supplier_prices[]` (`supplier{id,name,code}, material{item_id, name, drawing_no, unit}, make, make_id, price, currency, effect_since, effect_till, status, remarks, reject_remarks, rate_approval_id`) |
| `approveRate(r, remarks)` | `masters/json/material/approveRate/` | `item_id, effect_since, updated_since: effect_since, effect_till, updated_till: effect_till, supplier_id, price, remarks, make_id, rate_approval_id` | — |
| `rejectRate(r, remarks)` | `masters/json/material/rejectRate/` | same + `is_approved: false, reject_remarks: remarks` | — |

`rateApproval: ApprovalConfig<RateRequest, undefined>` — `type 'rate'`, `noun 'Rate'`, `permission 'MASTERS'`, `tint 'masters'`; summary: code = material name, party = supplier name, amount = price, currency, date = `effect_since`, meta = `[{icon:'calendar-outline', text: `Valid till ${formatDate(effect_till)}`}]`; section "Price history" (`LineChartCard` from `fetchMaterialDetail(...).supplier_history` for that supplier); actions Approve / Reject (required).

Screen tabs `parties | materials | rates`: Parties/Materials = virtualised searchable lists over the master cache with "Synced <relative time>" caption and a "Sync" text action (`syncMaster(kind, { force: true })`). Party detail: header card (name, code, Supplier/Customer pills), contact rows — phone row `onPress → Linking.openURL('tel:…')`, email → `mailto:`, GSTIN/PAN rows with copy (`expo-clipboard` + toast "Copied"), address block. Material detail: header (name, drawing no, category, unit), price/store price StatCards, stock StatCard, makes chips, BOM `Section` (list), taxes chips, `LineChartCard "Price history"` (all suppliers' `supplier_history` sorted by date), supplier prices `Section`.

Tests: fixtures parse (top-level and nested variants); approve/reject payloads (`updated_since`/`updated_till`, `is_approved=false`). Register `rate: erase(rateApproval)`. Gate, device-check, commit `feat(masters): add party and material detail and rate approvals`.

---

### Task 22: Expenses module

Files under `src/features/expenses/`, routes `src/app/(app)/expenses/index.tsx`, `expenses/[id].tsx` (`new` for create).

| Function | Path | Params | Response |
|---|---|---|---|
| `fetchExpenseGroups()` | `expenses/json/expense_group_list/` | — | keys `Draft, Confirmed, Approved, Checked, Verified` → arrays (counts for tab badges) |
| `fetchExpenses(status, range)` | `expenses/json/expense_list/` | `status` (0–4), `since, till` | list under the status-name key (e.g. `Confirmed`) **or** `expenses` — preprocess: take `v[STATUS_NAME[status]] ?? v.expenses ?? []` |
| `fetchHeads(type)` | `expenses/json/head_ledgers/` | `type: 'claim_heads' \| 'expense_heads'` | `claim_heads[]` / `expense_heads[]` `{id, name}` |
| `fetchExpense(id)` | `expenses/json/get_expense/` | `expense_id` | Expense (`id, code, claim_head_ledger_id, group_description, status, created_by, approved_by, checked_by, verified_by, created_user{first_name,last_name}, date, claimed_amount, approved_amount, remarks, remarks_list[], particulars[]`) — object may be top-level or under `expense` |
| `saveExpense(e)` | `expenses/json/save_expense/` | `expense_data` = JSON of the Expense (keep `particulars[].document` exactly as loaded) | `expense_id` / `code` |

Status model (`status.ts`): `DRAFT 0, CONFIRMED 1, APPROVED 2, CHECKED 3, VERIFIED 4`, names and tones (Draft neutral, Confirmed info, Approved success, Checked violet, Verified success). `nextStep(expense, session)` returns the allowed transition: owner → Confirm (0→1); approver (EXPENSES.approve, not the creator) → Approve (1→2) or Return to draft (1→0, remarks required); auditor (ICD.approve or isSuper) → Check (2→3) / Verify (3→4). Test every rule.

Editor (`[id].tsx` → `ExpenseEditorScreen`): react-hook-form; claim head picker (`fetchHeads('claim_heads')`), description; particulars list with add/edit bottom sheet (expense head picker, spent on `DateField`, description, amount, bill available toggle; approver debit editable only for approvers at status 1, audit debit only for auditors at 2–3); totals footer (claimed, approver debit, audit debit, net); remarks input; sticky bar: "Save draft" (status 0), and the `nextStep` action button. Read-only when the user has no allowed step. Bill attachments: show an info row "Bills can be attached on XSERP web" (out of scope v1).

List screen tabs `draft | confirmed | approved | checked | verified` with badges from `expense_group_list`; range chips; cards (code, claimant, date, claimed/approved amount, status pill) → editor; FAB-style primary `Button` "New expense" when EXPENSES.edit.

Tests: fixtures parse (both list shapes); `nextStep` matrix; `saveExpense` keeps unknown particular fields and `document`. Gate, device-check (create a draft, confirm it in dev), commit `feat(expenses): add expense claims with approval workflow`.

---

### Task 23: Notifications, Profile and Settings

Files: `src/features/notifications/{schemas.ts,api.ts,keys.ts,hooks.ts,screens/notifications-screen.tsx,index.ts}` (replaces the Task 11 stub), `src/features/settings/{screens/profile-screen.tsx,screens/settings-screen.tsx,components/appearance-control.tsx,components/sync-status.tsx,components/change-password-sheet.tsx,index.ts}`, routes `src/app/(app)/notifications.tsx`, `profile.tsx`, `settings.tsx`.

- Notifications: `fetchNotifications()` → `commons/json/nm_list/` → `notification_list[]{ id, created_on, is_read, message }`; `deleteNotifications(ids)` → `commons/json/del_nm/` (`notification_ids: ids.join(',')`); `markRead(id)` → `commons/json/up_nm_read/` (`notification_id`). `useUnreadCount()` = count of `!is_read` from a polled (`POLL_MS`) query. Screen: `ModuleScreen title="Notifications"` with "Delete all" action (confirm alert), grouped by day (Today/Yesterday/date), unread dot, tap → mark read; swipe-to-delete with `Swipeable` from react-native-gesture-handler (`ReanimatedSwipeable`); optimistic removal via `queryClient.setQueryData`, rollback on error.
- Profile (`fade_from_bottom`): `gradients.brand` hero with avatar ring gradient `['#5CC3FF','#209BE1','#004195']`, name, email, enterprise; plan/expiry row; buttons: Settings, Change password (sheet → `changePassword({ email, oldPassword, newPassword })`, then sign out with notice "Password changed. Please sign in again."), Sign out (confirm → `logout(session)` then `signOut()`).
- Settings: Appearance segmented control System/Light/Dark (`useThemePreference`, live); Master data `Section` listing each kind with count, "Synced 2 h ago" (`formatDistanceToNow`), spinner while syncing, error text, "Sync now" (`syncAllMasters({ force: true })`); About: server host, app version (`expo-application`), OTA update id (`expo-updates` `Updates.updateId ?? 'embedded'`), Terms / Privacy (`WebBrowser.openBrowserAsync(`${env.serverUrl}/erp/public/terms/`)` and `/privacy/`).

Tests: notifications schema + `useUnreadCount` selector logic (pure `countUnread(list)`), appearance control renders three options and calls `setPreference`. Gate, device-check (switch Dark ↔ Light while on Settings: whole app re-themes instantly, no restart), commit `feat(settings): add notifications, profile and settings`.

---

### Task 24: Release configuration, CI, docs, final verification

**Files:** `.github/workflows/ci.yml`, `credentials.json.example`, `README.md`, `docs/ARCHITECTURE.md`, `docs/SMOKE.md`.

- [ ] **Step 1: CI**
```yaml
name: ci
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run verify
```

- [ ] **Step 2: Signing** — `credentials.json.example` (gitignored real file):
```json
{
  "android": {
    "keystore": {
      "keystorePath": "../Schnell-Xserp/xserp/docs/schnell-xsmanager-keystore.jks",
      "keystorePassword": "<from Schnell-Xserp/xserp/build.gradle signingConfigs.playstore>",
      "keyAlias": "schnellXsmanagerKey",
      "keyPassword": "<same source>"
    }
  }
}
```
Do **not** copy the passwords into any committed file. Verify the alias: `keytool -list -keystore ../Schnell-Xserp/xserp/docs/schnell-xsmanager-keystore.jks` (asks for the store password).

- [ ] **Step 3: Docs** — `README.md`: what the app is, prerequisites (Node 22, Android Studio / Expo Go), `npm install`, `npm start` (`APP_ENV=qa|prod` variants), `npm run verify`, `npm run icons`, build commands (`eas build -p android --profile preview|qa|production`), OTA (`eas update --channel <profile>`), releasing over XSManager (package id, versionCode ≥ 66, keystore via `credentials.json`), and **"Adding a module"** (registry entry → feature folder with schemas/api/keys/hooks/screens → optional approval config registered with `erase` → route file). `docs/ARCHITECTURE.md`: the layer diagram, data flow (screen → hook → api → `post` → envelope → zod), auth/session/idle lifecycle, auto-refresh rules, approval engine lifecycle (precheck → undo window → run → invalidate → session refresh). `docs/SMOKE.md`: Appendix A of the spec as a checklist with expected results per module.

- [ ] **Step 4: Final verification**

Run: `npm run verify` → all green. Run: `npx expo-doctor` → no issues. Run: `npx expo export --platform android` → bundle builds. Run through `docs/SMOKE.md` on a device against dev.xserp.in in **both** light and dark mode; record results in the PR description.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "chore: add CI, signing template and project documentation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
