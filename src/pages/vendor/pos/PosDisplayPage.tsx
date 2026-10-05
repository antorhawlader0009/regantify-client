import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { openDisplayChannel, type DisplayMessage } from '../../../lib/posDisplay';
import { taka } from '../../../components/pos/ui';
import './pos-theme.css';

/**
 * The customer-facing screen (POS-system-plan.md Step 12): what the counter rings up, big enough
 * to read across the counter. Full screen, outside the dashboard; fed by the counter tab over a
 * BroadcastChannel (lib/posDisplay.ts). Shows the shop's Bangla QR when the customer pays by QR.
 */
export default function PosDisplayPage() {
  const [state, setState] = useState<DisplayMessage>({ type: 'idle', storeName: '' });

  useEffect(() => {
    const previous = document.title;
    document.title = 'Customer screen';
    const channel = openDisplayChannel((m) => {
      if (m.type !== 'hello') setState(m);
    });
    // Ask the counter for what's on screen right now.
    channel.send({ type: 'hello' });
    return () => {
      channel.close();
      document.title = previous;
    };
  }, []);

  const store = 'storeName' in state ? state.storeName : '';

  return (
    <div className="pos-root flex h-dvh flex-col bg-pos-page text-pos-ink">
      <header className="shrink-0 border-b border-pos-line bg-pos-surface px-8 py-5">
        <p className="text-2xl font-semibold">{store || 'Welcome'}</p>
      </header>

      {state.type === 'cart' && state.lines.length > 0 ? (
        <main className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
          <ul className="min-h-0 divide-y divide-pos-line overflow-y-auto bg-pos-surface px-8">
            {state.lines.map((l, i) => (
              <li key={i} className="flex items-baseline justify-between gap-6 py-4 text-xl">
                <span className="min-w-0">
                  <span className="font-medium">{l.name}</span>
                  {l.options && <span className="ml-2 text-base text-pos-muted">{l.options}</span>}
                  <span className="ml-3 text-base text-pos-muted">× {l.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums">{taka(l.total)}</span>
              </li>
            ))}
          </ul>
          <aside className="flex flex-col justify-end gap-3 border-l border-pos-line p-8 text-xl">
            {state.discount > 0 && (
              <p className="flex justify-between text-pos-go">
                <span>Discount</span>
                <span className="tabular-nums">−{taka(state.discount)}</span>
              </p>
            )}
            {state.vat > 0 && (
              <p className="flex justify-between text-pos-muted">
                <span>{state.vatIncluded ? 'Includes VAT' : 'VAT'}</span>
                <span className="tabular-nums">{taka(state.vat)}</span>
              </p>
            )}
            <p className="flex items-baseline justify-between border-t border-pos-line pt-4">
              <span>Total</span>
              <span className="text-5xl font-semibold tabular-nums">{taka(state.total)}</span>
            </p>
          </aside>
        </main>
      ) : state.type === 'pay' ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
          <p className="text-2xl text-pos-muted">To pay</p>
          <p className="text-7xl font-semibold tabular-nums">{taka(state.total)}</p>
          {state.qrImageUrl && (
            <>
              <img src={state.qrImageUrl} alt="Scan to pay with any bank or MFS app" className="max-h-[45vh] rounded-xl border border-pos-line bg-white p-4" />
              <p className="text-xl text-pos-muted">Scan with bKash, Nagad or any bank app</p>
            </>
          )}
        </main>
      ) : state.type === 'done' ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <CheckCircle2 size={72} className="text-pos-go" aria-hidden />
          <p className="text-4xl font-semibold">Thank you!</p>
          <p className="text-2xl text-pos-muted">Total {taka(state.total)}</p>
          {state.change > 0 && <p className="text-5xl font-semibold tabular-nums">Change {taka(state.change)}</p>}
        </main>
      ) : (
        <main className="flex flex-1 items-center justify-center p-8">
          <p className="text-4xl font-semibold text-pos-muted">Welcome{store ? ` to ${store}` : ''}</p>
        </main>
      )}
    </div>
  );
}
