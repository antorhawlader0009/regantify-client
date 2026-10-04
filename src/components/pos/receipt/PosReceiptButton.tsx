import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { posApi } from '../../../lib/posApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useReceiptPrinter } from './useReceiptPrinter';

/** Order Detail's "Print receipt" for a POS sale: the same counter slip, printed again. */
export function PosReceiptButton({ orderId, className }: { orderId: string; className: string }) {
  const printer = useReceiptPrinter();
  const [loading, setLoading] = useState(false);

  async function print() {
    setLoading(true);
    try {
      printer.print(await posApi.sale(orderId));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'The receipt couldn’t load. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={print} disabled={loading || printer.printing} className={className}>
        <Printer size={15} aria-hidden />
        {loading || printer.printing ? 'Opening…' : 'Print receipt'}
      </button>
      {printer.element}
    </>
  );
}

/** Order Detail: the returns and voids against a POS sale (Step 8), when there are any. */
export function PosSaleReturns({ orderId }: { orderId: string }) {
  const query = useQuery({ queryKey: ['pos', 'sale', orderId], queryFn: () => posApi.sale(orderId), retry: false });
  const returns = query.data?.returns ?? [];
  if (returns.length === 0) return null;
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="text-xs font-medium text-neutral-500">Returns</p>
      <ul className="mt-1 space-y-1 text-sm">
        {returns.map((r, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>
              {r.kind === 'VOID' ? 'Voided' : 'Returned'} by {r.cashierName}
              <span className="text-neutral-500">
                {' '}
                · {new Date(r.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                {r.reason && ` · ${r.reason}`}
              </span>
            </span>
            <span className="tabular-nums">-৳{r.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
