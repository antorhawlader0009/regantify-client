import { Fragment } from 'react';
import { ExternalLink, LogOut, Menu, Search, Settings, Sparkles, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAssistantUi } from '../store/assistantStore';
import { isNavGroup, type NavSection } from '../lib/navConfig';
import { storefrontStoreUrl } from '../lib/storefrontUrl';
import { useLogout } from '../lib/useLogout';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from './ui/DropdownMenu';
import { NotificationBell } from './NotificationBell';
import { BalanceButton } from './BalanceButton';

interface TopbarProps {
  sections: NavSection[];
  /** Phones/tablets: opens the sidebar drawer. */
  onMenuClick?: () => void;
}

/** "Group > Page" for the current route, from the longest matching nav path. */
function breadcrumb(sections: NavSection[], pathname: string): string[] {
  let best: { crumbs: string[]; len: number } | null = null;
  const consider = (path: string | undefined, crumbs: string[]) => {
    if (path && pathname.startsWith(path) && (!best || path.length > best.len)) best = { crumbs, len: path.length };
  };
  for (const s of sections) {
    consider(s.path, s.group ? [s.group, s.label] : [s.label]);
    for (const c of s.children ?? []) {
      if (isNavGroup(c)) c.children.forEach((l) => consider(l.path, [s.label, c.label, l.label]));
      else consider(c.path, [s.label, c.label]);
    }
  }
  if (best) return (best as { crumbs: string[] }).crumbs;
  // Pages reached from the avatar menu rather than the sidebar.
  return pathname.startsWith('/vendor/profile') ? ['Profile'] : [];
}

export function Topbar({ sections, onMenuClick }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const isVendor = user?.role === 'VENDOR';
  const crumbs = breadcrumb(sections, location.pathname);
  const assistantOpen = useAssistantUi((s) => s.open);
  const toggleAssistant = useAssistantUi((s) => s.toggle);

  const isAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-1.5 border-b border-line bg-white px-3 sm:gap-4 sm:px-4">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line text-regantify-text lg:hidden"
      >
        <Menu size={18} />
      </button>
      {/* Pushes the right-hand buttons over while breadcrumb and search are hidden (below md). */}
      <div className="flex-1 md:hidden" aria-hidden />

      <div className="hidden min-w-0 shrink truncate text-[15px] text-neutral-500 md:block">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="mx-1.5 text-neutral-400">&gt;</span>}
            <span className={i === crumbs.length - 1 ? 'text-neutral-900' : undefined}>{c}</span>
          </Fragment>
        ))}
      </div>

      <div className="mx-auto hidden h-9 w-full max-w-[360px] items-center gap-2 rounded-lg border border-line px-3 md:flex">
        <Search size={16} className="shrink-0 text-neutral-600" />
        <input
          type="text"
          placeholder="Search"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
        />
      </div>

      {/* Opens the "Ask AI" side panel (AssistantPanel, docked on the right of the dashboard). */}
      {isVendor && (
        <button
          type="button"
          onClick={toggleAssistant}
          aria-label="Ask AI"
          aria-pressed={assistantOpen}
          className={`flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full border text-sm transition active:scale-95 sm:w-auto sm:px-4 ${
            assistantOpen ? 'border-neutral-300 bg-neutral-100 text-neutral-900' : 'border-line bg-white text-neutral-700 hover:border-neutral-300 hover:shadow-sm'
          }`}
        >
          <Sparkles size={15} className="text-neutral-600" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      )}

      {/* Opens the vendor's public storefront (the separate storefront/ app) in a new tab. */}
      {isVendor && user?.vendor?.subdomain && (
        <a
          href={storefrontStoreUrl(user.vendor.subdomain)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Shop"
          className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full border border-line bg-white text-sm text-neutral-700 transition hover:border-neutral-300 hover:shadow-sm active:scale-95 sm:w-auto sm:px-4"
        >
          <span className="hidden sm:inline">Visit Shop</span>
          <ExternalLink size={13} className="text-neutral-400" />
        </a>
      )}

      {isVendor && <BalanceButton />}

      {/* Vendor-only live digest, just left of the avatar. */}
      {isVendor && <NotificationBell />}

      {/* Account menu: Settings + Log out. */}
      <DropdownMenu
        trigger={
          <button
            className="block shrink-0 rounded-full ring-2 ring-transparent transition-shadow hover:ring-brand-lime"
            title="Account menu"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName ?? 'Profile'}
                className="h-9 w-9 rounded-full border border-line object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-500">
                <User className="text-white" size={18} />
              </div>
            )}
          </button>
        }
      >
        {user?.fullName && (
          <>
            <div className="px-4 py-2">
              <p className="truncate text-sm font-medium text-regantify-text">{user.fullName}</p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {/* The vendor's own profile (photo/name/email); store settings stay in the sidebar.
            Super Admin has no profile page, so it keeps Settings. */}
        {isVendor && (
          <DropdownMenuItem onSelect={() => navigate('/vendor/profile')}>
            <User size={16} />
            Profile
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem onSelect={() => navigate('/admin/settings')}>
            <Settings size={16} />
            Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={logout} danger>
          <LogOut size={16} />
          Log out
        </DropdownMenuItem>
      </DropdownMenu>
    </header>
  );
}
