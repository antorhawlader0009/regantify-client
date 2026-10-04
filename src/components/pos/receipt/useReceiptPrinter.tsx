import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posApi, type PosReceipt } from '../../../lib/posApi';
import { toast } from '../../../lib/toast';
import { PosReceiptSlip, printReceipt } from './PosReceiptSlip';

export const RECEIPT_PROFILE_KEY = ['pos', 'receipt-profile'] as const;

/**
 * Print a receipt from anywhere (the counter after a sale, "Reprint last",
 * Order Detail). Renders the slip off screen, waits for its QR code to be
 * drawn, then prints. `element` must be put in the page once.
 */
export function useReceiptPrinter() {
  const profile = useQuery({ queryKey: RECEIPT_PROFILE_KEY, queryFn: posApi.receiptProfile, staleTime: 60_000 });
  const [receipt, setReceipt] = useState<PosReceipt | null>(null);
  const [printing, setPrinting] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);
  const pending = useRef(false);

  // Print once the requested receipt is on the page and its QR code (async) has been drawn.
  useEffect(() => {
    if (!pending.current || !receipt || !profile.data) return;
    let tries = 0;
    const timer = setInterval(() => {
      const el = slipRef.current;
      const qrReady = !receipt.receiptUrl || !!el?.querySelector('svg');
      if (el && (qrReady || ++tries > 20)) {
        clearInterval(timer);
        pending.current = false;
        printReceipt(el, receipt, profile.data)
          .catch(() => toast.error('Could not open the print window. Please try again.'))
          .finally(() => setPrinting(false));
      }
    }, 50);
    return () => clearInterval(timer);
  }, [receipt, profile.data]);

  const print = useCallback(
    (next: PosReceipt) => {
      if (profile.isError) {
        toast.error('The receipt settings couldn’t load, so it can’t print. Refresh the page and try again.');
        return;
      }
      pending.current = true;
      setPrinting(true);
      setReceipt({ ...next });
    },
    [profile.isError],
  );

  const element =
    receipt && profile.data ? (
      <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0">
        <PosReceiptSlip ref={slipRef} receipt={receipt} profile={profile.data} />
      </div>
    ) : null;

  return { print, printing, element, profile: profile.data };
}
