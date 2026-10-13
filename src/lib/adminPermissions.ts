import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { isNavGroup, navLinks, type NavSection } from './navConfig';

/**
 * What each person on the Regantify team may open and do (super-admin-plan.md Step 13). This is a copy of server/src/admin/admin-permissions.ts (the server is what
 * actually refuses; this only hides what a role can't use, so nobody lands on a page of 403 errors). Change both together.
 */
export type AdminPermission =
  | 'dashboard.view' | 'stores.view' | 'stores.edit' | 'stores.danger' | 'stores.impersonate_view' | 'stores.impersonate_edit' | 'money.view' | 'money.adjust' | 'payouts.manage'
  | 'plans.view' | 'plans.edit' | 'orders.view' | 'orders.edit' | 'shoppers.view' | 'shoppers.manage' | 'support.manage' | 'kyc.manage' | 'messages.send' | 'announcements.manage'
  | 'ai.manage' | 'gateways.manage' | 'receipts.manage' | 'system.view' | 'audit.view' | 'settings.manage' | 'team.manage' | 'flags.manage';

export type AdminRoleKey = 'OWNER' | 'MANAGER' | 'FINANCE' | 'SUPPORT';

export const ADMIN_ROLE_LABEL: Record<AdminRoleKey, string> = { OWNER: 'Owner', MANAGER: 'Manager', FINANCE: 'Finance', SUPPORT: 'Support' };

/** The permission a page needs: a path prefix and what it asks for. `null` = every team member (their own settings). Longest prefix wins; an unlisted path is the Owner's alone. */
const PATH_ACCESS: Array<[string, AdminPermission | null]> = [
  ['/admin/dashboard', 'dashboard.view'],
  ['/admin/analytics', 'money.view'],
  ['/admin/reviews', 'support.manage'],
  ['/admin/reports', 'support.manage'],
  ['/admin/trust-safety', 'stores.view'],
  ['/admin/marketing', 'settings.manage'],
  ['/admin/vendors', 'stores.view'],
  ['/admin/orders', 'orders.view'],
  ['/admin/customers', 'shoppers.view'],
  ['/admin/plans', 'plans.view'],
  ['/admin/plan-requests', 'plans.view'],
  ['/admin/renewals', 'plans.view'],
  ['/admin/packs', 'plans.view'],
  ['/admin/payment-gateway', 'gateways.manage'],
  ['/admin/finance/revenue', 'money.view'],
  ['/admin/finance/commission', 'plans.view'],
  ['/admin/finance/payouts', 'payouts.manage'],
  ['/admin/announcements', 'announcements.manage'],
  ['/admin/messages', 'messages.send'],
  ['/admin/automations', 'messages.send'],
  ['/admin/ai-settings', 'ai.manage'],
  ['/admin/system-status', 'system.view'],
  ['/admin/feature-flags', 'flags.manage'],
  ['/admin/verification', 'kyc.manage'],
  ['/admin/receipt-details', 'receipts.manage'],
  ['/admin/staff', 'team.manage'],
  ['/admin/support', 'support.manage'],
  ['/admin/settings', null],
];

export interface AdminViewer {
  role?: AdminRoleKey;
  permissions: string[] | null;
}

/** Who is signed in. A session with no role in it (opened before roles existed) is treated as the Owner until the next refresh; the server decides anyway. */
export function useAdminViewer(): AdminViewer {
  const user = useAuthStore((s) => s.user);
  return useMemo(() => ({ role: (user?.adminRole as AdminRoleKey | undefined) ?? 'OWNER', permissions: user?.adminPermissions ?? null }), [user?.adminRole, user?.adminPermissions]);
}

export function adminCan(v: AdminViewer, permission: AdminPermission | null): boolean {
  if (permission === null) return true;
  if (v.permissions === null) return true;
  return v.permissions.includes(permission);
}

/** The permission for a path: `undefined` = unlisted (Owner only), `null` = open to every team member. */
export function permissionForPath(pathname: string): AdminPermission | null | undefined {
  let best: [string, AdminPermission | null] | undefined;
  for (const entry of PATH_ACCESS) {
    if ((pathname === entry[0] || pathname.startsWith(`${entry[0]}/`)) && (!best || entry[0].length > best[0].length)) best = entry;
  }
  return best ? best[1] : undefined;
}

export function canOpenAdminPath(v: AdminViewer, pathname: string): boolean {
  const p = permissionForPath(pathname);
  if (p === undefined) return v.role === 'OWNER' || v.permissions === null;
  return adminCan(v, p);
}

/** The sidebar for this person: pages their role can't open are left out, and a group with nothing left disappears. */
export function useAdminNav(sections: NavSection[]): NavSection[] {
  const v = useAdminViewer();
  return useMemo(
    () =>
      sections
        .map((s) => (s.children ? { ...s, children: s.children.filter((c) => (isNavGroup(c) ? navLinks([c]).some((l) => canOpenAdminPath(v, l.path)) : canOpenAdminPath(v, c.path))) } : s))
        .filter((s) => (s.children ? s.children.length > 0 : !s.path || canOpenAdminPath(v, s.path))),
    [sections, v],
  );
}
