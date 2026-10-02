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
