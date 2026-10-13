import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import { apiErrorMessage } from '../lib/api';
import { PLATFORM_INFO_KEY, platformApi, usePlatformInfo } from '../lib/platformApi';
import { toast } from '../lib/toast';
import { Dialog } from './ui/Dialog';

const until = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' });

/** The maintenance banner Super Admin sets in Settings (super-admin-plan.md Step 15): shown to every store while it is on. */
export function MaintenanceBar() {
  const { data } = usePlatformInfo();
  if (!data?.maintenance) return null;
  return (
    <div className="px-3 pt-3 sm:px-6">
      <div role="status" className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <Wrench size={16} className="mt-0.5 shrink-0" />
        <p className="m-0 min-w-0 flex-1 whitespace-pre-line">
          {data.maintenance.text}
          {data.maintenance.until ? ` (until ${until(data.maintenance.until)})` : ''}
        </p>
      </div>
    </div>
  );
}

/**
 * When Super Admin publishes a new version of the platform terms, the OWNER has to accept it before going on (staff are not asked). The dialog cannot be closed
 * without accepting; the texts are read in full from the server.
 */
export function TermsGate() {
  const queryClient = useQueryClient();
  const { data } = usePlatformInfo();
  const must = data?.terms.mustAccept === true;
  const { data: terms } = useQuery({ queryKey: ['platform-terms', data?.terms.version], queryFn: platformApi.terms, enabled: must });
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms');
  const accept = useMutation({
    mutationFn: platformApi.acceptTerms,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_INFO_KEY }),
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  if (!must) return null;
  const text = tab === 'terms' ? terms?.termsText : terms?.privacyText;
  return (
    <Dialog open onOpenChange={() => undefined} maxWidth="max-w-2xl">
      <div className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-regantify-text">Our terms have been updated</h2>
        <p className="text-sm text-regantify-text-muted">Please read the new terms and privacy policy and accept them to keep using your dashboard.</p>
        <div className="flex gap-1 border-b border-black/5">
          {(['terms', 'privacy'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium ${tab === t ? 'border-regantify-black text-regantify-text' : 'border-transparent text-regantify-text-muted'}`}>
              {t === 'terms' ? 'Terms of use' : 'Privacy policy'}
            </button>
          ))}
        </div>
        <div className="max-h-[45vh] overflow-y-auto whitespace-pre-line rounded-xl bg-regantify-search p-4 text-sm text-regantify-text">{text || (terms ? 'Nothing written here.' : 'Loading…')}</div>
        <button type="button" disabled={accept.isPending || !terms} onClick={() => accept.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {accept.isPending ? 'Saving…' : 'I accept'}
        </button>
      </div>
    </Dialog>
  );
}
