/** @author Lokesh */
import Constants from 'expo-constants';

import { DEV_MACHINE, isServerName, SERVERS, type ServerName } from './servers';

type Extra = { appEnv: 'dev' | 'qa' | 'prod'; idleTimeoutMinutes: number };
const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

const appEnv = extra.appEnv ?? 'dev';

// EXPO_PUBLIC_SERVER (in .env.local) picks a row from servers.ts; otherwise the build's APP_ENV does.
const requested = process.env.EXPO_PUBLIC_SERVER;
const serverName: ServerName = isServerName(requested) ? requested : appEnv;
const server = SERVERS[serverName];

/** LAN IP of the machine serving the bundle (from Metro's host), so a phone can reach `make up`. */
const devMachine = Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';

const clean = (url: string) => url.replace(DEV_MACHINE, devMachine).replace(/\/+$/, '');

const erpBase = clean(process.env.EXPO_PUBLIC_ERP_URL || server.erpUrl);
const mobileApiBase = clean(process.env.EXPO_PUBLIC_MOBILE_API_URL || server.mobileApiUrl);

export const env = {
  appEnv,
  serverName,
  serverLabel: server.label,
  /** Legacy ERP origin, e.g. `https://dev.xserp.in`. */
  serverUrl: erpBase,
  /** FastAPI mobile service, e.g. `https://dev.xserp.in/api/v1`. */
  mobileApiUrl: mobileApiBase,
  idleTimeoutMinutes: Number(process.env.EXPO_PUBLIC_IDLE_TIMEOUT_MINUTES || extra.idleTimeoutMinutes || 30),
} as const;

/** `erpUrl('sales/json/draft_oa/')` → `https://dev.xserp.in/erp/sales/json/draft_oa/` */
export const erpUrl = (path: string) => `${env.serverUrl}/erp/${path.replace(/^\/+/, '')}`;

/** `mobileApiUrl('auth/login')` → `https://dev.xserp.in/api/v1/auth/login` */
export const mobileApiUrl = (path: string) => `${env.mobileApiUrl}/${path.replace(/^\/+/, '')}`;

export const serverHost = erpBase.replace(/^https?:\/\//, '');
