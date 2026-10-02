/** @author Lokesh */
import { useSessionStore } from '@/core/auth';
import { HomeScreen } from '@/features/home';
import { useSessionRefreshAction } from '@/features/auth';
import { useUnreadCount } from '@/features/notifications';
import { HOME_MODULES, moduleAccess, moduleBadge } from '@/modules/registry';

export default function Home() {
  const session = useSessionStore((s) => s.session);
  const refresh = useSessionRefreshAction();
  const unread = useUnreadCount();
  if (!session) return null;
  const modules = HOME_MODULES.map((m) => ({
    id: m.id,
    title: m.title,
    subtitle: m.subtitle,
    icon: m.icon,
    tint: m.tint,
    href: m.href,
    access: moduleAccess(m, session),
    badge: moduleBadge(m, session),
  }));
  return <HomeScreen modules={modules} unread={unread} onRefresh={refresh} />;
}
