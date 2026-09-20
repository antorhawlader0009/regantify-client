import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface SteadfastConnectFormProps {
  /** Called once the account is successfully connected — the caller (Settings card or CourierSetupModal) decides what happens next (close the modal, just refresh the card, etc). */
  onConnected: () => void;
  /** Rendered under the fields, e.g. a Cancel button — kept caller-defined since the modal and the Settings card want different footer layouts. */
  footer?: (submitting: boolean) => React.ReactNode;
}

/**
 * SteadFast's connect form (API Key + Secret Key) — the ONE place this
 * field list/validation lives, per COURIER-PLAN.md §5.2. Used both by
 * Settings > Courier Integration (inline) and by CourierSetupModal (in a
 * dialog), so the two never drift out of sync with each other.
 */
export function SteadfastConnectForm({ onConnected, footer }: SteadfastConnectFormProps) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => courierApi.connectSteadfast(apiKey.trim(), secretKey.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      toast.success('SteadFast account connected.');
      setApiKey('');
      setSecretKey('');
      setError(null);
      onConnected();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not connect your SteadFast account. Please check your keys and try again.')),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!apiKey.trim() || !secretKey.trim()) {
          setError('API Key and Secret Key are both required.');
          return;
        }
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">API Key</label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Your SteadFast API Key"
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Secret Key</label>
        <input
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="Your SteadFast Secret Key"
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
        />
      </div>
      <p className="text-xs text-regantify-text-muted">
        Find these under your SteadFast merchant panel's API settings.
      </p>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {footer ? footer(mutation.isPending) : (
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
        >
          {mutation.isPending ? 'Connecting…' : 'Connect SteadFast'}
        </button>
      )}
    </form>
  );
}
