import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { smsApi, type SmsGatewayProvider } from '../../lib/smsApi';
import { addonsApi } from '../../lib/addonsApi';
import { apiErrorMessage } from '../../lib/api';
import { BD_PHONE_HINT, normalizeBdPhone } from '../../lib/bdPhone';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { Field, productInputClass } from '../product/ProductFormPieces';
import { primaryBtn } from '../ui/PageKit';

const PROVIDERS: { id: SmsGatewayProvider; name: string; where: string }[] = [
  { id: 'ISMSPLUS', name: 'SSL Wireless iSMSplus', where: 'API token and SID from your iSMSplus portal. Add this server’s IP address to the iSMSplus whitelist first.' },
  { id: 'MIM_SMS', name: 'MIM SMS', where: 'Panel email, API key (Utility > Developer, activated) and Sender ID (Utility > Sender ID). Add this server’s IP address in Utility > Developer first.' },
];

/**
 * Add-ons > SSL Wireless iSMSplus / MIM SMS: the store's own SMS gateway. While connected, every text the store sends
 * (order updates, campaigns, reminders, codes) goes through it and no Regantify SMS credits are used. Connecting sends
 * a test text through it first, so a wrong key is refused here. Only the owner can connect or disconnect.
 */
export function OwnSmsGateway({ initialProvider, isOwner }: { initialProvider?: SmsGatewayProvider; isOwner: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['sms-gateway'], queryFn: smsApi.getGateway });
  const { data: addonsOff = [] } = useQuery({ queryKey: ['addons-off'], queryFn: addonsApi.off });
  const gateway = data?.gateway ?? null;

  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState<SmsGatewayProvider>(initialProvider ?? 'ISMSPLUS');
  const [senderId, setSenderId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [userName, setUserName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['sms-gateway'] });
    qc.invalidateQueries({ queryKey: ['sms-credits'] });
  };

  const connect = useMutation({
    mutationFn: () =>
      smsApi.connectGateway({
        provider,
        senderId: senderId.trim(),
        testPhone: normalizeBdPhone(testPhone) ?? testPhone.trim(),
        ...(provider === 'ISMSPLUS' ? { apiToken: apiToken.trim() } : { userName: userName.trim(), apiKey: apiKey.trim() }),
      }),
    onSuccess: () => {
      toast.success('Connected. Your store’s texts now go through your own gateway.');
      setEditing(false);
      setApiToken('');
      setApiKey('');
      setError(null);
      refresh();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not connect. Please check the details and try again.')),
  });

  const disconnect = useMutation({
    mutationFn: smsApi.disconnectGateway,
    onSuccess: () => {
      toast.success('Disconnected. Texts use your Regantify SMS credits again.');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not disconnect.')),
  });

  if (isLoading) return <p className="py-4 text-sm text-regantify-text-muted">Loading…</p>;

  const providerOff = (p: SmsGatewayProvider) => addonsOff.includes(p);
  const current = PROVIDERS.find((p) => p.id === provider)!;
  const openForm = () => {
    setProvider(gateway?.provider ?? initialProvider ?? 'ISMSPLUS');
    setSenderId(gateway?.senderId ?? '');
    setUserName(gateway?.userName ?? '');
    setError(null);
    setEditing(true);
  };

  return (
    <div className="space-y-4 py-3">
      <p className="text-sm text-regantify-text-muted">
        Send your store’s texts through your own SMS account instead of Regantify SMS credits. Order updates, campaigns, reminders and codes all go through it while it is connected.
      </p>

      {gateway ? (
        <div className="rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="mr-auto">
              <p className="text-sm font-medium text-regantify-text">{PROVIDERS.find((p) => p.id === gateway.provider)?.name}</p>
              <p className="mt-0.5 text-xs text-regantify-text-muted">
                Sender: {gateway.senderId}
                {gateway.userName ? ` · ${gateway.userName}` : ''} · connected {formatDhakaDateTime(gateway.connectedAt)}
              </p>
              {!gateway.active && (
                <p className="mt-1.5 text-xs text-amber-800">Regantify has turned this add-on off for now, so your texts use Regantify SMS credits.</p>
              )}
              {gateway.lastError && (
                <p className="mt-1.5 text-xs text-red-600">
                  Last failed text ({gateway.lastErrorAt ? formatDhakaDateTime(gateway.lastErrorAt) : ''}): {gateway.lastError}
                </p>
              )}
            </div>
            {isOwner && !editing && (
              <div className="flex gap-2">
                <button type="button" onClick={openForm} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-regantify-text hover:bg-neutral-50">
                  Change
                </button>
                <button
                  type="button"
                  disabled={disconnect.isPending}
                  onClick={() => disconnect.mutate()}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        !editing && (
          <div className="rounded-xl border border-dashed border-line p-4 text-sm text-regantify-text-muted">
            Not connected: your texts use Regantify SMS credits.
            {isOwner ? (
              <button type="button" onClick={openForm} className={`${primaryBtn} ml-3 h-9 px-4`}>
                Connect a gateway
              </button>
            ) : (
              ' Only the store owner can connect one.'
            )}
          </div>
        )
      )}

      {editing && isOwner && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            connect.mutate();
          }}
          className="space-y-3 rounded-xl border border-line p-4"
        >
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={providerOff(p.id)}
                onClick={() => setProvider(p.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                  provider === p.id ? 'border-regantify-cta bg-regantify-cta/5 text-regantify-text' : 'border-line text-regantify-text-muted'
                }`}
              >
                {p.name}
                {providerOff(p.id) ? ' (turned off)' : ''}
              </button>
            ))}
          </div>
          <p className="text-xs text-regantify-text-muted">{current.where}</p>

          {provider === 'ISMSPLUS' ? (
            <>
              <Field label="API token">
                <input value={apiToken} onChange={(e) => setApiToken(e.target.value)} autoComplete="off" className={productInputClass} />
              </Field>
              <Field label="SID (sender ID)">
                <input value={senderId} onChange={(e) => setSenderId(e.target.value)} maxLength={40} className={productInputClass} />
              </Field>
            </>
          ) : (
            <>
              <Field label="User name (panel email)">
                <input value={userName} onChange={(e) => setUserName(e.target.value)} autoComplete="off" className={productInputClass} />
              </Field>
              <Field label="API key">
                <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" className={productInputClass} />
              </Field>
              <Field label="Sender name (Sender ID)">
                <input value={senderId} onChange={(e) => setSenderId(e.target.value)} maxLength={40} placeholder="8809612XXXXXX or YourBrand" className={productInputClass} />
              </Field>
            </>
          )}
          <Field label="Send a test text to" hint={`${BD_PHONE_HINT} The settings are saved only if this text goes out.`}>
            <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} inputMode="tel" placeholder="017XXXXXXXX" className={productInputClass} />
          </Field>
          {gateway && <p className="text-xs text-regantify-text-muted">Type the key again to save a change.</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-regantify-text">
              Cancel
            </button>
            <button type="submit" disabled={connect.isPending || providerOff(provider)} className={`${primaryBtn} h-10 px-4 disabled:opacity-60`}>
              {connect.isPending ? 'Sending the test…' : 'Test and connect'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
