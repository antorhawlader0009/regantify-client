import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { storeDataApi, type StoreDataJob } from '../../../lib/storeDataApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { primaryBtn, outlineBtn } from '../../../components/ui/PageKit';

const size = (bytes: number | null) => (bytes == null ? '' : bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' });
const LABELS: Record<string, string> = {
  categories: 'categories',
  brands: 'brands',
  products: 'products',
  productVariants: 'variations',
  coupons: 'coupons',
  customerNotes: 'customer notes',
  expenses: 'expenses',
  orders: 'orders',
  orderItems: 'order lines',
  reviews: 'reviews',
};

function countsText(counts?: Record<string, number>) {
  if (!counts) return '';
  return Object.entries(LABELS)
    .filter(([k]) => counts[k])
    .map(([k, label]) => `${counts[k]} ${label}`)
    .join(', ');
}

/**
 * Store > Backup (TellMe idea 87), owner only. One button makes a ZIP of the whole store in the background (the bell tells you when it is
 * ready; it is kept for 2 hours, one a day). The same ZIP can be uploaded here to put back what is missing. A restore never changes or
 * deletes what is already there and works only for the same store.
 */
export default function StoreBackup() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: jobs } = useQuery({
    queryKey: ['store-data'],
    queryFn: storeDataApi.list,
    refetchInterval: (q) => ((q.state.data ?? []).some((j) => j.status === 'RUNNING') ? 4000 : 30_000),
  });
  const running = (jobs ?? []).some((j) => j.status === 'RUNNING');

  const backup = useMutation({
    mutationFn: storeDataApi.backup,
    onSuccess: () => {
      toast.success('Making your backup. The bell tells you when it is ready.');
      void queryClient.invalidateQueries({ queryKey: ['store-data'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not start the backup.')),
  });
  const restore = useMutation({
    mutationFn: (file: File) => storeDataApi.restore(file),
    onSuccess: () => {
      toast.success('Restoring. This can take a few minutes.');
      void queryClient.invalidateQueries({ queryKey: ['store-data'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not start the restore.')),
  });
  const download = useMutation({
    mutationFn: (job: StoreDataJob) => storeDataApi.download(job),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not download the backup.')),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-regantify-text">Backup and restore</h1>
        <p className="mt-1 text-sm text-regantify-text-muted">Keep a copy of your store, or put one back. Only the store owner can do this.</p>
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-base font-medium text-regantify-text">Download a backup</h2>
        <p className="mt-1 text-sm text-regantify-text-muted">
          One ZIP with your products, variations, categories, brands, orders and their lines, customer notes, coupons, expenses and reviews. It has CSV files you
          can open in Excel and the data files this page can restore. Pictures are links only. Passwords, API keys and courier or payment secrets are never in it.
        </p>
        <ul className="mt-2 list-disc pl-5 text-xs text-regantify-text-muted">
          <li>It holds your customers’ phone numbers and addresses. Keep it private.</li>
          <li>The download is ready within a few minutes and stays for 2 hours. You can make one backup a day.</li>
        </ul>
        <button type="button" onClick={() => backup.mutate()} disabled={backup.isPending || running} className={`${primaryBtn} mt-4`}>
          <Download size={15} />
          {running ? 'Working…' : 'Make a backup'}
        </button>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-base font-medium text-regantify-text">Restore from a backup</h2>
        <p className="mt-1 text-sm text-regantify-text-muted">
          Choose a ZIP made here. What is missing from your store is put back (for example products or orders you deleted by mistake). Anything that is already there is left exactly
          as it is, and a backup of another store is refused. Customer accounts, pictures, staff and settings are not part of it.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file && window.confirm(`Put back what is missing from ${file.name}? Nothing that exists now is changed.`)) restore.mutate(file);
          }}
        />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={restore.isPending || running} className={`${outlineBtn} mt-4`}>
          <Upload size={15} />
          Choose a backup file
        </button>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-base font-medium text-regantify-text">Recent</h2>
        {!jobs || jobs.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Nothing yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {jobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-regantify-text">
                    {j.kind === 'BACKUP' ? 'Backup' : 'Restore'} · {when(j.createdAt)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {j.status === 'RUNNING' && 'Working…'}
                    {j.status === 'READY' && `${countsText(j.summary?.counts)}${j.sizeBytes ? ` · ${size(j.sizeBytes)}` : ''}${j.expiresAt ? ` · ready until ${when(j.expiresAt)}` : ''}`}
                    {j.status === 'EXPIRED' && 'The file was removed after 2 hours.'}
                    {j.status === 'DONE' && (countsText(j.summary?.added) ? `Put back: ${countsText(j.summary?.added)}` : 'Nothing was missing.')}
                    {j.status === 'FAILED' && (j.error ?? 'It did not finish.')}
                  </p>
                  {j.status === 'DONE' && (j.summary?.errors?.length ?? 0) > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-xs text-red-700">
                      {j.summary!.errors!.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {j.downloadable && (
                  <button type="button" onClick={() => download.mutate(j)} disabled={download.isPending} className={outlineBtn}>
                    <Download size={15} />
                    Download
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
