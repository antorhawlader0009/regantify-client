import { Fragment } from 'react';
import { ExternalLink, Menu, MessageSquare } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAssistantUi } from '../store/assistantStore';
import { isNavGroup, type NavSection } from '../lib/navConfig';
import { storefrontStoreUrl } from '../lib/storefrontUrl';
import { AccountMenu } from './AccountMenu';
import { NotificationBell } from './NotificationBell';
import { BalanceButton } from './BalanceButton';
import { HelpButton } from './help/HelpButton';
import { SearchPalette, SearchTrigger } from './search/GlobalSearch';
import { AdminSearch } from './admin/AdminSearch';
import { AdminBell } from './admin/AdminBell';

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
  if (pathname.startsWith('/vendor/notifications')) return ['Notifications'];
  return pathname.startsWith('/vendor/profile') ? ['Profile'] : [];
}

export function Topbar({ sections, onMenuClick }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isVendor = user?.role === 'VENDOR';
  const crumbs = breadcrumb(sections, location.pathname);
  const assistantOpen = useAssistantUi((s) => s.open);
  const toggleAssistant = useAssistantUi((s) => s.toggle);

  const isAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <>
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

      <div className="hidden min-w-0 shrink truncate text-[14px] text-neutral-500 md:block">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="mx-2 text-neutral-300" aria-hidden>/</span>}
            <span className={i === crumbs.length - 1 ? 'text-neutral-900' : undefined}>{c}</span>
          </Fragment>
        ))}
      </div>

      {/* Vendors get the store search palette (GlobalSearch); Super Admin gets its own (AdminSearch, Ctrl K: stores, orders, IDs, pages, settings). */}
      {isVendor ? <SearchTrigger /> : <AdminSearch />}

      {/* Opens the "Ask AI" side panel (AssistantPanel, docked on the right of the dashboard). */}
      {isVendor && (
        <button
          type="button"
          onClick={toggleAssistant}
          aria-label="Ask AI"
          aria-pressed={assistantOpen}
          className={`flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg border text-sm transition active:scale-95 sm:w-auto sm:px-4 ${
            assistantOpen ? 'border-neutral-300 bg-neutral-100 text-neutral-900' : 'border-line bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          <MessageSquare size={15} className="text-neutral-600" />
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
          className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 active:scale-95 sm:w-auto sm:px-4"
        >
          <span className="hidden sm:inline">Visit Shop</span>
          <ExternalLink size={13} className="text-neutral-400" />
        </a>
      )}

      {/* Help, What's new and Ideas (super-admin-new.md Step 11); a red dot when What's new has unseen entries. */}
      {isVendor && <HelpButton />}

      {isVendor && <BalanceButton />}

      {/* Vendor-only live digest, just left of the avatar. */}
      {isVendor && <NotificationBell />}
      {isAdmin && <AdminBell />}

      {/* Account menu: who is signed in, Profile / Notifications / Support / Settings, Log out. */}
      <AccountMenu />
    </header>
    {isVendor && <SearchPalette />}
    </>
  );
}
