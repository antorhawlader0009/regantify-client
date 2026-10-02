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
 * RedX's connect form — a single OpenAPI access token, no OAuth and no
 * separate app-level credential. Same "one shared component, two entry
 * points" pattern as the other connect forms — used by both the RedX
 * page's Settings tab and CourierSetupModal. The server checks the token
 * with RedX before saving and picks the pickup store itself when the
 * merchant has only one.
 */
export function RedxConnectForm({ onConnected, footer }: RedxConnectFormProps) {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => courierApi.connectRedx(accessToken.trim()),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['redx-overview'] });
      queryClient.invalidateQueries({ queryKey: ['redx-stores'] });
      toast.success(
        account.redxStoreName
          ? `RedX connected — booking from "${account.redxStoreName}".`
          : 'RedX connected. Choose a pickup store on the RedX page to finish setup.',
      );
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
          placeholder="Your RedX OpenAPI access token"
          className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-regantify-text outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
        />
      </div>
      <p className="text-xs text-neutral-500">
        In your RedX merchant panel open <strong>Developer APIs › Open API</strong> and copy the production token. We check it with RedX
        before saving it.
      </p>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {footer ? footer(mutation.isPending) : (
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? 'Checking with RedX…' : 'Connect RedX'}
        </button>
      )}
    </form>
  );
}
