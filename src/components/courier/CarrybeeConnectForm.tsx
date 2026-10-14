import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { carrybeeApi } from '../../lib/carrybeeApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';

/**
 * CarryBee's connect form (Client ID, Client Secret, Client Context, sandbox or live), shared by the CarryBee page and
 * CourierSetupModal. The server tries the keys with CarryBee before saving and picks the pickup store itself when the
 * merchant has only one approved store.
 */
export function CarrybeeConnectForm({ onConnected, footer }: { onConnected: () => void; footer?: (submitting: boolean) => React.ReactNode }) {
  const qc = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [clientContext, setClientContext] = useState('');
  const [sandbox, setSandbox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: () => carrybeeApi.connect({ clientId: clientId.trim(), clientSecret: clientSecret.trim(), clientContext: clientContext.trim(), sandbox }),
    onSuccess: (o) => {
      qc.invalidateQueries({ queryKey: ['courier-accounts'] });
      qc.invalidateQueries({ queryKey: ['carrybee-overview'] });
      toast.success(o.pickupStore ? `CarryBee connected — booking from "${o.pickupStore.name}".` : 'CarryBee connected. Choose a pickup store on the CarryBee page to finish setup.');
      setClientSecret('');
      setError(null);
      onConnected();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not connect CarryBee. Please check the details and try again.')),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!clientId.trim() || !clientSecret.trim() || !clientContext.trim()) {
          setError('Client ID, Client Secret and Client Context are all required.');
          return;
        }
        m.mutate();
      }}
      className="space-y-4"
    >
      <label className="flex items-start gap-3 rounded-xl border border-line p-3 cursor-pointer">
        <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} className="mt-0.5" />
        <span>
          <span className="block text-sm font-medium text-regantify-text">Sandbox (testing)</span>
          <span className="block text-xs text-regantify-text-muted">Use CarryBee’s test keys. Turn it off with your live keys before you book real parcels.</span>
        </span>
      </label>
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Client ID</label>
        <input value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" className={field} />
      </div>
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Client Secret</label>
        <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} autoComplete="new-password" className={field} />
      </div>
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Client Context</label>
        <input value={clientContext} onChange={(e) => setClientContext(e.target.value)} autoComplete="off" className={field} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {footer ? (
        footer(m.isPending)
      ) : (
        <button type="submit" disabled={m.isPending} className="rounded-xl bg-regantify-cta px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {m.isPending ? 'Checking with CarryBee…' : 'Connect CarryBee'}
        </button>
      )}
    </form>
  );
}
