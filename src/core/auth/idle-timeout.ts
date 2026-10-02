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
