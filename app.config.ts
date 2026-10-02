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
const projectId = process.env.EAS_PROJECT_ID;

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
  web: { favicon: './assets/images/favicon.png' },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-image',
    ['expo-splash-screen', { backgroundColor: '#001A3D', image: './assets/images/splash-icon.png', imageWidth: 160 }],
    'expo-secure-store',
    'expo-sqlite',
    'expo-status-bar',
    'expo-web-browser',
    'expo-sharing',
    'expo-asset',
    '@react-native-community/datetimepicker',
    // Full screen on punch-hole / notch devices (see plugins/with-display-cutout.js).
    './plugins/with-display-cutout',
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    appEnv: APP_ENV,
    serverUrl: target.serverUrl,
    idleTimeoutMinutes: 30,
    router: {},
    eas: { projectId },
  },
  updates: projectId ? { url: `https://u.expo.dev/${projectId}` } : undefined,
  runtimeVersion: { policy: 'appVersion' },
};

export default config;
