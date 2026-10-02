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
