import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface RedxConnectFormProps {
  onConnected: () => void;
  footer?: (submitting: boolean) => React.ReactNode;
}

/**
 * RedX's connect form — a single Access Token, no OAuth and no separate
 * app-level credential (simpler than Pathao, similar shape to
 * SteadFast). Same "one shared component, two entry points" pattern as
 * the other connect forms — used by both the Courier Integration page
 * and CourierSetupModal.
 */
export function RedxConnectForm({ onConnected, footer }: RedxConnectFormProps) {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => courierApi.connectRedx(accessToken.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      toast.success('RedX account connected. Select a pickup store to finish setup.');
      setAccessToken('');
      setError(null);
      onConnected();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not connect your RedX account. Please check your access token and try again.')),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!accessToken.trim()) {
          setError('Access Token is required.');
          return;
        }
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Access Token</label>
        <input
          type="password"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="Your RedX API access token"
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
        />
      </div>
      <p className="text-xs text-regantify-text-muted">
        Find this under your RedX merchant panel's Developer API settings.
      </p>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {footer ? footer(mutation.isPending) : (
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
        >
          {mutation.isPending ? 'Connecting…' : 'Connect RedX'}
        </button>
      )}
    </form>
  );
}
