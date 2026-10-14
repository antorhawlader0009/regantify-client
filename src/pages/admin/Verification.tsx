import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, ShieldCheck } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { adminKycApi, type KycDetail, type KycKind, type KycListItem } from '../../lib/kycApi';
import { adminApi } from '../../lib/adminApi';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';

const field = 'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-regantify-cta focus:outline-none';
const btn = 'inline-flex items-center rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-60';
const btnPrimary = 'inline-flex items-center rounded-lg bg-regantify-cta px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60';
const STATUS: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: 'Waiting for the store', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  SUBMITTED: { label: 'Needs your review', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
  REJECTED: { label: 'Sent back', cls: 'bg-orange-50 text-orange-800 border-orange-200' },
  APPROVED: { label: 'Verified', cls: 'bg-green-50 text-green-800 border-green-200' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-neutral-50 text-neutral-600 border-neutral-200' },
};
const TABS = [
  { id: '', label: 'All' },
  { id: 'SUBMITTED', label: 'To review' },
  { id: 'REQUESTED', label: 'Waiting' },
  { id: 'REJECTED', label: 'Sent back' },
  { id: 'APPROVED', label: 'Verified' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

function Picture({ id, kind, label }: { id: string; kind: KycKind; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let made: string | null = null;
    adminKycApi
      .document(id, kind)
      .then((b) => {
        made = URL.createObjectURL(b);
        setUrl(made);
      })
      .catch(() => setFailed(true));
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [id, kind]);
  return (
    <figure>
      <figcaption className="mb-1 text-xs text-neutral-600">{label}</figcaption>
      {failed ? (
        <div className="flex h-40 items-center justify-center rounded border border-dashed text-xs text-neutral-500">Could not load</div>
      ) : url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={label} className="max-h-72 w-full rounded border border-black/10 object-contain" />
        </a>
      ) : (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="animate-spin text-neutral-400" size={18} />
        </div>
      )}
    </figure>
  );
}

function ReviewDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-kyc', id], queryFn: () => adminKycApi.detail(id) });
  const [reason, setReason] = useState('');
  const [rejectDays, setRejectDays] = useState('3');
  const [extendDays, setExtendDays] = useState('7');
  const [sureCancel, setSureCancel] = useState(false);
  const done = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-kyc'] });
    onClose();
  };
  const fail = (fallback: string) => (err: unknown) => toast.error(apiErrorMessage(err, fallback));
  const approve = useMutation({ mutationFn: () => adminKycApi.approve(id), onSuccess: () => { toast.success('Verified.'); done(); }, onError: fail('Could not approve.') });
  const reject = useMutation({ mutationFn: () => adminKycApi.reject(id, reason, Number(rejectDays)), onSuccess: () => { toast.success('Sent back to the store.'); done(); }, onError: fail('Could not send it back.') });
  const extend = useMutation({ mutationFn: () => adminKycApi.extend(id, Number(extendDays)), onSuccess: () => { toast.success('Deadline moved.'); done(); }, onError: fail('Could not move the deadline.') });
  const cancel = useMutation({ mutationFn: () => adminKycApi.cancel(id), onSuccess: () => { toast.success('Request cancelled. The store is free again.'); done(); }, onError: fail('Could not cancel.') });
  const wipe = useMutation({ mutationFn: () => adminKycApi.deleteDocuments(id), onSuccess: () => { toast.success('Pictures deleted.'); done(); }, onError: fail('Could not delete.') });
  const unverify = useMutation({ mutationFn: () => adminKycApi.unverify(data!.vendor.id), onSuccess: () => { toast.success('The badge is gone from the store.'); done(); }, onError: fail('Could not remove the badge.') });

  const d: KycDetail | undefined = data;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={d ? `Verification: ${d.vendor.storeName}` : 'Verification'} maxWidth="max-w-3xl">
      <div className="space-y-4 p-5 text-sm">
        {isLoading || !d ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-neutral-400" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${STATUS[d.status].cls}`}>{STATUS[d.status].label}</span>
              {d.restricted && <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Store is paused (deadline passed)</span>}
              <span className="text-neutral-500">
                Asked by {d.requestedBy} · {formatDhakaDateTime(d.requestedAt)} · deadline {formatDhakaDateTime(d.dueAt)}
              </span>
            </div>
            <p className="text-neutral-600">
              Store: {d.vendor.storeName} ({d.vendor.subdomain}) · owner phone {d.vendor.phone ?? '-'}
            </p>
            {d.note && <p className="rounded bg-neutral-50 px-3 py-2 text-neutral-700">Message to the store: {d.note}</p>}
            {d.rejectReason && <p className="rounded bg-orange-50 px-3 py-2 text-orange-900">Last refusal: {d.rejectReason}</p>}

            {d.fullName && (
              <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                <div><dt className="text-xs text-neutral-500">Full name</dt><dd className="font-medium">{d.fullName}</dd></div>
                <div><dt className="text-xs text-neutral-500">ID number</dt><dd className="font-medium tabular-nums">{d.nidNumber ?? '(deleted)'}</dd></div>
                {d.dateOfBirth && <div><dt className="text-xs text-neutral-500">Date of birth</dt><dd>{d.dateOfBirth}</dd></div>}
                {d.address && <div><dt className="text-xs text-neutral-500">Address</dt><dd>{d.address}</dd></div>}
                {d.vendorNote && <div className="sm:col-span-2"><dt className="text-xs text-neutral-500">Note from the store</dt><dd>{d.vendorNote}</dd></div>}
                <div><dt className="text-xs text-neutral-500">DBID{d.requireDbid ? ' (required)' : ''}</dt><dd className="font-medium">{d.dbidNumber ?? '-'}</dd></div>
                {(d.tinNumber || d.binNumber) && (
                  <div><dt className="text-xs text-neutral-500">e-TIN / BIN</dt><dd className="tabular-nums">{d.tinNumber ?? '-'} / {d.binNumber ?? '-'}</dd></div>
                )}
              </dl>
            )}
            {d.status === 'APPROVED' && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-green-50 px-3 py-2 text-green-900">
                <span>The store shows a "Verified seller" badge on its StorePal store{d.dbidNumber ? ` with DBID ${d.dbidNumber}` : ''}.</span>
                <button type="button" className={btn} disabled={unverify.isPending} onClick={() => unverify.mutate()}>
                  Remove the badge
                </button>
              </div>
            )}

            {d.documents.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {d.documents.map((doc) => (
                  <Picture key={doc.kind} id={d.id} kind={doc.kind} label={doc.label} />
                ))}
              </div>
            ) : (
              d.status !== 'REQUESTED' && <p className="text-neutral-500">No pictures are kept for this request.</p>
            )}

            <div className="space-y-3 border-t border-black/5 pt-3">
              {d.status === 'SUBMITTED' && (
                <>
                  <div className="flex flex-wrap items-end gap-2">
                    <button type="button" className={btnPrimary} disabled={approve.isPending} onClick={() => approve.mutate()}>
                      Approve
                    </button>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-[14rem] flex-1 text-xs text-neutral-600">
                      Not accepted: tell the store what to fix
                      <input className={`${field} mt-1`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. The selfie does not show the card clearly" />
                    </label>
                    <label className="text-xs text-neutral-600">
                      Days to resend
                      <input className={`${field} mt-1 w-20`} value={rejectDays} onChange={(e) => setRejectDays(e.target.value.replace(/\D/g, '').slice(0, 2))} />
                    </label>
                    <button type="button" className={btn} disabled={!reason.trim() || reject.isPending} onClick={() => reject.mutate()}>
                      Send back
                    </button>
                  </div>
                </>
              )}
              {(d.status === 'REQUESTED' || d.status === 'REJECTED') && (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-xs text-neutral-600">
                    Give more days (from today)
                    <input className={`${field} mt-1 w-20`} value={extendDays} onChange={(e) => setExtendDays(e.target.value.replace(/\D/g, '').slice(0, 2))} />
                  </label>
                  <button type="button" className={btn} disabled={extend.isPending} onClick={() => extend.mutate()}>
                    Move the deadline
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {(d.status === 'REQUESTED' || d.status === 'SUBMITTED' || d.status === 'REJECTED') && (
                  <button
                    type="button"
                    className={btn}
                    disabled={cancel.isPending}
                    onClick={() => {
                      if (sureCancel) cancel.mutate();
                      else setSureCancel(true);
                    }}
                  >
                    {sureCancel ? 'Yes, cancel it (the store is free again and the pictures are deleted)' : 'Cancel the request'}
                  </button>
                )}
                {(d.status === 'APPROVED' || d.status === 'CANCELLED') && d.documents.length > 0 && (
                  <button type="button" className={btn} disabled={wipe.isPending} onClick={() => wipe.mutate()}>
                    Delete the pictures now
                  </button>
                )}
              </div>
              {d.documentsDeleteAt && <p className="text-xs text-neutral-500">The pictures are deleted on {formatDhakaDateTime(d.documentsDeleteAt)}.</p>}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-neutral-500">History (the store cannot see this)</p>
              <ul className="space-y-0.5 text-xs text-neutral-600">
                {d.events.map((e, i) => (
                  <li key={i}>
                    {formatDhakaDateTime(e.at)} · {e.actor} · {e.action.toLowerCase().replace(/_/g, ' ')}
                    {e.note ? ` (${e.note})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

function AskDialog({ onClose, preset }: { onClose: () => void; preset?: { id: string; storeName: string; requireDbid: boolean } }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<{ id: string; storeName: string } | null>(preset ? { id: preset.id, storeName: preset.storeName } : null);
  const [days, setDays] = useState('7');
  const [note, setNote] = useState(preset?.requireDbid ? 'Online businesses need a DBID (Digital Business ID). Please add yours.' : '');
  const [trade, setTrade] = useState(false);
  const [dbid, setDbid] = useState(preset?.requireDbid ?? false);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data: found } = useQuery({ queryKey: ['admin-kyc-vendors', debounced], queryFn: () => adminApi.listVendors({ search: debounced, perPage: 8 }), enabled: debounced.length >= 2 && !picked });
  const ask = useMutation({
    mutationFn: () => adminKycApi.request({ vendorId: picked!.id, days: Number(days), note: note.trim() || undefined, requireTradeLicense: trade, requireDbid: dbid }),
    onSuccess: () => {
      toast.success('Asked. The store sees it on its dashboard and was told by SMS.');
      void queryClient.invalidateQueries({ queryKey: ['admin-kyc'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not ask the store.')),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Ask a store to verify itself" maxWidth="max-w-lg">
      <div className="space-y-3 p-5 text-sm">
        <p className="text-neutral-600">
          Use this when something looks wrong with a store. It sees a notice on its dashboard and gets an SMS. If it does not send its documents by the deadline, its new orders and
          new products are switched off. Its withdrawals pause right away.
        </p>
        {picked ? (
          <p className="flex items-center justify-between rounded bg-neutral-50 px-3 py-2">
            <span className="font-medium">{picked.storeName}</span>
            <button type="button" className="text-xs text-regantify-cta hover:underline" onClick={() => setPicked(null)}>
              Change
            </button>
          </p>
        ) : (
          <div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-neutral-400" />
              <input className={`${field} pl-8`} placeholder="Store name or owner phone" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
            {found && found.vendors.length > 0 && (
              <ul className="mt-1 max-h-48 overflow-y-auto rounded border border-black/10">
                {found.vendors.map((v) => (
                  <li key={v.id}>
                    <button type="button" className="block w-full px-3 py-2 text-left hover:bg-black/5" onClick={() => setPicked({ id: v.id, storeName: v.storeName })}>
                      {v.storeName} <span className="text-xs text-neutral-500">· {v.phone ?? v.subdomain}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <label className="block text-xs text-neutral-600">
          Days to send the documents (1 to 30)
          <input className={`${field} mt-1 w-24`} value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        </label>
        <label className="block text-xs text-neutral-600">
          Message the store will read (optional)
          <input className={`${field} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. We need to confirm who owns this store before payouts" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={trade} onChange={(e) => setTrade(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          Also require a trade licence picture
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={dbid} onChange={(e) => setDbid(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          Require the DBID (Digital Business ID)
        </label>
        <p className="-mt-1 text-xs text-neutral-500">When "DBID for online-payment stores" is on, a store with online payments is always asked for its DBID.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className={btn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} disabled={!picked || !(Number(days) >= 1 && Number(days) <= 30) || ask.isPending} onClick={() => ask.mutate()}>
            {ask.isPending ? 'Asking…' : 'Ask for verification'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/**
 * Bangladesh compliance (super-admin-new.md Step 12): the rule "a store with online payments must give its DBID", and the online-payment stores that have
 * no verified DBID yet, each with a one-click request that asks for it.
 */
function DbidCompliance() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState<{ id: string; storeName: string } | null>(null);
  const { data: settings } = useQuery({ queryKey: ['admin-kyc-compliance'], queryFn: adminKycApi.complianceSettings });
  const { data: stores, isLoading } = useQuery({ queryKey: ['admin-kyc-dbid-missing'], queryFn: adminKycApi.dbidMissing, enabled: open });
  const toggle = useMutation({
    mutationFn: (on: boolean) => adminKycApi.setComplianceSettings(on),
    onSuccess: (s) => {
      queryClient.setQueryData(['admin-kyc-compliance'], s);
      toast.success(s.dbidRequiredForOnline ? 'From now on, requests to online-payment stores ask for the DBID.' : 'The DBID is asked only when you tick it.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save it.')),
  });
  return (
    <section className="space-y-3 rounded-xl border border-black/5 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-regantify-text">DBID for online-payment stores</h2>
          <p className="max-w-2xl text-xs text-neutral-500">
            The Ministry of Commerce asks every online business to hold a DBID (Digital Business ID, through RJSC). When this is on, every verification request to a store that takes
            online payments asks for its DBID. Nothing is switched off by itself: stores are only asked when you ask them.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings?.dbidRequiredForOnline ?? false} disabled={!settings || toggle.isPending} onChange={(e) => toggle.mutate(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          Require DBID
        </label>
      </div>
      <button type="button" className="text-sm font-medium text-regantify-cta hover:underline" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} online-payment stores without a verified DBID
      </button>
      {open &&
        (isLoading ? (
          <Loader2 className="mx-auto animate-spin text-neutral-400" />
        ) : !stores || stores.length === 0 ? (
          <p className="text-sm text-neutral-500">Every store with online payments has a verified DBID.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left text-xs text-neutral-500">
                  <th className="px-3 py-2 font-normal">Store</th>
                  <th className="px-3 py-2 font-normal">Online payments</th>
                  <th className="px-3 py-2 font-normal">Now</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.vendorId} className="border-b border-black/5 last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium">{s.storeName}</p>
                      <p className="text-xs text-neutral-500">{s.subdomain}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-600">{s.gateways.map((g) => (g === 'ONLINE_PAYMENT' ? 'Online Payment' : g === 'SSLCOMMERZ' ? 'SSLCommerz' : g)).join(', ')}</td>
                    <td className="px-3 py-2 text-xs text-neutral-600">
                      {s.openRequest ? `Asked, ${STATUS[s.openRequest.status as KycListItem['status']]?.label ?? s.openRequest.status}` : s.verified ? 'Verified, no DBID' : 'Not verified'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!s.openRequest && (
                        <button type="button" className="text-sm font-medium text-regantify-cta hover:underline" onClick={() => setAsking({ id: s.vendorId, storeName: s.storeName })}>
                          Ask for DBID
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      {asking && (
        <AskDialog
          preset={{ ...asking, requireDbid: true }}
          onClose={() => {
            setAsking(null);
            void queryClient.invalidateQueries({ queryKey: ['admin-kyc-dbid-missing'] });
          }}
        />
      )}
    </section>
  );
}

/**
 * Super Admin > Verification (TellMe idea 160). Nothing is asked of any store by default. Here Super Admin asks one store to verify itself, reads what it sent
 * (every look at the pictures is logged), and approves, sends it back with a reason, gives more time or cancels. A store past its deadline cannot take new
 * orders or add products until it sends its documents.
 */
export default function Verification() {
  const [status, setStatus] = useState('SUBMITTED');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [asking, setAsking] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin-kyc', { status, search, page }], queryFn: () => adminKycApi.list({ status: status || undefined, search: search.trim() || undefined, page }), placeholderData: keepPreviousData });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <ShieldCheck className="mt-1 text-regantify-text-muted" size={20} />
        <div className="mr-auto">
          <h1 className="text-lg font-semibold text-regantify-text">Verification</h1>
          <p className="text-sm text-regantify-text-muted">Ask a store to prove who is behind it. Off for every store until you ask.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setAsking(true)}>
          Ask a store
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setStatus(t.id);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1 text-sm ${status === t.id ? 'border-regantify-cta bg-regantify-cta/10 text-regantify-cta' : 'border-black/10 bg-white text-neutral-600 hover:bg-black/5'}`}
          >
            {t.label}
            {t.id && data?.counts[t.id] ? <span className="ml-1.5 text-xs">{data.counts[t.id]}</span> : null}
          </button>
        ))}
        <input className={`${field} ml-auto !w-56`} placeholder="Search store or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto mt-10 animate-spin text-neutral-400" />
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-xl border border-black/5 bg-white py-12 text-center text-sm text-neutral-500">Nothing here.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/5 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-neutral-500">
                <th className="px-4 py-2 font-normal">Store</th>
                <th className="px-4 py-2 font-normal">State</th>
                <th className="px-4 py-2 font-normal">Deadline</th>
                <th className="px-4 py-2 font-normal">Sent</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((r: KycListItem) => (
                <tr key={r.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{r.vendor.storeName}</p>
                    <p className="text-xs text-neutral-500">{r.vendor.phone ?? r.vendor.subdomain}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                    {r.restricted && <span className="ml-1.5 text-xs font-medium text-red-700">paused</span>}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600">{formatDhakaDateTime(r.dueAt)}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{r.submittedAt ? formatDhakaDateTime(r.submittedAt) : '-'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button type="button" className="text-sm font-medium text-regantify-cta hover:underline" onClick={() => setOpenId(r.id)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button type="button" className={btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-neutral-500">
            {page} / {pages}
          </span>
          <button type="button" className={btn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
      <DbidCompliance />
      {asking && <AskDialog onClose={() => setAsking(false)} />}
      {openId && <ReviewDialog id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
