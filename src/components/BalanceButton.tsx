import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { financeApi } from '../lib/financeApi';

const WALLET_PATH = '/vendor/finance/wallet';
const SHOW_MS = 5000; // how long the balance stays visible before it hides itself

const format = (n: number) => `৳${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * "Check balance" pill. A tap fetches the live balance (never the possibly
 * stale one on the auth user, which only refreshes on login/token refresh),
 * counts up to it and hides it again after SHOW_MS. While the amount is showing,
 * a tap on it opens the wallet page without hiding it early.
 */
export function BalanceButton() {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(0);
  const navigate = useNavigate();
  const wallet = useMutation({ mutationFn: () => financeApi.getWallet() });
  const balance = Number(wallet.data?.balance ?? 0);

  useEffect(() => {
    if (!visible) return;

    // Count up from 0 to the balance
    const start = performance.now();
    const duration = 800;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(balance * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const hide = setTimeout(() => setVisible(false), SHOW_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hide);
    };
  }, [visible, balance]);

  const onClick = () => {
    if (visible) {
      // Opens the wallet and leaves the amount showing: the Topbar stays mounted across pages, so the
      // 5-second countdown carries on and the amount hides itself when it runs out.
      navigate(WALLET_PATH);
      return;
    }
    wallet.mutate(undefined, { onSuccess: () => setVisible(true) });
  };

  return (
    <button
      onClick={onClick}
      disabled={wallet.isPending}
      aria-label={visible ? 'Open wallet' : 'Show balance'}
      title={visible ? 'Open wallet' : undefined}
      className={`relative flex h-10 w-[148px] shrink-0 sm:w-[160px] items-center gap-2.5 overflow-hidden rounded-full border pl-1.5 pr-4 text-sm transition-all duration-500 active:scale-95 disabled:cursor-wait ${
        visible
          ? 'border-brand/25 bg-white text-brand'
          : 'border-line bg-white text-neutral-700 hover:border-neutral-300 hover:shadow-sm'
      }`}
    >
      {/* Wallet icon, with a soft pulse ring while idle */}
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
        {!visible && <span className="absolute inset-0 animate-ping rounded-full bg-brand-lime/70" />}
        <span
          className={`relative flex h-7 w-7 items-center justify-center rounded-full bg-brand-lime text-brand transition-transform duration-500 ${
            visible ? 'rotate-[360deg] scale-110' : ''
          }`}
        >
          <Wallet size={15} />
        </span>
      </span>

      {visible ? (
        <span key="amount" className="animate-pop-in truncate font-semibold tabular-nums">
          {format(value)}
        </span>
      ) : (
        <span key="label" className="animate-pop-in whitespace-nowrap">
          {wallet.isPending ? 'Loading…' : 'Check balance'}
        </span>
      )}

      {visible && (
        // auto-hide countdown line
        <span
          className="animate-shrink absolute bottom-0 left-0 h-[2px] bg-brand/40"
          style={{ animationDuration: `${SHOW_MS}ms` }}
        />
      )}
    </button>
  );
}
