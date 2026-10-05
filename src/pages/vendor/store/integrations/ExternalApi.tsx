import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';
import { apiBaseUrl, apiKeysApi, type ApiKeyAccess, type ApiKeyInfo } from '../../../../lib/apiKeysApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { Dialog } from '../../../../components/ui/Dialog';
import { inputClass, LoadError, Notice } from './IntegrationForm';

const buttonClass =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 text-xs text-regantify-text hover:bg-black/[0.03] transition-colors disabled:opacity-50';

// What /v1/external offers (server/src/external-api/external-api.controller.ts).
const ENDPOINTS: { method: string; path: string; description: string; write?: boolean }[] = [
  { method: 'GET', path: '/store', description: 'Your store and this key' },
  { method: 'GET', path: '/orders', description: 'List orders: ?status=, ?phone=, ?created_from=, ?created_to=, ?page=, ?limit= (max 100)' },
  { method: 'GET', path: '/orders/{id or invoice number}', description: 'One order with its items. "source" says where it came from: STOREFRONT (online store), MANUAL (added by hand) or POS (sold at your counter)' },
  { method: 'POST', path: '/orders', description: 'Create an order (e.g. from a chatbot or CRM)', write: true },
  { method: 'PATCH', path: '/orders/{id or invoice number}/status', description: 'Change an order status: { status, note }', write: true },
  { method: 'GET', path: '/products', description: 'List products: ?search=, ?page=, ?limit=' },
  { method: 'GET', path: '/products/{id}', description: 'One product with its variants and stock' },
  { method: 'PATCH', path: '/products/{id}/stock', description: 'Set stock: { stock_quantity, variant_id? }', write: true },
  {
    method: 'POST',
    path: '/leads',
    description:
      'Add a lead to your LMS (Zapier, Make, Pabbly: Facebook Lead Ads, Google Forms, website forms). The same external_ref twice never makes a second lead',
    write: true,
  },
];

// POST /leads, the call a Zap or Make scenario sends (LMS-plan.md Step 14).
const LEAD_EXAMPLE = `{
  "name": "Rahim Uddin",
  "phone": "01712345678",
  "product": "Cotton Panjabi",
  "quantity": 2,
  "value": 2900,
  "message": "Size L available?",
  "source_label": "Facebook Lead Ads",
  "external_ref": "fb-leadgen-1234567890",
  "fields": { "company": "Rahim Traders" }
}`;

const ACCESS_OPTIONS: { value: ApiKeyAccess; label: string; hint: string }[] = [
  { value: 'READ_ONLY', label: 'Read only', hint: 'Can read orders and products. Best for reports and Google Sheets.' },
  { value: 'READ_WRITE', label: 'Read & write', hint: 'Can also create orders, change order status and set stock.' },
];

