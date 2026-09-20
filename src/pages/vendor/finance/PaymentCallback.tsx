import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Link as LinkIcon, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { paymentsApi, type PaymentStatus } from '../../../lib/paymentsApi';

const PURPOSE_LABEL: Record<string, string> = {
  WALLET_TOPUP: 'Wallet top-up',
  SMS_PACKAGE: 'SMS package',
  CHATBOT_PACKAGE: 'AI Chat Bot package',
  PLAN_UPGRADE: 'Plan upgrade',
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
 * Finance > Wallet test-payment / SMS Buy / AI Chat Bot Buy's shared
 * landing page — PayStation's `callback_url` (see
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

  return (
    <div className="max-w-md mx-auto mt-12 bg-white rounded-2xl border border-black/5 p-8 text-center">
      {state === 'checking' && (
        <>
          <Clock className="mx-auto mb-4 text-regantify-text-muted animate-pulse" size={40} />
          <h1 className="text-lg font-semibold text-regantify-text mb-1">Confirming your payment…</h1>
          <p className="text-sm text-regantify-text-muted">Please wait while we verify this with PayStation.</p>
        </>
      )}

      {state === 'SUCCESS' && (
        <>
          <CheckCircle2 className="mx-auto mb-4 text-emerald-600" size={40} />
          <h1 className="text-lg font-semibold text-regantify-text mb-1">Payment successful</h1>
          <p className="text-sm text-regantify-text-muted mb-6">
            {purpose ? PURPOSE_LABEL[purpose] ?? 'Your purchase' : 'Your purchase'} has been credited to your account.
          </p>
        </>
      )}

      {state === 'PENDING' && (
        <>
          <Clock className="mx-auto mb-4 text-amber-600" size={40} />
          <h1 className="text-lg font-semibold text-regantify-text mb-1">Still processing</h1>
          <p className="text-sm text-regantify-text-muted mb-6">
            PayStation hasn't confirmed this payment yet. If you completed checkout, it will be credited automatically —
            check back in a minute.
          </p>
        </>
      )}

      {(state === 'FAILED' || state === 'CANCELLED') && (
        <>
          <XCircle className="mx-auto mb-4 text-red-600" size={40} />
          <h1 className="text-lg font-semibold text-regantify-text mb-1">
            {state === 'CANCELLED' ? 'Payment cancelled' : 'Payment failed'}
          </h1>
          <p className="text-sm text-regantify-text-muted mb-6">Nothing was charged. You can try again anytime.</p>
        </>
      )}

      {state === 'error' && (
        <>
          <XCircle className="mx-auto mb-4 text-red-600" size={40} />
          <h1 className="text-lg font-semibold text-regantify-text mb-1">Couldn't confirm this payment</h1>
          <p className="text-sm text-regantify-text-muted mb-6">
            {invoiceNumber ? 'Something went wrong verifying this transaction.' : 'No invoice reference was provided.'}
          </p>
        </>
      )}

      <Link
        to="/vendor/finance/wallet"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark
          text-white text-sm font-medium transition-colors"
      >
        <LinkIcon size={14} />
        Back to Wallet
      </Link>
    </div>
  );
}
