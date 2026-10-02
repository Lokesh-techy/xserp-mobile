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
