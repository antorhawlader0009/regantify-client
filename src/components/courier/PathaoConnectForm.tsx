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

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none';

/**
 * Pathao's connect form — the VENDOR's own merchant Client ID/Secret
 * (Pathao issues these per merchant), plus an optional email/password
 * the server falls back to if the Client ID/Secret login is ever
 * refused. The server verifies everything with Pathao before saving.
 * Same "one shared component, two entry points" pattern as
 * SteadfastConnectForm — used by both the Courier Integration page and
 * CourierSetupModal.
 */
export function PathaoConnectForm({ onConnected, footer }: PathaoConnectFormProps) {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      courierApi.connectPathao({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        ...(username.trim() && password ? { username: username.trim(), password } : {}),
      }),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      toast.success(
        account.merchantName
          ? `Connected to Pathao as ${account.merchantName}. Select a pickup store to finish setup.`
          : 'Pathao account connected. Select a pickup store to finish setup.',
      );
      setClientId('');
      setClientSecret('');
      setUsername('');
      setPassword('');
      setError(null);
      onConnected();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not connect your Pathao account. Please check your Client ID and Client Secret.')),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!clientId.trim() || !clientSecret.trim()) {
          setError('Pathao Client ID and Client Secret are both required.');
          return;
        }
        if (Boolean(username.trim()) !== Boolean(password)) {
          setError('Give both your Pathao email and password, or leave both empty.');
          return;
        }
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Client ID</label>
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="Your Pathao Client ID"
          autoComplete="off"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Client Secret</label>
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          placeholder="Your Pathao Client Secret"
          autoComplete="off"
          className={inputClass}
        />
      </div>
      <p className="text-xs text-regantify-text-muted">
        Find both at merchant.pathao.com → Developer API → Merchant API Credentials.
      </p>

      {showLogin ? (
        <>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Pathao email (optional)</label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your Pathao merchant account email"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Password (optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your Pathao account password"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </>
      ) : (
        <button type="button" onClick={() => setShowLogin(true)} className="text-xs text-regantify-cta hover:underline">
          + Also add Pathao email &amp; password (backup login)
        </button>
      )}

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
