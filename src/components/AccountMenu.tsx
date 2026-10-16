import { Bell, Headphones, LogOut, Settings, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLogout } from '../lib/useLogout';
import { getVendorPlanUsage } from '../lib/plansApi';
import { notificationsApi } from '../lib/notificationsApi';
import { adminSupportApi, supportApi } from '../lib/supportApi';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from './ui/DropdownMenu';

/** Small count pill at the right edge of a row. */
function Count({ n, tone }: { n: number; tone: 'orange' | 'red' }) {
  if (!n) return null;
  return (
    <span
      className={`ml-auto min-w-[20px] shrink-0 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white ${
        tone === 'red' ? 'bg-red-500' : 'bg-orange-500'
      }`}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}

/** The rounded square that holds a row's icon. */
const Tile = ({ children }: { children: React.ReactNode }) => (
  <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-100 text-neutral-600">{children}</span>
);

function Avatar({ url, name, size }: { url?: string | null; name?: string | null; size: number }) {
  const box = { width: size, height: size };
  return url ? (
    <img src={url} alt={name ?? 'Profile'} style={box} className="rounded-full border border-line object-cover" />
  ) : (
    <div style={box} className="flex items-center justify-center rounded-full bg-brand-lime">
      <User className="text-brand" size={Math.round(size / 2)} />
    </div>
  );
}

/**
 * Avatar button in the top bar and the menu it opens: who is signed in (name, store, plan),
 * then the pages people reach for most, then Log out on its own at the bottom.
 */
export function AccountMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const isVendor = user?.role === 'VENDOR';
  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Same query keys as the sidebar and the bell, so these come from the cache.
  const { data: plan } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage, retry: false, enabled: isVendor });
  const { data: notes } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsApi.list(), retry: false, enabled: isVendor });
  const { data: supportUnread = 0 } = useQuery({
    queryKey: ['support-unread', isAdmin ? 'admin' : 'vendor'],
    queryFn: isAdmin ? adminSupportApi.unreadCount : supportApi.unreadCount,
    retry: false,
    enabled: isVendor,
  });

  const contact = user?.email || user?.phone || null;

  return (
    <DropdownMenu
      widthClass="w-72"
      trigger={
        <button
          className="block shrink-0 rounded-full ring-2 ring-transparent transition-shadow hover:ring-brand-lime focus-visible:ring-brand-lime"
          title="Account menu"
          aria-label="Account menu"
        >
          <Avatar url={user?.avatarUrl} name={user?.fullName} size={36} />
        </button>
      }
    >
      <div className="-mt-1.5 flex items-center gap-3 rounded-t-lg border-b border-line bg-neutral-50 px-4 py-3.5">
        <Avatar url={user?.avatarUrl} name={user?.fullName} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight text-regantify-text">{user?.fullName || 'Your account'}</p>
          {isVendor && user?.vendor?.storeName && (
            <p className="mt-0.5 truncate text-[12.5px] text-neutral-600">{user.vendor.storeName}</p>
          )}
          {contact && <p className="truncate text-xs text-neutral-500">{contact}</p>}
        </div>
        {isVendor && plan && (
          <span className="shrink-0 self-start rounded-full bg-brand-lime px-2 py-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wider text-brand-dark">
            {plan.plan.name}
          </span>
        )}
        {isAdmin && (
          <span className="shrink-0 self-start rounded-full bg-brand-lime px-2 py-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wider text-brand-dark">
            Admin
          </span>
        )}
      </div>

      <div className="py-1.5">
        {isVendor && (
          <>
            <DropdownMenuItem onSelect={() => navigate('/vendor/profile')} icon={<Tile><User size={16} /></Tile>} hint="Your photo, name and email">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => navigate('/vendor/notifications')}
              icon={<Tile><Bell size={16} /></Tile>}
              hint="Orders, payments and plan updates"
              badge={<Count n={notes?.unreadCount ?? 0} tone="red" />}
            >
              Notifications
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => navigate('/vendor/support')}
              icon={<Tile><Headphones size={16} /></Tile>}
              hint="Ask the Regantify team for help"
              badge={<Count n={supportUnread} tone="orange" />}
            >
              Support
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/vendor/settings')} icon={<Tile><Settings size={16} /></Tile>} hint="Company details and preferences">
              Settings
            </DropdownMenuItem>
          </>
        )}
        {isAdmin && (
          <>
            <DropdownMenuItem onSelect={() => navigate('/admin/support')} icon={<Tile><Headphones size={16} /></Tile>} hint="Store tickets and replies">
              Support
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/admin/settings')} icon={<Tile><Settings size={16} /></Tile>} hint="Security, platform and team">
              Settings
            </DropdownMenuItem>
          </>
        )}
      </div>

      <DropdownMenuSeparator />
      <div className="pb-0.5">
        <DropdownMenuItem onSelect={logout} danger icon={<span className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600"><LogOut size={16} /></span>}>
          Log out
        </DropdownMenuItem>
      </div>
    </DropdownMenu>
  );
}
