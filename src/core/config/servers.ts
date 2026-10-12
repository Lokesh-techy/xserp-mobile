/** @author Lokesh */
// Base URL of the Django ERP for each environment. Kept free of React Native imports.

export type ServerName = 'local' | 'dev' | 'qa' | 'prod';

export type Server = {
  /** Shown on the login and profile screens instead of the URL. */
  label: string;
  /** Django ERP origin: the app calls `${erpUrl}/erp/<path>`. */
  erpUrl: string;
};

/** Stands for the machine running Metro; env.ts swaps it for that machine's LAN IP at runtime. */
export const DEV_MACHINE = '__dev_machine__';

export const SERVERS: Record<ServerName, Server> = {
  // Django `runserver 0.0.0.0:8000` on this laptop.
  local: { label: 'LOCAL', erpUrl: `http://${DEV_MACHINE}:8000` },
  dev: { label: 'DEV', erpUrl: 'https://dev.xserp.in' },
  qa: { label: 'QA', erpUrl: 'https://qa.xserp.in' },
  prod: { label: 'PROD', erpUrl: 'https://schnell.xserp.in' },
};

export const isServerName = (v: unknown): v is ServerName => typeof v === 'string' && v in SERVERS;
