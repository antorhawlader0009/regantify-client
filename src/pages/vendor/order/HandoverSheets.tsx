import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, ScanLine, Truck } from 'lucide-react';
import { EmptyState, PageHeader, PageSection, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import {
  handoverApi,
  type HandoverCandidate,
  type HandoverCourierFilter,
  type HandoverSheet,
} from '../../../lib/handoverApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const fieldClass = 'h-9 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';

/**
 * Orders > Courier Handover (TellMe idea 18): pick the parcels going to a courier's pickup person (tick them, or scan
 * their tracking IDs at the packing table), then "Create sheet" for a printable list with the count, the cash to collect
 * and a line to sign. Each parcel gets a line in its order history and a "On sheet N" mark here.
 */
export default function HandoverSheets() {
  const queryClient = useQueryClient();
  const location = useLocation();
  // Orders > "Handover sheet" on selected orders arrives here with them ticked.
  const preselected = useRef<string[]>((location.state as { orderIds?: string[] } | null)?.orderIds ?? []);
  const [courier, setCourier] = useState<HandoverCourierFilter | ''>('');
  const [days, setDays] = useState(preselected.current.length > 0 ? 60 : 7);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState<HandoverCandidate[]>([]);
  const [scan, setScan] = useState('');
  const [scanning, setScanning] = useState(false);
  const [note, setNote] = useState('');
  const [made, setMade] = useState<HandoverSheet | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['handover-candidates', courier, days],
    queryFn: () => handoverApi.candidates(courier || undefined, days),
  });
  const { data: sheets = [] } = useQuery({ queryKey: ['handover-sheets'], queryFn: handoverApi.list });

  // Ticked parcels from the Orders page: tick the ones that can go on a sheet and say how many couldn't.
  const appliedPreselect = useRef(false);
  useEffect(() => {
    if (appliedPreselect.current || isLoading || preselected.current.length === 0) return;
    appliedPreselect.current = true;
    const ready = new Set(candidates.map((c) => c.orderId));
    const ok = preselected.current.filter((id) => ready.has(id));
    setSelected(new Set(ok));
    if (ok.length < preselected.current.length) {
      toast.info(`${preselected.current.length - ok.length} of the selected orders can’t go on a sheet (no courier booking, or already finished).`);
    }
  }, [candidates, isLoading]);

  // The list: what the filter finds, plus parcels scanned in that it didn't show.
  const rows = useMemo(() => {
    const seen = new Set(candidates.map((c) => c.orderId));
    return [...extra.filter((e) => !seen.has(e.orderId)), ...candidates];
  }, [candidates, extra]);
  const picked = rows.filter((r) => selected.has(r.orderId));
  const codTotal = picked.reduce((sum, r) => sum + r.codAmount, 0);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function onScan() {
    const code = scan.trim();
    if (!code) return;
    setScanning(true);
    try {
      const found = await handoverApi.find(code);
      setExtra((prev) => (prev.some((p) => p.orderId === found.orderId) ? prev : [found, ...prev]));
      const already = selected.has(found.orderId);
      setSelected((prev) => new Set(prev).add(found.orderId));
      if (already) toast.info(`${found.orderRef} is already ticked.`);
      else if (found.sheetNumber) toast.info(`${found.orderRef} added. It was already on sheet ${found.sheetNumber}.`);
      else toast.success(`${found.orderRef} added (${found.courier}).`);
      setScan('');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not find that parcel.'));
    } finally {
      setScanning(false);
      scanRef.current?.focus();
    }
  }

  const create = useMutation({
    mutationFn: () => handoverApi.create(picked.map((p) => p.orderId), note),
    onSuccess: (sheet) => {
      setMade(sheet);
      setSelected(new Set());
      setExtra([]);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['handover-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['handover-candidates'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not make the sheet.')),
  });

  const printHref = (id: string) => `/vendor/orders/handover/${id}/print`;

  return (
    <div className="space-y-4">
      <PageSection>
        <PageHeader
          title="Courier Handover"
          description="Tick the parcels you are giving to a courier’s pickup person, or scan their tracking IDs, then print a sheet with the count and cash to collect. Both of you sign it."
          actions={
            <Link to="/vendor/orders" className={outlineBtn}>
              Back to orders
            </Link>
          }
        />

        {made && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm text-green-800">
              <b>Sheet {made.number}</b> is ready: {made.parcelCount} {made.parcelCount === 1 ? 'parcel' : 'parcels'}, {taka(Number(made.codTotal))} to collect
              {made.courier !== 'Mixed' ? ` for ${made.courier}` : ''}.
            </p>
            <a href={printHref(made.id)} target="_blank" rel="noreferrer" className={primaryBtn}>
              <Printer size={14} />
              Print sheet {made.number}
            </a>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select value={courier} onChange={(e) => setCourier(e.target.value as HandoverCourierFilter | '')} className={fieldClass} aria-label="Courier">
            <option value="">All couriers</option>
            <option value="PATHAO">Pathao</option>
            <option value="STEADFAST">SteadFast</option>
            <option value="REDX">RedX</option>
            <option value="MANUAL">Own courier (Paperfly, rider...)</option>
          </select>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={fieldClass} aria-label="How far back">
            <option value={3}>Last 3 days</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
          </select>
          <div className="relative ml-auto min-w-[240px] flex-1 sm:flex-none">
            <ScanLine size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input
              ref={scanRef}
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void onScan();
                }
              }}
              disabled={scanning}
              placeholder="Scan or type a tracking ID, press Enter"
              className={`${fieldClass} w-full pl-9 sm:w-80`}
              aria-label="Scan a parcel"
            />
          </div>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No parcels to hand over"
            hint="Parcels show up here once they are booked with a courier (Pathao, SteadFast, RedX) or given a courier and tracking ID on the order."
          />
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <button type="button" onClick={() => setSelected(new Set(rows.map((r) => r.orderId)))} className={outlineBtn}>
                Tick all
              </button>
              <button type="button" onClick={() => setSelected(new Set(rows.filter((r) => !r.sheetNumber).map((r) => r.orderId)))} className={outlineBtn}>
                Tick the ones not handed over yet
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className={outlineBtn}>
                Untick all
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-50 text-left text-neutral-600">
                    <th className="w-10 p-3" />
                    <th className="p-3 font-normal">Order</th>
                    <th className="p-3 font-normal">Courier</th>
                    <th className="p-3 font-normal">Tracking ID</th>
                    <th className="p-3 font-normal">Customer</th>
                    <th className="p-3 font-normal">District</th>
                    <th className="p-3 text-right font-normal">Cash to collect</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.orderId} className="border-t border-line">
                      <td className="p-3">
                        <input type="checkbox" checked={selected.has(r.orderId)} onChange={() => toggle(r.orderId)} aria-label={`Select ${r.orderRef}`} className="accent-brand" />
                      </td>
                      <td className="p-3 font-medium">
                        {r.orderRef}
                        {r.sheetNumber && <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-normal text-neutral-600">On sheet {r.sheetNumber}</span>}
                      </td>
                      <td className="p-3">{r.courier}</td>
                      <td className="p-3 font-mono text-xs">{r.trackingId ?? '–'}</td>
                      <td className="p-3">{r.customerName}</td>
                      <td className="p-3">{r.district ?? '–'}</td>
                      <td className="p-3 text-right">{taka(r.codAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-regantify-text">
                <b>{picked.length}</b> {picked.length === 1 ? 'parcel' : 'parcels'} ticked · <b>{taka(codTotal)}</b> to collect
              </p>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="A note for the sheet (optional), e.g. Evening pickup"
                className={`${fieldClass} min-w-[240px] flex-1`}
                aria-label="Note for the sheet"
              />
              <button type="button" onClick={() => create.mutate()} disabled={create.isPending || picked.length === 0} className={primaryBtn}>
                {create.isPending ? 'Making…' : 'Create sheet'}
              </button>
            </div>
          </>
        )}
      </PageSection>

      <PageSection>
        <PageHeader title="Earlier sheets" description="Open one to print it again exactly as it was handed over." />
        {sheets.length === 0 ? (
          <p className="text-sm text-neutral-500">No sheets yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {sheets.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-regantify-text">
                    Sheet {s.number} · {s.courier}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {s.parcelCount} {s.parcelCount === 1 ? 'parcel' : 'parcels'} · {taka(Number(s.codTotal))} to collect · {s.actor} · {formatDhakaDateTime(s.createdAt)}
                    {s.note ? ` · ${s.note}` : ''}
                  </p>
                </div>
                <a href={printHref(s.id)} target="_blank" rel="noreferrer" className={outlineBtn}>
                  <Printer size={14} />
                  Print
                </a>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </div>
  );
}
