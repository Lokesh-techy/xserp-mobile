/** @author Lokesh */
// Base URLs for every backend the app can talk to. Kept free of React Native imports so
// app.config.ts can read it at build time too.

export type ServerName = 'local' | 'dev' | 'qa' | 'prod';

export type Server = {
  /** Shown on the login and profile screens. */
  label: string;
  /** Legacy Django ERP: the app calls `${erpUrl}/erp/<path>`. */
  erpUrl: string;
  /** FastAPI mobile service, including its `/api/v1` prefix. */
  mobileApiUrl: string;
};

/** Stands for the machine running Metro; env.ts swaps it for that machine's LAN IP at runtime. */
export const DEV_MACHINE = '__dev_machine__';

export const SERVERS: Record<ServerName, Server> = {
  // ERP stays on dev (no local Django); the mobile API is `make up` on this laptop.
  local: { label: 'LOCAL', erpUrl: 'https://dev.xserp.in', mobileApiUrl: `http://${DEV_MACHINE}:8000/api/v1` },
  dev: { label: 'DEV', erpUrl: 'https://dev.xserp.in', mobileApiUrl: 'https://dev.xserp.in/api/v1' },
  qa: { label: 'QA', erpUrl: 'https://qa.xserp.in', mobileApiUrl: 'https://qa.xserp.in/api/v1' },
  prod: { label: 'PROD', erpUrl: 'https://schnell.xserp.in', mobileApiUrl: 'https://schnell.xserp.in/api/v1' },
};

export const isServerName = (v: unknown): v is ServerName => typeof v === 'string' && v in SERVERS;
