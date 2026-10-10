import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardCheck, ScanLine } from 'lucide-react';
import { EmptyState, PageHeader, PageSection, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import {
  RETURN_OUTCOME_LABELS,
  returnCheckInApi,
  type ReturnCheckParcel,
  type ReturnOutcome,
} from '../../../lib/returnCheckInApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const fieldClass = 'h-9 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';
const OUTCOMES: ReturnOutcome[] = ['GOOD', 'DAMAGED', 'MISSING'];
const OUTCOME_ACTIVE: Record<ReturnOutcome, string> = {
  GOOD: 'border-green-600 bg-green-50 text-green-800',
  DAMAGED: 'border-amber-500 bg-amber-50 text-amber-800',
  MISSING: 'border-red-500 bg-red-50 text-red-700',
};

/** One returned parcel: each product line gets "good", "damaged" or "did not come", then Confirm. A parcel already checked in is shown read-only. */
function ParcelCard({
  parcel,
  stockAfterCheckIn,
  highlight,
  onDone,
}: {
  parcel: ReturnCheckParcel;
  stockAfterCheckIn: boolean;
  highlight: boolean;
  onDone: (done: ReturnCheckParcel) => void;
}) {
  const done = parcel.checkedAt !== null;
  // Everything starts as "good": most returned parcels are fine, and the person only has to flag the exceptions.
  const [outcomes, setOutcomes] = useState<Record<string, ReturnOutcome>>(() =>
    Object.fromEntries(parcel.lines.map((l) => [l.itemId, l.outcome ?? 'GOOD'])),
  );
  const [note, setNote] = useState('');

  const confirm = useMutation({
    mutationFn: () => returnCheckInApi.checkIn(parcel.orderId, parcel.lines.map((l) => ({ itemId: l.itemId, outcome: outcomes[l.itemId] ?? 'GOOD' })), note),
    onSuccess: (result) => {
      toast.success(`${result.orderRef} checked in.`);
      onDone(result);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not check this parcel in.')),
  });

  const bad = parcel.lines.filter((l) => outcomes[l.itemId] && outcomes[l.itemId] !== 'GOOD').length;
  const stockNote = done
    ? null
    : stockAfterCheckIn && !parcel.stockAlreadyBack
      ? 'Products you mark good are added back to stock now.'
      : bad > 0
        ? 'Products you mark damaged or not come are taken off stock now (they were added back when the order was marked Returned).'
        : 'Stock was already added back when the order was marked Returned. Nothing changes unless you flag a product.';

  return (
    <div className={`rounded-xl border bg-white ${highlight ? 'border-brand ring-1 ring-brand/30' : 'border-line'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <Link to={`/vendor/orders/${parcel.orderId}`} className="text-sm font-semibold text-brand hover:underline">
            {parcel.orderRef}
          </Link>
          <span className="ml-2 text-sm text-neutral-600">{parcel.customerName}</span>
          <p className="mt-0.5 text-xs text-neutral-500">
            {[parcel.courier, parcel.trackingId, parcel.returnedAt ? `returned ${formatDhakaDateTime(parcel.returnedAt)}` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        {done && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">
            <CheckCircle2 size={13} aria-hidden />
            Checked in{parcel.checkedBy ? ` by ${parcel.checkedBy}` : ''}
            {parcel.checkedAt ? `, ${formatDhakaDateTime(parcel.checkedAt)}` : ''}
          </span>
        )}
      </div>

      <ul className="divide-y divide-line">
        {parcel.lines.map((l) => (
          <li key={l.itemId} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            {l.productImage ? <img src={l.productImage} alt="" className="h-10 w-10 rounded-md border border-line object-cover" /> : <span className="h-10 w-10 rounded-md bg-neutral-100" />}
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium text-regantify-text">{l.productName}</p>
              <p className="text-xs text-neutral-500">
                {l.options ? `${l.options} · ` : ''}Qty {l.quantity}
              </p>
            </div>
            {done ? (
              <span className="text-sm text-neutral-600">{l.outcome ? RETURN_OUTCOME_LABELS[l.outcome] : '—'}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`What happened to ${l.productName}`}>
                {OUTCOMES.map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={outcomes[l.itemId] === o}
                    onClick={() => setOutcomes((prev) => ({ ...prev, [l.itemId]: o }))}
                    className={`rounded-lg border px-2.5 py-1 text-xs ${outcomes[l.itemId] === o ? `${OUTCOME_ACTIVE[o]} font-medium` : 'border-line text-neutral-600 hover:bg-neutral-50'}`}
                  >
                    {RETURN_OUTCOME_LABELS[o]}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {!done && (
        <div className="space-y-2 border-t border-line px-4 py-3">
          {stockNote && <p className="text-xs text-neutral-500">{stockNote}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="Note (optional), e.g. box torn"
              className={`${fieldClass} min-w-[200px] flex-1`}
              aria-label="Note"
            />
            <button type="button" onClick={() => confirm.mutate()} disabled={confirm.isPending} className={primaryBtn}>
              {confirm.isPending ? 'Saving…' : 'Confirm check-in'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Orders > Return check-in (TellMe idea 25): the returned parcels not counted in at the shop yet. Scan or type a
 * tracking ID (or order number) to bring one up, say per product whether it came back good, damaged or not at all,
 * and confirm. What that does to stock follows Store > Stock Settings (see the banner), and every damaged or missing
 * product is written into the product's stock history with who did it.
 */
export default function ReturnCheckIn() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [scan, setScan] = useState('');
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<ReturnCheckParcel | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({ queryKey: ['return-check-in'], queryFn: returnCheckInApi.pending });
  const parcels = (data?.parcels ?? []).filter((p) => p.orderId !== found?.orderId);

  async function lookUp(code: string) {
    const text = code.trim();
    if (!text) return;
    setScanning(true);
    try {
      setFound(await returnCheckInApi.find(text));
      setScan('');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not find that parcel.'));
    } finally {
      setScanning(false);
      scanRef.current?.focus();
    }
  }

  // Order detail's "Check in" link arrives with ?code=<order number>.
  const initialCode = useRef(params.get('code'));
  useEffect(() => {
    if (initialCode.current) {
      void lookUp(initialCode.current);
      initialCode.current = null;
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const afterDone = (result: ReturnCheckParcel) => {
    setFound((prev) => (prev && prev.orderId === result.orderId ? result : prev));
    void queryClient.invalidateQueries({ queryKey: ['return-check-in'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    void queryClient.invalidateQueries({ queryKey: ['order'] });
    scanRef.current?.focus();
  };

  return (
    <PageSection>
      <PageHeader
        title="Return check-in"
        description="Parcels the courier sent back. Open each one, say what you found, and stock is kept right."
        actions={
          <Link to="/vendor/orders" className={outlineBtn}>
            Back to orders
          </Link>
        }
      />

      <div className="mb-3 rounded-lg border border-line bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        {data?.stockAfterCheckIn
          ? 'Your setting: returned stock is added back only after you check the parcel in. Products you mark good go back to stock; damaged or missing ones stay out.'
          : 'Your setting: stock was already added back when each order was marked Returned. Here you only take off what came back damaged or never came.'}{' '}
        <Link to="/vendor/store/stock-settings" className="text-brand hover:underline">
          Change
        </Link>
      </div>

      <div className="relative mb-4 max-w-md">
        <ScanLine size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden />
        <input
          ref={scanRef}
          value={scan}
          onChange={(e) => setScan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void lookUp(scan);
            }
          }}
          disabled={scanning}
          autoFocus
          placeholder="Scan or type a tracking ID or order number, press Enter"
          className={`${fieldClass} w-full pl-9`}
          aria-label="Scan a returned parcel"
        />
      </div>

      {found && (
        <div className="mb-4">
          <ParcelCard key={`${found.orderId}-${found.checkedAt ?? 'open'}`} parcel={found} stockAfterCheckIn={data?.stockAfterCheckIn ?? false} highlight onDone={afterDone} />
        </div>
      )}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>
      ) : parcels.length === 0 && !found ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No returned parcels waiting"
          hint="When a courier sends a parcel back (or you mark an order Returned), it shows up here until you check it in. You can also scan any returned parcel's tracking ID above."
        />
      ) : (
        <div className="space-y-3">
          {parcels.length > 0 && (
            <p className="text-sm text-neutral-600">
              {data!.total} returned {data!.total === 1 ? 'parcel' : 'parcels'} waiting
              {data!.total > parcels.length + (found ? 1 : 0) ? ` (showing the first ${data!.parcels.length})` : ''}
            </p>
          )}
          {parcels.map((p) => (
            <ParcelCard key={p.orderId} parcel={p} stockAfterCheckIn={data?.stockAfterCheckIn ?? false} highlight={false} onDone={afterDone} />
          ))}
        </div>
      )}
    </PageSection>
  );
}