function copy(text: string, what: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied.`));
}

/**
 * Store > Integrations > External API — API keys for /v1/external/*
 * (server/src/external-api/).
 */
export default function ExternalApi() {
  const queryClient = useQueryClient();
  const { data: keys, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['api-keys'],
    queryFn: apiKeysApi.list,
  });
  const [creating, setCreating] = useState(false);
  // The new key, shown once.
  const [newKey, setNewKey] = useState<string | null>(null);

  const baseUrl = `${apiBaseUrl()}/v1/external`;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['api-keys'] });

  const update = useMutation({
    mutationFn: ({ id, access }: { id: string; access: ApiKeyAccess }) => apiKeysApi.update(id, { access }),
    onSuccess: () => {
      toast.success('Access updated.');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update the key.')),
  });
  const revoke = useMutation({
    mutationFn: apiKeysApi.remove,
    onSuccess: () => {
      toast.success('API key revoked. Apps using it can no longer reach your store.');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not revoke the key.')),
  });

  const curlExample = `curl ${baseUrl}/orders?status=PENDING \\\n  -H "Authorization: Bearer YOUR_API_KEY"`;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          to="/vendor/store/integrations"
          className="inline-flex items-center gap-1.5 text-xs text-regantify-cta hover:underline mb-1"
        >
          <ArrowLeft size={14} />
          Integrations
        </Link>
        <h1 className="text-2xl font-semibold text-regantify-text">External API</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Let your own systems (CRM, Google Sheets, Messenger bots, warehouse or POS software) read your orders and products,
          create orders and update stock.
        </p>
      </div>

      {isError && !keys ? (
        <LoadError
          message={apiErrorMessage(error, 'Could not load your API keys. Please try again.')}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : isLoading || !keys ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-medium text-regantify-text">API Keys</h2>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Create API Key
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-black/5 overflow-x-auto">
              {keys.length === 0 ? (
                <p className="p-8 text-center text-sm text-regantify-text-muted">No API keys yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-regantify-text-muted border-b border-black/5">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Key</th>
                      <th className="px-5 py-3 font-medium">Access</th>
                      <th className="px-5 py-3 font-medium">Last used</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {keys.map((key) => (
                      <KeyRow
                        key={key.id}
                        apiKey={key}
                        onAccess={(access) => update.mutate({ id: key.id, access })}
                        onRevoke={() => {
                          if (window.confirm(`Revoke "${key.name}"? Apps using this key stop working immediately.`)) {
                            revoke.mutate(key.id);
                          }
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-base font-medium text-regantify-text mb-2">Using the API</h2>
            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-regantify-text-muted mb-1.5">Base URL</label>
                <div className="flex gap-2">
                  <input readOnly value={baseUrl} className={`${inputClass} font-mono text-xs`} />
                  <button type="button" className={buttonClass} onClick={() => copy(baseUrl, 'Base URL')}>
                    <Copy size={13} />
                    Copy
                  </button>
                </div>
              </div>
              <p className="text-regantify-text-muted">
                Send your key in the <span className="font-mono text-xs">Authorization: Bearer &lt;key&gt;</span> header (or{' '}
                <span className="font-mono text-xs">X-API-Key</span>). Responses are JSON; lists come as{' '}
                <span className="font-mono text-xs">{'{ data, page, limit, total }'}</span>. Up to 120 requests a minute per
                key. Orders and products look exactly like in{' '}
                <Link to="/vendor/store/integrations/webhooks" className="text-regantify-cta hover:underline">
                  Webhooks
                </Link>
                .
              </p>
              <pre className="text-[11px] bg-black/[0.03] rounded-lg p-3 overflow-auto">{curlExample}</pre>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-black/5">
                    {ENDPOINTS.map((e) => (
                      <tr key={`${e.method} ${e.path}`}>
                        <td className="py-2 pr-3 font-mono font-medium text-regantify-text whitespace-nowrap">{e.method}</td>
                        <td className="py-2 pr-3 font-mono text-regantify-text whitespace-nowrap">{e.path}</td>
                        <td className="py-2 text-regantify-text-muted">
                          {e.description}
                          {e.write && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">Read &amp; write key</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1.5">
                <p className="font-medium text-regantify-text">Send leads to your LMS</p>
                <p className="text-regantify-text-muted">
                  POST this to <span className="font-mono text-xs">{baseUrl}/leads</span> with a Read &amp; write key. Only{' '}
                  <span className="font-mono text-xs">phone</span> is needed. Put your form&apos;s own id (e.g. Facebook&apos;s
                  leadgen_id) in <span className="font-mono text-xs">external_ref</span>, so a retry never makes a second lead;
                  a number that already has an open lead is added to it. <span className="font-mono text-xs">fields</span> are
                  your LMS extra fields, by key. Facebook keeps Lead Ads leads for 90 days, so connect your Zap soon after the form
                  goes live. The LMS must be on, with API leads switched on in LMS &gt; Settings.
                </p>
                <pre className="text-[11px] bg-black/[0.03] rounded-lg p-3 overflow-auto">{LEAD_EXAMPLE}</pre>
              </div>
              <a
                href={`${apiBaseUrl()}/api/docs#/external-api`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-regantify-cta hover:underline"
              >
                Full API reference (request and response fields)
                <ExternalLink size={12} />
              </a>
            </div>
          </section>
        </div>
      )}

      {creating && (
        <CreateKeyDialog
          onClose={() => setCreating(false)}
          onCreated={(key) => {
            setCreating(false);
            setNewKey(key);
            refresh();
          }}
        />
      )}

      <Dialog open={!!newKey} onOpenChange={(open) => !open && setNewKey(null)} title="Your New API Key">
        {newKey && (
          <div className="p-6 space-y-4">
            <Notice tone="warning">
              Copy it now: for your security it won&apos;t be shown again. Anyone with this key can reach your store&apos;s
              data, so keep it private (never put it in a website&apos;s code).
            </Notice>
            <div className="flex gap-2">
              <input readOnly value={newKey} className={`${inputClass} font-mono text-xs`} />
              <button type="button" className={buttonClass} onClick={() => copy(newKey, 'API key')}>
                <Copy size={13} />
                Copy
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setNewKey(null)}
                className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium"
              >
                I&apos;ve copied it
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function KeyRow({
  apiKey,
  onAccess,
  onRevoke,
}: {
  apiKey: ApiKeyInfo;
  onAccess: (access: ApiKeyAccess) => void;
  onRevoke: () => void;
}) {
  return (
    <tr>
      <td className="px-5 py-3 text-regantify-text">
        {apiKey.name}
        <p className="text-xs text-regantify-text-muted">Created {new Date(apiKey.createdAt).toLocaleDateString()}</p>
      </td>
      <td className="px-5 py-3 font-mono text-xs text-regantify-text-muted">{apiKey.prefix}…</td>
      <td className="px-5 py-3">
        <select
          value={apiKey.access}
          onChange={(e) => onAccess(e.target.value as ApiKeyAccess)}
          className="text-xs rounded-lg border border-black/10 px-2 py-1 bg-white"
        >
          {ACCESS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-5 py-3 text-xs text-regantify-text-muted">
        {apiKey.lastUsedAt ? (
          <>
            {new Date(apiKey.lastUsedAt).toLocaleString()}
            {apiKey.lastUsedIp && <p>from {apiKey.lastUsedIp}</p>}
          </>
        ) : (
          'Never'
        )}
      </td>
      <td className="px-5 py-3 text-right">
        <button type="button" className={`${buttonClass} text-red-600`} onClick={onRevoke}>
          <Trash2 size={13} />
          Revoke
        </button>
      </td>
    </tr>
  );
}

function CreateKeyDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string) => void }) {
  const [name, setName] = useState('');
  const [access, setAccess] = useState<ApiKeyAccess>('READ_ONLY');
  const create = useMutation({
    mutationFn: () => apiKeysApi.create({ name: name.trim(), access }),
    onSuccess: (result) => onCreated(result.key),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not create the API key.')),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title="Create API Key">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What will use it? e.g. Google Sheet, CRM"
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-regantify-text">Access</label>
          {ACCESS_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="access"
                checked={access === o.value}
                onChange={() => setAccess(o.value)}
                className="mt-1 accent-regantify-cta"
              />
              <span>
                <span className="text-sm text-regantify-text">{o.label}</span>
                <span className="block text-xs text-regantify-text-muted">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-regantify-text hover:bg-black/[0.03]">
            Cancel
          </button>
          <button
            type="button"
            disabled={create.isPending || !name.trim()}
            onClick={() => create.mutate()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
          >
            {create.isPending && <Loader2 size={15} className="animate-spin" />}
            Create Key
          </button>
        </div>
      </div>
    </Dialog>
  );
}
