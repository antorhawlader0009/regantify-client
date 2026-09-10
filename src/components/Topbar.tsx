import { useEffect, useRef, useState } from 'react';
import { Store, Search, LogOut, User, Settings, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../lib/authApi';
import { storefrontStoreUrl } from '../lib/storefrontUrl';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from './ui/DropdownMenu';

interface TopbarProps {
  brandLabel?: string; // "Regantify" for vendor, "Regantify Admin" for admin
}

const BALANCE_REVEAL_MS = 5000;

export function Topbar({ brandLabel = 'Regantify' }: TopbarProps) {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);

  const [balanceRevealed, setBalanceRevealed] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVendor = user?.role === 'VENDOR';
  const balance = user?.vendor?.balance;

  // Clear any pending auto-hide timer on unmount so it doesn't fire after
  // the component (or the whole layout, on logout) is gone.
  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const handleToggleBalance = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    if (balanceRevealed) {
      setBalanceRevealed(false);
      return;
    }

    setBalanceRevealed(true);
    hideTimerRef.current = setTimeout(() => setBalanceRevealed(false), BALANCE_REVEAL_MS);
  };

  const handleSettings = () => {
    navigate(user?.role === 'SUPER_ADMIN' ? '/admin/settings' : '/vendor/settings');
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // even if the network call fails, clear local state and send them to login
    } finally {
      clearAuth();
      navigate(user?.role === 'SUPER_ADMIN' ? '/admin/login' : '/vendor/login', { replace: true });
    }
  };

  return (
    <header className="bg-regantify-topbar h-[82px] flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-3">
        <Store className="text-white" size={32} strokeWidth={2} />
        <span className="font-brand text-white text-3xl leading-none pt-1">{brandLabel}</span>
      </div>

      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-regantify-text-muted"
            size={18}
          />
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-regantify-search rounded-2xl pl-11 pr-4 py-2.5 text-regantify-text
              placeholder:text-regantify-text focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Visit site — opens the vendor's public storefront (a separate,
            server-rendered Next.js app — see storefront/) in a new tab.
            Sits left of the balance chip. */}
        {isVendor && user?.vendor?.subdomain && (
          <a
            href={storefrontStoreUrl(user.vendor.subdomain)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 transition-colors
              rounded-full px-3.5 py-2 text-sm font-medium text-white"
            title="Visit site"
          >
            <ExternalLink size={16} />
            Visit site
          </a>
        )}

        {/* Balance — masked like a bKash-style balance chip. Tap to reveal
            for 5 seconds, tap again to hide immediately. */}
        {isVendor && balance !== undefined && (
          <button
            onClick={handleToggleBalance}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 transition-colors
              rounded-full pl-3.5 pr-3 py-2 text-sm font-medium text-white overflow-hidden"
            title={balanceRevealed ? 'Hide balance' : 'Show balance'}
          >
            <span
              className={`transition-all duration-300 ease-out whitespace-nowrap ${
                balanceRevealed ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'
              }`}
            >
              ৳{Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            {balanceRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}

        {/* Account menu — avatar opens a small dialog with Settings + Log out. */}
        <DropdownMenu
          trigger={
            <button
              className="block rounded-full ring-2 ring-transparent hover:ring-white/20 transition-shadow"
              title="Account menu"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName ?? 'Profile'}
                  className="w-9 h-9 rounded-full object-cover border border-white/10"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="text-white/70" size={18} />
                </div>
              )}
            </button>
          }
        >
          {user?.fullName && (
            <>
              <div className="px-4 py-2">
                <p className="text-sm font-medium text-regantify-text truncate">{user.fullName}</p>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={handleSettings}>
            <Settings size={16} />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleLogout} danger>
            <LogOut size={16} />
            Log out
          </DropdownMenuItem>
        </DropdownMenu>
      </div>
    </header>
  );
}
