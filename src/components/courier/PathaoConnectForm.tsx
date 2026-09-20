import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface PathaoConnectFormProps {
  /** Called once the account is successfully connected — the caller (Settings card or CourierSetupModal) decides what happens next. */
  onConnected: () => void;
  /** Rendered under the fields, e.g. a Cancel button — kept caller-defined since the modal and the Settings card want different footer layouts. */
  footer?: (submitting: boolean) => React.ReactNode;
}

/**
 * Pathao's connect form — the VENDOR's own Pathao email + password, NOT
 * Regantify's app-level client_id/client_secret (those live server-side
 * only, see COURIER-PLAN.md §2.2). Same "one shared component, two entry
 * points" pattern as SteadfastConnectForm — used by both Settings >
 * Courier Integration and CourierSetupModal.
 */
export function PathaoConnectForm({ onConnected, footer }: PathaoConnectFormProps) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => courierApi.connectPathao(username.trim(), password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      toast.success('Pathao account connected. Select a pickup store to finish setup.');
      setUsername('');
      setPassword('');
      setError(null);
      onConnected();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not connect your Pathao account. Please check your email/password and try again.')),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
          setError('Pathao email and password are both required.');
          return;
        }
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Pathao email</label>
        <input
          type="email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your Pathao merchant account email"
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your Pathao account password"
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
        />
      </div>
      <p className="text-xs text-regantify-text-muted">
        This is your own Pathao merchant login — the same one you use at merchant.pathao.com.
      </p>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {footer ? footer(mutation.isPending) : (
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
        >
          {mutation.isPending ? 'Connecting…' : 'Connect Pathao'}
        </button>
      )}
    </form>
  );
}
