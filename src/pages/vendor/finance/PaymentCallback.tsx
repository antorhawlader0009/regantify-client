import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { paymentsApi, type PaymentStatus } from '../../../lib/paymentsApi';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';

const PURPOSE_LABEL: Record<string, string> = {
  WALLET_TOPUP: 'Your wallet top-up',
  SMS_PACKAGE: 'Your SMS package',
  CHATBOT_PACKAGE: 'Your AI chat bot package',
  PLAN_UPGRADE: 'Your plan upgrade',
};

// Where to go next after each kind of payment.
const PURPOSE_NEXT: Record<string, { to: string; label: string }> = {
  WALLET_TOPUP: { to: '/vendor/finance/wallet', label: 'Go to wallet' },
  SMS_PACKAGE: { to: '/vendor/sms', label: 'Go to SMS' },
  CHATBOT_PACKAGE: { to: '/vendor/ai-automation/ai-chat-bot', label: 'Go to AI chat bot' },
  PLAN_UPGRADE: { to: '/vendor/billing', label: 'Go to billing' },
};

// Invalidate the query keys each purpose's own page reads, so returning
// there shows the freshly-credited balance/plan without a manual refresh.
const INVALIDATE_KEYS: Record<string, string[][]> = {
  WALLET_TOPUP: [['finance', 'wallet'], ['finance', 'transactions']],
  SMS_PACKAGE: [['sms-credits']],
  CHATBOT_PACKAGE: [['chatbot-credits']],
  PLAN_UPGRADE: [['vendor-plan-usage'], ['own-plan-requests']],
};

/**
 * Finance > Wallet top-up / SMS Buy / AI Chat Bot Buy / plan upgrade's
 * shared landing page — PayStation's `callback_url` (see
 * PaymentsController.initiate) always points back here with
 * `?invoice=...`. Never trusts a query-param "it worked" signal from
 * the redirect itself (PayStation's own hosted checkout doesn't send
 * one anyway, just a bare redirect) — always calls the server's
 * reconcile endpoint, which re-verifies with PayStation server-to-
 * server before crediting anything (see PaymentsService.reconcile).
 * Polls a few times since the IPN and this page's own reconcile call
 * can race PayStation's own settlement.
 */
export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const invoiceNumber = searchParams.get('invoice');
  const queryClient = useQueryClient();
  const [state, setState] = useState<'checking' | PaymentStatus | 'error'>('checking');
  const [purpose, setPurpose] = useState<string | null>(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!invoiceNumber) {
      setState('error');
      return;
    }

    let cancelled = false;
    const maxAttempts = 5;

    const check = async () => {
      try {
        const result = await paymentsApi.reconcile(invoiceNumber);
        if (cancelled) return;

        if (result.status === 'SUCCESS') {
          const payment = await paymentsApi.getStatus(invoiceNumber).catch(() => null);
          if (cancelled) return;
          if (payment) {
            setPurpose(payment.purpose);
            (INVALIDATE_KEYS[payment.purpose] ?? []).forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
          }
          setState('SUCCESS');
          return;
        }

        if (result.status === 'FAILED' || result.status === 'CANCELLED') {
          setState(result.status);
          return;
        }

        attemptsRef.current += 1;
        if (attemptsRef.current >= maxAttempts) {
          setState('PENDING');
          return;
        }
        setTimeout(check, 2000);
      } catch {
        if (!cancelled) setState('error');
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [invoiceNumber, queryClient]);

  const next = (purpose && PURPOSE_NEXT[purpose]) || PURPOSE_NEXT.WALLET_TOPUP;

  return (
    <section className="mx-auto mt-8 max-w-md rounded-xl border border-line bg-white p-6 text-center sm:p-8" role="status" aria-live="polite">
      {state === 'checking' && (
        <>
          <Clock className="mx-auto mb-3 animate-pulse text-neutral-400" size={36} aria-hidden />
          <h1 className="text-[15px] font-semibold text-regantify-text">Checking your payment…</h1>
          <p className="mt-1 text-sm text-neutral-500">We’re confirming it with PayStation. This takes a few seconds.</p>
        </>
      )}

      {state === 'SUCCESS' && (
        <>
          <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={36} aria-hidden />
          <h1 className="text-[15px] font-semibold text-regantify-text">Payment received</h1>
          <p className="mt-1 text-sm text-neutral-500">{(purpose && PURPOSE_LABEL[purpose]) ?? 'Your purchase'} is added to your account.</p>
        </>
      )}

      {state === 'PENDING' && (
        <>
          <Clock className="mx-auto mb-3 text-amber-600" size={36} aria-hidden />
          <h1 className="text-[15px] font-semibold text-regantify-text">Still waiting for PayStation</h1>
          <p className="mt-1 text-sm text-neutral-500">
            If you finished paying, it’s added by itself in a minute or two. No need to pay again.
          </p>
        </>
      )}

      {(state === 'FAILED' || state === 'CANCELLED') && (
        <>
          <XCircle className="mx-auto mb-3 text-red-600" size={36} aria-hidden />
          <h1 className="text-[15px] font-semibold text-regantify-text">{state === 'CANCELLED' ? 'Payment cancelled' : 'Payment didn’t go through'}</h1>
          <p className="mt-1 text-sm text-neutral-500">Nothing was taken from your account. You can try again whenever you like.</p>
        </>
      )}

      {state === 'error' && (
        <>
          <XCircle className="mx-auto mb-3 text-red-600" size={36} aria-hidden />
          <h1 className="text-[15px] font-semibold text-regantify-text">Couldn’t check this payment</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {invoiceNumber
              ? 'Refresh this page in a minute. If money left your account, it’s added by itself once PayStation confirms.'
              : 'This link has no payment reference. Open the payment again from your wallet.'}
          </p>
        </>
      )}

      {state !== 'checking' && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to={next.to} className={`${primaryBtn} h-10 px-4`}>
            {next.label}
          </Link>
          {next.to !== '/vendor/finance/wallet' && (
            <Link to="/vendor/finance/wallet" className={`${outlineBtn} h-10`}>
              Go to wallet
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
