import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { platformSettingsApi, type PlatformCompany } from '../../lib/paymentReceiptsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const field = 'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-regantify-cta focus:outline-none';
const BLANK: Record<keyof PlatformCompany, string> = { companyName: '', address: '', phone: '', email: '', taxNumber: '', footerNote: '' };

/** Super Admin > Receipt Details (TellMe idea 157): the company name, address and tax number printed on every receipt a store gets for what it pays the platform. */
export default function ReceiptDetails() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['platform-settings'], queryFn: platformSettingsApi.get });
  const [form, setForm] = useState(BLANK);
  useEffect(() => {
    if (data) setForm({ companyName: data.companyName ?? '', address: data.address ?? '', phone: data.phone ?? '', email: data.email ?? '', taxNumber: data.taxNumber ?? '', footerNote: data.footerNote ?? '' });
  }, [data]);
  const save = useMutation({
    mutationFn: () => platformSettingsApi.save(form),
    onSuccess: (saved) => {
      queryClient.setQueryData(['platform-settings'], saved);
      toast.success('Saved. New and old receipts show these details.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save.')),
  });
  const set = (k: keyof PlatformCompany, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (isLoading) return <Loader2 className="mx-auto mt-16 animate-spin text-neutral-400" />;
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-regantify-text">Receipt details</h1>
        <p className="text-sm text-regantify-text-muted">Printed at the top of every receipt a store gets for a plan, SMS, AI credits or a wallet top-up. Leave a box empty to leave it out.</p>
      </div>
      <div className="space-y-3 rounded-xl border border-black/5 bg-white p-5">
        <label className="block text-sm">
          Company name
          <input className={`${field} mt-1`} value={form.companyName} onChange={(e) => set('companyName', e.target.value)} maxLength={120} />
        </label>
        <label className="block text-sm">
          Address
          <textarea className={`${field} mt-1`} rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={300} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Phone
            <input className={`${field} mt-1`} value={form.phone} onChange={(e) => set('phone', e.target.value)} maxLength={40} />
          </label>
          <label className="block text-sm">
            Email
            <input className={`${field} mt-1`} value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={120} />
          </label>
        </div>
        <label className="block text-sm">
          BIN / TIN / trade licence number
          <input className={`${field} mt-1`} value={form.taxNumber} onChange={(e) => set('taxNumber', e.target.value)} maxLength={60} />
        </label>
        <label className="block text-sm">
          Last line (optional)
          <input className={`${field} mt-1`} value={form.footerNote} onChange={(e) => set('footerNote', e.target.value)} maxLength={200} placeholder="e.g. For questions about a payment, write to billing@…" />
        </label>
        <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-2 rounded-lg bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          <Save size={15} />
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
