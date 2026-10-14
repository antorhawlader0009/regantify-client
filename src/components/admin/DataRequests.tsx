import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminStep17Api, type ErasePreview, type MarketingStore } from '../../lib/adminStep17Api';
import { apiErrorMessage } from '../../lib/api';
import { isPendingApproval, toastPendingApproval, type PendingApproval } from '../../lib/approvalsApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { ReasonNeed } from './/ReasonNeed';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const KIND_LABEL = { STORE_EXPORT: 'Store export', SHOPPER_EXPORT: 'Shopper export', SHOPPER_ERASE: 'Shopper erased' } as const;

function Card({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="text-sm font-semibold text-regantify-text">{title}</h2>
      <p className="mt-0.5 text-xs text-regantify-text-muted">{hint}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

/** Admin > Settings > Data requests (super-admin-plan.md Step 17): a store's data, a shopper's data, and erasing a shopper. Every request is logged below. */
export function DataRequests() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-data-requests'] });
  return (
    <div className="space-y-4">
      <StoreExport onDone={refresh} />
      <ShopperExport onDone={refresh} />
      <ShopperErase onDone={refresh} />
      <RequestLog />
    </div>
  );
}

function StoreExport({ onDone }: { onDone: () => void }) {
  const [q, setQ] = useState('');
  const [store, setStore] = useState<MarketingStore | null>(null);
  const [reason, setReason] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: found = [] } = useQuery({ queryKey: ['admin-marketing-stores', 'all', q], queryFn: () => adminStep17Api.marketingStores(q, true), enabled: !store && q.trim().length >= 2 });
  const start = useMutation({
    mutationFn: () => adminStep17Api.startStoreExport(store!.id, reason.trim()),
    onSuccess: (r) => {
      setJobId(r.id);
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  const { data: job } = useQuery({ queryKey: ['admin-store-export', jobId], queryFn: () => adminStep17Api.storeExportStatus(jobId!), enabled: !!jobId, refetchInterval: (query) => (query.state.data?.status === 'RUNNING' ? 2000 : false) });
  const download = useMutation({
    mutationFn: () => adminStep17Api.downloadFile(`/v1/admin/data-requests/store-export/${jobId}/download`, {}, `${store?.subdomain ?? 'store'}-export.zip`),
    onError: (err) => toast.error(apiErrorMessage(err, 'The file could not be downloaded.')),
  });
  return (
    <Card title="Store data export" hint="The same ZIP the owner's Backup makes (orders, products, customers, reviews, as JSON and CSV). The owner is not told. Kept for 2 hours.">
      {store ? (
        <p className="flex items-center justify-between rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm">
          <span>{store.name} <span className="text-xs text-regantify-text-muted">{store.subdomain}</span></span>
          <button type="button" onClick={() => { setStore(null); setJobId(null); }} className="text-xs text-regantify-cta">Change</button>
        </p>
      ) : (
        <div>
          <input className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find the store: name or address" />
          {q.trim().length >= 2 && (
            <ul className="mt-2 divide-y divide-black/5 rounded-xl border border-black/5">
              {found.length === 0 && <li className="px-3 py-2 text-sm text-regantify-text-muted">No store matches.</li>}
              {found.map((s) => (
                <li key={s.id}><button type="button" onClick={() => setStore(s)} className="w-full px-3 py-2 text-left text-sm hover:bg-regantify-search">{s.name} <span className="text-xs text-regantify-text-muted">{s.subdomain}</span></button></li>
              ))}
            </ul>
          )}
        </div>
      )}
      <textarea className={field} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for this request (kept in the log)" />
      <ReasonNeed value={reason} />
      {!jobId ? (
        <button type="button" disabled={!store || reason.trim().length < 5 || start.isPending} onClick={() => start.mutate()} className="rounded-xl bg-regantify-cta px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          {start.isPending ? 'Starting…' : 'Make the export'}
        </button>
      ) : job?.status === 'FAILED' ? (
        <p className="text-sm text-red-700">{job.error ?? 'The export failed.'}</p>
      ) : job?.ready ? (
        <button type="button" disabled={download.isPending} onClick={() => download.mutate()} className="rounded-xl bg-regantify-cta px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          Download ZIP{job.sizeBytes ? ` (${(job.sizeBytes / 1024 / 1024).toFixed(1)} MB)` : ''}
        </button>
      ) : (
        <p className="text-sm text-regantify-text-muted">Making the file…</p>
      )}
    </Card>
  );
}

function ShopperExport({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const dl = useMutation({
    mutationFn: () => adminStep17Api.downloadFile('/v1/admin/data-requests/shopper-export', { phone: phone.trim(), reason: reason.trim() }, 'shopper-data.json'),
    onSuccess: () => {
      toast.success('Downloaded, and written to the log.');
      onDone();
    },
    onError: () => toast.error('Could not make the file. Check the number and the reason.'),
  });
  return (
    <Card title="Shopper data export" hint="Everything held about one phone number: account, saved addresses, orders on every store, reviews, abandoned checkouts and waitlists, as one JSON file.">
      <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Shopper's phone, e.g. 017XXXXXXXX" inputMode="tel" />
      <textarea className={field} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for this request (kept in the log)" />
      <ReasonNeed value={reason} />
      <button type="button" disabled={phone.trim().length < 10 || reason.trim().length < 5 || dl.isPending} onClick={() => dl.mutate()} className="rounded-xl bg-regantify-cta px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
        {dl.isPending ? 'Working…' : 'Download the shopper’s data'}
      </button>
    </Card>
  );
}

function ShopperErase({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<ErasePreview | null>(null);
  useEffect(() => setPreview(null), [phone]);
  const look = useMutation({
    mutationFn: () => adminStep17Api.erasePreview(phone.trim()),
    onSuccess: setPreview,
    onError: (err) => toast.error(apiErrorMessage(err, 'Enter a valid Bangladeshi phone number.')),
  });
  const erase = useMutation({
    mutationFn: () => adminStep17Api.eraseShopper({ phone: phone.trim(), confirmPhone: confirm.trim(), reason: reason.trim(), code }),
    onSuccess: (r: { orders: number; account: number } | PendingApproval) => {
      if (isPendingApproval(r)) toastPendingApproval();
      else toast.success(`Erased: ${r.orders} orders anonymised${r.account ? ', account deleted' : ''}.`);
      setPhone('');
      setConfirm('');
      setReason('');
      setCode('');
      setPreview(null);
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  return (
    <Card title="Erase a shopper" hint="On the shopper's request. Their name, phone, e-mail and address are blanked on every order (amounts, items and dates stay, so stores' books still add up); reviews and checkout notes are anonymised; the account and saved addresses are deleted. This cannot be undone.">
      <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Shopper's phone" inputMode="tel" />
      <button type="button" disabled={phone.trim().length < 10 || look.isPending} onClick={() => look.mutate()} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm disabled:opacity-50">See what would be erased</button>
      {preview && (
        <div className="space-y-3">
          <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            {preview.phone}: {preview.account ? 'has an account' : 'no account'}, {preview.orders} orders, {preview.reviews} reviews, {preview.abandonedCheckouts} abandoned checkouts, {preview.storeNotes} store notes (cleared of name, tags and note text).
          </p>
          <input className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type the phone again to confirm" inputMode="tel" />
          <textarea className={field} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason / who asked, and how (kept in the log)" />
          <ReasonNeed value={reason} />
          <input className={field} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Authenticator code" inputMode="numeric" />
          <button type="button" disabled={confirm.trim().length < 10 || reason.trim().length < 5 || code.length !== 6 || erase.isPending} onClick={() => erase.mutate()} className="rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {erase.isPending ? 'Erasing…' : 'Erase this shopper'}
          </button>
        </div>
      )}
    </Card>
  );
}

function RequestLog() {
  const { data = [] } = useQuery({ queryKey: ['admin-data-requests'], queryFn: adminStep17Api.dataRequests });
  return (
    <Card title="Request log" hint="Every request above, newest first. Never edited or removed.">
      {data.length === 0 ? (
        <p className="text-sm text-regantify-text-muted">No requests yet.</p>
      ) : (
        <ul className="divide-y divide-black/5">
          {data.map((r) => (
            <li key={r.id} className="py-2.5 text-sm">
              <p className="font-medium text-regantify-text">{KIND_LABEL[r.kind]}: {r.subjectLabel}</p>
              <p className="text-xs text-regantify-text-muted">{r.adminName}, {formatDhakaDateTime(r.createdAt)} · {r.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
